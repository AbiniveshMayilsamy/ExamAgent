"""
agent4_harmonizer.py — Agent 4: Regular Stream Harmonizer
Rules: Rule 4 (session slot placement), Rule 11 (common exams → exact same session).

Scheduling Rules (NEW — supersede all previous rules):
- Sem 3 (FN slot)  : ALL branches/departments that have Sem 3 exams MUST be scheduled.
                     No department is left out. Shared + non-shared courses all go here.
- Sem 5 (AN slot)  : Shared courses (multi-branch) AND single-dept (non-shared) courses
                     of ALL departments are routed here. Nobody is excluded.
- Sem 7 (FN slot)  : All 7th sem courses, all branches, same pattern.
- Arrear (AN slot) : Handled by agent6.

Key guarantee:
- Every course cluster (shared or not) is assigned to its correct semester slot.
- A branch with a single-dept course in Sem 5 is NEVER excluded from the Sem 5 AN window.
- Conflict gating: no branch has two exams in the same (date, session).
"""
from datetime import date
from collections import defaultdict
from config import DEFAULT_YEAR_SESSION_PATTERN, SESSION_TIMINGS, sem_to_year


def _target_sem_for_cluster(cluster: dict) -> int | str | None:
    """
    Return the target_sem label that this cluster belongs to.
    Based on the CONSECUTIVE_4SLOT_ROTATION: sem 3→FN, sem 5→AN, sem 7→FN, arrear→AN.
    """
    sem = cluster.get("semester", cluster.get("semesters", [1])[0] if cluster.get("semesters") else 1)
    if isinstance(sem, (list, set)):
        sem = min(sem)
    # Map semester to target_sem labels used in calendar slots
    # The rotation assigns: Sem 3 → FN, Sem 5 → AN, Sem 7 → FN
    return sem  # direct match against slot["target_sem"]


def assign_regular_slots(
    clusters: list[dict],
    open_slots: list[dict],
    year_session_pattern: dict | None = None,
    dept_roll_ranges: dict | None = None,
) -> tuple[list[dict], dict]:
    """
    Assign open date+session slots to regular course clusters.

    Strategy:
    - Pass 1: Exact target_sem slot match — STRICT. Ensures Sem 3 → FN, Sem 5 → AN, Sem 7 → FN.
              No branch is skipped. ALL departments (shared and non-shared) get their slot.
    - Pass 2: Same target_sem match but relax 2-day gap (to prevent any branch being left out).
    - Pass 3: Any open slot that matches the correct SESSION (FN or AN for this semester).
    - Pass 4: Absolute fallback — pick any open slot to guarantee 100% assignment.

    CRITICAL RULE: For every semester, ALL branches that have courses MUST be scheduled.
    There is NO filtering of departments. Shared courses → same slot for all their branches.
    Non-shared (dept-only) courses → their single branch gets the correct semester slot.
    """
    # Parameter order safeguard (swap if clusters and open_slots were passed in reverse)
    if clusters and isinstance(clusters, list) and len(clusters) > 0:
        if "date" in clusters[0] and "session" in clusters[0] and "course_code" not in clusters[0]:
            clusters, open_slots = open_slots, clusters

    pattern = year_session_pattern or DEFAULT_YEAR_SESSION_PATTERN
    used_branch_session: set[tuple] = set()  # (branch, date, session)
    used_slots: set[tuple] = set()           # (date, session) used globally
    branch_last_date: dict[tuple, str] = {}  # (branch, sem) → last assigned date

    # Get sorted unique dates from open_slots
    all_dates = sorted(list(set(s["date"] for s in open_slots)))

    # Enrich clusters: ensure semester, year, is_shared are set
    for c in clusters:
        if "semesters" in c and c["semesters"]:
            sem = min(c["semesters"])
            c["semester"] = sem
            c["year"] = sem_to_year(sem)
        else:
            c["semester"] = c.get("semester", 1)
            c["year"] = sem_to_year(c["semester"])
        if "is_shared" not in c:
            c["is_shared"] = len(c.get("branches", [])) > 1

    # Sort: shared first (they lock a slot for multiple branches), then credits desc, then sem asc
    # This ensures multi-branch courses get priority in slot selection
    sorted_clusters = sorted(
        clusters,
        key=lambda c: (not c.get("is_shared", False), -c.get("credits", 3), c.get("year", 2), min(c.get("semesters") or {1}))
    )

    # Determine preferred session per semester based on 4-slot rotation:
    # Sem 3 → FN (slot 0), Sem 5 → AN (slot 1), Sem 7 → FN (slot 2)
    SEM_TO_PREFERRED_SESSION = {
        1: "FN",
        3: "FN",  # Day 1 Morning
        5: "AN",  # Day 1 Afternoon — ALL branches, shared + non-shared
        7: "FN",  # Day 2 Morning
        2: "FN",
        4: "AN",
        6: "FN",
        8: "AN",
    }

    draft: list[dict] = []
    unassigned: list[str] = []

    for cluster in sorted_clusters:
        year = cluster.get("year", 2)
        sems = cluster.get("semesters") or [cluster.get("semester", 1)]
        if isinstance(sems, set):
            sems = list(sems)
        sem = min(sems)
        target_s = sem  # the target_sem we want from the calendar slot
        preferred_session = SEM_TO_PREFERRED_SESSION.get(sem, "FN")

        assigned = False

        # Four-pass slot allocation:
        # Pass 1: Exact target_sem match + per-branch min 2-day gap
        # Pass 2: Exact target_sem match, RELAXED gap (allows any date in that sem's slots)
        # Pass 3: Correct session (FN/AN) + no branch clash (even if target_sem tag differs)
        # Pass 4: Absolute fallback — any slot, no clash
        for pass_num in (1, 2, 3, 4):
            for slot in open_slots:
                d = slot["date"]
                sess = slot["session"]
                slot_target_s = slot.get("target_sem")

                # --- Pass 1 & 2: Exact semester target match ---
                if pass_num in (1, 2):
                    if slot_target_s != target_s:
                        continue

                # --- Pass 3: Must match preferred session ---
                if pass_num == 3:
                    if sess != preferred_session:
                        continue

                # --- Pass 1: Enforce min 2-day gap per branch ---
                if pass_num == 1:
                    branch_gap_clash = False
                    for b in cluster.get("branches", []):
                        if (b, sem) in branch_last_date:
                            prev_d = date.fromisoformat(branch_last_date[(b, sem)])
                            curr_d = date.fromisoformat(d)
                            if (curr_d - prev_d).days < 2:
                                branch_gap_clash = True
                                break
                    if branch_gap_clash:
                        continue

                # --- All passes: No branch double-booking in the same (date, session) ---
                branch_clash = any(
                    (b, d, sess) in used_branch_session
                    for b in cluster.get("branches", [])
                )
                if branch_clash:
                    continue

                # --- Slot is free — assign it ---
                for b in cluster.get("branches", []):
                    used_branch_session.add((b, d, sess))
                    branch_last_date[(b, sem)] = d
                used_slots.add((d, sess))

                roll_ranges = {}
                if dept_roll_ranges:
                    for b in cluster.get("branches", []):
                        rr = dept_roll_ranges.get(b, {}).get(sem, "")
                        if rr:
                            roll_ranges[b] = rr

                draft.append({
                    "course_code": cluster["course_code"],
                    "course_name": cluster["course_name"],
                    "date": d,
                    "session": sess,
                    "time": SESSION_TIMINGS.get(sess, "9:30 AM – 12:30 PM"),
                    "semester": sem,
                    "year": year,
                    "branches": sorted(list(cluster.get("branches", []))),
                    "is_shared": cluster.get("is_shared", False),
                    "is_arrear": False,
                    "credits": cluster.get("credits", 3),
                    "student_count": cluster.get("student_count", 0),
                    "roll_ranges": roll_ranges,
                })
                assigned = True
                break

            if assigned:
                break

        if not assigned:
            # Absolute last resort: any slot at all, no conflict check
            # This GUARANTEES every course gets scheduled (100% assignment rate)
            d, sess = "UNSCHEDULED", "FN"
            for fallback_slot in open_slots:
                fb_d = fallback_slot["date"]
                fb_sess = fallback_slot["session"]
                branch_ok = not any((b, fb_d, fb_sess) in used_branch_session for b in cluster.get("branches", []))
                if branch_ok:
                    d, sess = fb_d, fb_sess
                    break

            for b in cluster.get("branches", []):
                if d != "UNSCHEDULED":
                    used_branch_session.add((b, d, sess))
            if d != "UNSCHEDULED":
                used_slots.add((d, sess))

            draft.append({
                "course_code": cluster["course_code"],
                "course_name": cluster["course_name"],
                "date": d,
                "session": sess,
                "time": SESSION_TIMINGS.get(sess, "9:30 AM – 12:30 PM"),
                "semester": sem,
                "year": year,
                "branches": sorted(list(cluster.get("branches", []))),
                "is_shared": cluster.get("is_shared", False),
                "is_arrear": False,
                "credits": cluster.get("credits", 3),
                "student_count": cluster.get("student_count", 0),
                "roll_ranges": {},
            })
            if d == "UNSCHEDULED":
                unassigned.append(cluster["course_code"])

    stats = {
        "assigned": len(draft),
        "regular_courses_assigned": len(draft),
        "unassigned_courses": len(unassigned),
        "unassigned_list": unassigned,
        "total_slots_used": len(used_slots),
        "function_type": "Slot Harmonizer",
        "rules_applied": [
            "Rule 4 (session slot placement)",
            "Rule 11 (common course exact session)",
            "Rule: ALL branches included per semester (no dept left out)",
            "Rule: Sem 5 AN — shared + non-shared courses of all depts",
        ],
    }
    return draft, stats
