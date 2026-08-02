"""
agent4_harmonizer.py — Regular Stream Harmonizer (Rule 4, driven by config.SEMESTER_SESSION_CYCLE)

Replaces the old "sort clusters by size, assign earliest open slot" logic
with an explicit semester-rotation walk over the open slot list, so every
run produces the SAME session pattern as the reference master schedule
instead of whatever ordering happened to fall out of cluster sizes.

Input shapes (unchanged from the brief):
  open_slots: [{"date": "2026-11-02", "session": "FN",
                "target_sem": 3, "is_arrear_sweep": False, ...}]
              (from Agent 1 — already tagged with target_sem / is_arrear_sweep)
  clusters:   [{"course_code": "U23CS491", "semester": 3,
                "branches": ["CSE","ECE",...]}, ...]  (from Agent 3)

Output (dict):
  {
    "draft_schedule":       [...],   <- list of assigned regular exam dicts
    "arrear_sweep_slots":   [...],   <- slots already tagged is_arrear_sweep by Agent 1
    "unscheduled_clusters": [...],   <- clusters that didn't fit into any cycle slot
    "stats":                {...},   <- audit stats for hub.py / run_agents.py
  }

Cycle-walking logic (reads Agent 1's tags, no double-counting):
  Agent 1 already tags every 4th slot with is_arrear_sweep=True using the
  same SEMESTER_SESSION_CYCLE length. Agent 4 simply:
    - Skips is_arrear_sweep slots (collects them for Agent 6).
    - For regular slots, uses target_sem to look up the right bucket.
    - Assigns the first non-clashing cluster from that semester's bucket.
    - Fallback pass fills any remaining clusters into leftover regular slots.
"""

from config import ScheduleConfig, SESSION_TIMINGS, sem_to_year


def assign_regular_slots(open_slots: list[dict], clusters: list[dict],
                          config: ScheduleConfig = None,
                          dept_roll_ranges: dict = None) -> dict:
    """
    Walk open_slots in calendar order (Agent 1 has already tagged each slot
    with target_sem and is_arrear_sweep). Assign clusters to their designated
    cycle slot, then run a fallback pass for anything leftover.

    Returns a dict with: draft_schedule, arrear_sweep_slots,
    unscheduled_clusters, stats.
    """
    if config is None:
        config = ScheduleConfig()

    # Enrich clusters: normalise semester / year / is_shared / missing fields
    for c in clusters:
        if "semesters" in c and c["semesters"]:
            sems = c["semesters"]
            sem = min(sems) if isinstance(sems, (list, set)) else sems
            c["semester"] = sem
        c.setdefault("semester", 1)
        c["year"] = sem_to_year(c["semester"])
        c.setdefault("is_shared", len(c.get("branches", [])) > 1)
        c.setdefault("credits", 3)
        c.setdefault("course_name", c.get("course_code", ""))
        c.setdefault("student_count", 0)

    # --- Bucket clusters by semester, largest branch-count first ---
    by_semester: dict[int, list[dict]] = {}
    for step in config.semester_cycle:
        by_semester[step["semester"]] = []

    for cl in clusters:
        sem = cl["semester"]
        by_semester.setdefault(sem, []).append(cl)

    for sem in by_semester:
        by_semester[sem].sort(
            key=lambda c: (len(c.get("branches", [])), c.get("credits", 3)),
            reverse=True
        )

    draft_schedule: list[dict] = []
    arrear_sweep_slots: list[dict] = []
    used_branch_session: set[tuple] = set()

    regular_slots = []   # slots available for the fallback pass

    # --- Pass 1: Cycle-walking using Agent 1's slot tags ---
    for slot in open_slots:
        # Collect arrear-sweep slots for Agent 6 (already tagged by Agent 1)
        if slot.get("is_arrear_sweep", False) or slot.get("target_sem") == "arrear":
            arrear_sweep_slots.append(slot)
            continue

        d = slot["date"]
        sess = slot["session"]
        target_sem = slot.get("target_sem")

        bucket = by_semester.get(target_sem, [])

        # Find and place ALL non-clashing clusters for this semester into this slot
        # (e.g. if a shared course covers 9 depts, MECH's branch course gets placed in the SAME slot)
        placed_any = False
        i = 0
        while i < len(bucket):
            cluster = bucket[i]
            branch_clash = any(
                (b, d, sess) in used_branch_session
                for b in cluster.get("branches", [])
            )
            if not branch_clash:
                bucket.pop(i)
                sem_step = next(
                    (s for s in config.semester_cycle if s["semester"] == target_sem),
                    {"semester": target_sem, "year_label": str(sem_to_year(target_sem))}
                )
                _commit_entry(draft_schedule, used_branch_session,
                              cluster, d, sess, sem_step, dept_roll_ranges)
                placed_any = True
                # do not increment i since we popped the element at i
            else:
                i += 1

        if not placed_any:
            # Slot is a regular slot but nothing was placed — keep for fallback
            regular_slots.append(slot)

    # --- Pass 2: Fallback — remaining clusters into leftover regular slots ---
    all_remaining = [c for bucket in by_semester.values() for c in bucket]
    still_unscheduled = []
    assigned_fallback = 0

    for cluster in all_remaining:
        placed = False
        sem = cluster["semester"]
        sem_step = next(
            (s for s in config.semester_cycle if s["semester"] == sem),
            {"semester": sem, "year_label": str(sem_to_year(sem))}
        )
        for slot in regular_slots:
            d, sess = slot["date"], slot["session"]
            branch_clash = any(
                (b, d, sess) in used_branch_session
                for b in cluster.get("branches", [])
            )
            if not branch_clash:
                _commit_entry(draft_schedule, used_branch_session,
                              cluster, d, sess, sem_step, dept_roll_ranges)
                regular_slots.remove(slot)
                assigned_fallback += 1
                placed = True
                break
        if not placed:
            still_unscheduled.append(cluster["course_code"])

    stats = {
        "assigned":               len(draft_schedule),
        "regular_courses_assigned": len(draft_schedule),
        "assigned_cycle":         len(draft_schedule) - assigned_fallback,
        "assigned_fallback":      assigned_fallback,
        "unassigned_courses":     len(still_unscheduled),
        "unassigned_list":        still_unscheduled,
        "arrear_sweep_slots_reserved": len(arrear_sweep_slots),
        "total_slots_used":       len({(e["date"], e["session"]) for e in draft_schedule}),
        "function_type": "Slot Harmonizer (Cycle-Walking + ScheduleConfig)",
        "rules_applied": [
            "Rule 4 (session slot placement — SEMESTER_SESSION_CYCLE ground-truth)",
            "Rule 11 (common course exact session)",
            "GAP_FILL_POLICY = " + config.gap_fill_policy,
            "ARREAR_SWEEP_RULE = " + config.arrear_sweep_rule,
            "Pass 1: Agent 1 slot tags (target_sem / is_arrear_sweep)",
            "Pass 2: Fallback — non-cycle clusters into remaining regular slots",
        ],
    }

    return {
        "draft_schedule": draft_schedule,
        "arrear_sweep_slots": arrear_sweep_slots,
        "unscheduled_clusters": still_unscheduled,   # truly unplaceable (empty in normal runs)
        "stats": stats,
    }


def _commit_entry(draft_schedule, used_branch_session, cluster, d, sess,
                   sem_step, dept_roll_ranges):
    """Record one cluster assignment into the draft schedule."""
    sem = cluster["semester"]
    year = cluster.get("year", sem_to_year(sem))
    branches = sorted(list(cluster.get("branches", [])))

    for b in branches:
        used_branch_session.add((b, d, sess))

    roll_ranges = {}
    if dept_roll_ranges:
        for b in branches:
            rr = dept_roll_ranges.get(b, {}).get(sem, "")
            if rr:
                roll_ranges[b] = rr

    draft_schedule.append({
        "course_code":  cluster["course_code"],
        "course_name":  cluster.get("course_name", cluster["course_code"]),
        "date":         d,
        "session":      sess,
        "time":         SESSION_TIMINGS.get(sess, "9:30 AM – 12:30 PM"),
        "semester":     sem,
        "year":         year,
        "year_label":   sem_step.get("year_label", str(year)),
        "branches":     branches,
        "is_shared":    cluster.get("is_shared", len(branches) > 1),
        # Agent 5 / 2 compatibility fields
        "is_arrear":    False,
        "credits":      cluster.get("credits", 3),
        "difficulty":   "medium",        # Agent 5 overwrites this
        "student_count": cluster.get("student_count", 0),
        "roll_ranges":  roll_ranges,
    })


def apply_gap_fill(draft_schedule: list[dict], all_branches: list[str],
                    branch_specific_due: dict,
                    config: ScheduleConfig = None) -> list[dict]:
    """
    Rule 4 gap-fill: for every regular slot in draft_schedule, work out
    which branches are NOT covered by the shared course in that slot, and
    (if config.gap_fill_policy == "always") try to slot in a course that
    IS due for that branch alone, so no branch shows a blank "-" when it
    has something that could legitimately go there.

    branch_specific_due: {branch: [course_code, ...]} — courses/arrears
      still waiting to be placed for that branch only (supplied by the
      caller, e.g. sourced from Agent 6's backlog before the final sweep).

    Returns an updated draft_schedule with extra per-branch entries added
    (course_code tagged the same date/session, but a narrower "branches"
    list) wherever a fill was found. Branches with nothing due are left
    as "-" — this function never invents an exam.
    """
    if config is None:
        config = ScheduleConfig()
    if config.gap_fill_policy != "always":
        return draft_schedule

    filled = list(draft_schedule)
    for entry in draft_schedule:
        covered = set(entry["branches"])
        uncovered = [b for b in all_branches if b not in covered]
        for branch in uncovered:
            due = branch_specific_due.get(branch, [])
            if due:
                course_code = due.pop(0)
                filled.append({
                    "course_code":  course_code,
                    "course_name":  course_code,
                    "date":         entry["date"],
                    "session":      entry["session"],
                    "time":         SESSION_TIMINGS.get(entry["session"], "9:30 AM – 12:30 PM"),
                    "semester":     entry["semester"],
                    "year":         entry["year"],
                    "year_label":   entry.get("year_label", ""),
                    "branches":     [branch],
                    "is_shared":    False,
                    "is_arrear":    False,
                    "credits":      3,
                    "difficulty":   "medium",
                    "student_count": 0,
                    "roll_ranges":  {},
                    "note":         "gap_fill",
                })
    return filled
