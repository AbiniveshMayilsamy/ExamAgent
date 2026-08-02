"""
agent6_arrear.py — Arrear & Backlog Scheduler (Rule 7), extended for the
dedicated "arrear sweep" slots reserved by agent4_harmonizer.py.

Two placement paths now exist, tried in this order per arrear course:

  1. Piggyback (original Rule 7 behaviour): same day as a regular exam
     for that course's branch, other session, if free and clash-free.
  2. Sweep slot: one of the arrear_sweep_slots handed over by Agent 4 —
     used for "uncommon" arrears that don't share a branch/day with any
     regular exam this cycle. This is what produces rows like
     "03.11.26 AN — uncommon arrear courses across all sems" in the
     reference schedule.
  3. Fallback: any remaining open slot with no student clash (unchanged
     5-day-deadline fallback from the original brief).
"""
from collections import defaultdict
from config import sem_to_year, SESSION_TIMINGS


def schedule_arrears(
    spaced_schedule: list[dict],
    arrear_enrolments: list[dict],
    arrear_sweep_slots: list[dict],
    open_slots: list[dict],
    all_enrolments: list[dict] | None = None,
) -> tuple[list[dict], dict]:
    """
    spaced_schedule:    draft regular schedule (post Agent 5)
    arrear_enrolments:  [{reg_no, course_code, branch, semester, ...}, ...]
    arrear_sweep_slots: [{date, session}, ...]  reserved by Agent 4 for the sweep
    open_slots:         full slot list from Agent 1 (for fallback path)
    all_enrolments:     combined regular+arrear list (for per-student clash tracking)

    Returns (complete_schedule, stats).
    """
    schedule = [dict(e) for e in spaced_schedule]

    # Map regular course_code → (date, session)
    regular_course_slot: dict[str, tuple] = {}
    for e in schedule:
        if not e.get("is_arrear", False):
            regular_course_slot[e["course_code"]] = (e["date"], e["session"])

    # Track each student's occupied slots (exact per-reg_no, not branch-level)
    student_slots: dict[str, set] = defaultdict(set)
    if all_enrolments:
        for enrol in all_enrolments:
            if not enrol.get("is_arrear", False):
                slot = regular_course_slot.get(enrol["course_code"])
                if slot:
                    student_slots[enrol["reg_no"]].add(slot)

    used_slots: set[tuple] = {(e["date"], e["session"]) for e in schedule}

    # Group arrear enrolments by course_code
    by_course: dict[str, list[dict]] = defaultdict(list)
    for row in arrear_enrolments:
        if row.get("is_arrear", False):
            by_course[row["course_code"]].append(row)

    # Sort: most students first (maximise clash-free packing)
    sorted_arrears = sorted(by_course.items(), key=lambda x: -len(x[1]))

    sweep_slots = list(arrear_sweep_slots)   # mutable queue
    regular_dates = sorted({e["date"] for e in schedule if not e.get("is_arrear", False)})
    max_reg_date = regular_dates[-1] if regular_dates else "2026-11-30"

    fallback_slots = [
        s for s in open_slots
        if (s["date"], s["session"]) not in used_slots
    ]
    post_reg_slots = [s for s in fallback_slots if s["date"] > max_reg_date]

    assigned_count = 0
    days_used: set[str] = set()
    tier_labels: dict[str, str] = {}

    for course_code, students in sorted_arrears:
        course_name = students[0].get("course_name", course_code)
        sem = students[0].get("semester", 1)
        reg_nos = [s["reg_no"] for s in students]
        branches = sorted({s["branch"] for s in students})
        placed = False

        # ── Path 1 (piggyback): same day as a regular exam for this branch,
        #    other session, if free and clash-free  (Rule 7) ─────────────────
        for reg in schedule:
            if placed:
                break
            if not set(reg.get("branches", [])) & set(branches):
                continue
            other_sess = "AN" if reg["session"] == "FN" else "FN"
            slot_key = (reg["date"], other_sess)
            if slot_key in used_slots:
                continue
            if _has_exact_clash(reg_nos, slot_key, student_slots):
                continue
            _place_arrear(schedule, used_slots, student_slots, days_used,
                          course_code, course_name, reg["date"], other_sess,
                          sem, branches, reg_nos, label="arrear_piggyback")
            tier_labels[course_code] = "Tier1-Piggyback"
            placed = True
            assigned_count += 1

        # ── Path 2 (sweep slot): dedicated arrear-sweep session from Agent 4 ─
        if not placed and arrear_sweep_slots:
            for slot in arrear_sweep_slots:
                slot_key = (slot["date"], slot["session"])
                if _has_exact_clash(reg_nos, slot_key, student_slots):
                    continue
                _place_arrear(schedule, used_slots, student_slots, days_used,
                              course_code, course_name, slot["date"], slot["session"],
                              sem, branches, reg_nos, label="arrear_sweep")
                tier_labels[course_code] = "Tier2-Sweep"
                placed = True
                assigned_count += 1
                break

        # ── Path 3 (fallback): any open slot within regular window ────────────
        if not placed:
            for slot in open_slots:
                slot_key = (slot["date"], slot["session"])
                if _has_exact_clash(reg_nos, slot_key, student_slots):
                    continue
                _place_arrear(schedule, used_slots, student_slots, days_used,
                              course_code, course_name, slot["date"], slot["session"],
                              sem, branches, reg_nos, label="arrear_fallback")
                tier_labels[course_code] = "Tier3-Fallback"
                placed = True
                assigned_count += 1
                break

        # ── Path 4 (post-regular): any slot after all regular exams end ───────
        if not placed:
            for slot in post_reg_slots:
                slot_key = (slot["date"], slot["session"])
                if slot_key in used_slots:
                    continue
                if _has_exact_clash(reg_nos, slot_key, student_slots):
                    continue
                _place_arrear(schedule, used_slots, student_slots, days_used,
                              course_code, course_name, slot["date"], slot["session"],
                              sem, branches, reg_nos, label="arrear_post_regular")
                tier_labels[course_code] = "Tier4-PostRegular"
                placed = True
                assigned_count += 1
                break

        # ── Unplaced: flag for manual review — hub's retry loop surfaces this ─
        if not placed:
            schedule.append({
                "course_code": course_code,
                "course_name": course_name,
                "date": None,
                "session": None,
                "time": None,
                "semester": sem,
                "year": sem_to_year(sem),
                "branches": branches,
                "is_shared": len(branches) > 1,
                "is_arrear": True,
                "arrear_label": "UNPLACED_NEEDS_MANUAL_REVIEW",
                "difficulty": "medium",
                "credits": 3,
                "roll_ranges": {},
                "student_reg_nos": list(set(reg_nos)),
            })
            tier_labels[course_code] = "Unplaced"

    tier_counts = {
        "piggyback":     sum(1 for v in tier_labels.values() if v.startswith("Tier1")),
        "sweep":         sum(1 for v in tier_labels.values() if v.startswith("Tier2")),
        "fallback":      sum(1 for v in tier_labels.values() if v.startswith("Tier3")),
        "post_regular":  sum(1 for v in tier_labels.values() if v.startswith("Tier4")),
        "unplaced":      sum(1 for v in tier_labels.values() if v == "Unplaced"),
    }

    stats = {
        "arrear_courses": len(sorted_arrears),
        "arrear_slots_assigned": assigned_count,
        "arrear_students": len({s["reg_no"] for students in by_course.values() for s in students}),
        "days_used": len(days_used),
        "sweep_slots_available": len(arrear_sweep_slots),
        "sweep_slots_used": tier_counts["sweep"],
        "tier_breakdown": tier_counts,
        "function_type": "Arrear Packer (Piggyback + Sweep + Fallback)",
        "rules_applied": [
            "Path 1 (piggyback): same day as regular exam, other session (Rule 7)",
            "Path 2 (sweep slot): dedicated arrear-sweep session from Agent 4",
            "Path 3 (fallback): any open clash-free slot in regular window",
            "Path 4 (post-regular): slots after all regular exams finish",
        ],
    }
    return schedule, stats


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _has_exact_clash(reg_nos: list, slot_key: tuple, student_slots: dict) -> bool:
    """True if ANY student in reg_nos already has an exam at slot_key.
    Uses exact per-reg_no tracking — Agent 2 still re-validates everything."""
    for rn in reg_nos:
        if slot_key in student_slots.get(rn, set()):
            return True
    return False


def _place_arrear(schedule, used_slots, student_slots, days_used,
                  course_code, course_name, d, sess, sem, branches, reg_nos,
                  label: str = ""):
    schedule.append({
        "course_code": course_code,
        "course_name": course_name,
        "date": d,
        "session": sess,
        "time": SESSION_TIMINGS.get(sess, ""),
        "semester": sem,
        "year": sem_to_year(sem),
        "branches": branches,
        "is_shared": len(branches) > 1,
        "is_arrear": True,
        "arrear_label": label,
        "note": label,
        "difficulty": "medium",
        "credits": 3,
        "roll_ranges": {},
        "student_reg_nos": list(set(reg_nos)),
    })
    slot_key = (d, sess)
    used_slots.add(slot_key)
    days_used.add(d)
    for rn in reg_nos:
        student_slots[rn].add(slot_key)
