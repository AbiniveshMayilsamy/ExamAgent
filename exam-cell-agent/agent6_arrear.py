"""
agent6_arrear.py — Agent 6: Arrear & Backlog Scheduler

3-Tier Arrear Placement Rules:
  Tier 1 — MATCHING arrears (same course code as a regular exam):
            → Placed in the AN slot of the SAME day as the regular FN exam.
            → Label: "Regular cum Arrear" (students writing both regular + arrear on same day, diff session)
            → If AN slot has a clash, falls through to Tier 3.

  Tier 2 — NON-MATCHING arrears (no corresponding regular exam running):
            → Packed into AN slots of existing regular exam days (FN days that have a free AN).
            → Maximise use of AN slots during the regular window before going post-regular.
            → No clash allowed.

  Tier 3 — EXCESS arrears (Tier 1 clash-fallback + Tier 2 overflow):
            → Scheduled ONLY AFTER all regular exams are complete (post max_reg_date).
            → AN preferred, FN fallback.
"""
from collections import defaultdict
from config import sem_to_year, SESSION_TIMINGS


def schedule_arrears(
    spaced_schedule: list[dict],
    arrear_enrolments: list[dict],
    open_slots: list[dict],
    year_session_pattern: dict | None = None,
    all_enrolments: list[dict] | None = None,
) -> tuple[list[dict], dict]:

    schedule = [dict(e) for e in spaced_schedule]

    # Map regular course_code -> (date, session)
    regular_course_slot: dict[str, tuple] = {}
    for e in schedule:
        if not e.get("is_arrear", False):
            regular_course_slot[e["course_code"]] = (e["date"], e["session"])

    # Track each student's occupied slots (from regular enrolments)
    student_slots: dict[str, set] = defaultdict(set)
    if all_enrolments:
        for enrol in all_enrolments:
            if not enrol.get("is_arrear", False):
                slot = regular_course_slot.get(enrol["course_code"])
                if slot:
                    student_slots[enrol["reg_no"]].add(slot)

    used_slots: set[tuple] = {(e["date"], e["session"]) for e in schedule}

    # Group arrear enrolments by course_code
    arrear_courses: dict[str, list] = defaultdict(list)
    for row in arrear_enrolments:
        if row.get("is_arrear", False):
            arrear_courses[row["course_code"]].append(row)

    # Sort: most students first (maximise clash-free packing)
    sorted_arrears = sorted(arrear_courses.items(), key=lambda x: -len(x[1]))

    regular_dates = sorted({e["date"] for e in schedule if not e.get("is_arrear", False)})
    max_reg_date = regular_dates[-1] if regular_dates else "2026-11-30"

    # Post-regular open dates (strictly after all regular exams finish)
    post_reg_dates = sorted({s["date"] for s in open_slots if s["date"] > max_reg_date})

    assigned_count = 0
    days_used: set[str] = set()
    tier_labels: dict[str, str] = {}   # course_code -> tier label for stats

    for course_code, students in sorted_arrears:
        course_name = students[0]["course_name"]
        sem = students[0]["semester"]
        reg_nos = [s["reg_no"] for s in students]
        branches = sorted({s["branch"] for s in students})
        assigned = False

        # ── TIER 1: Matching arrear → AN of the same regular exam day ──────────
        if course_code in regular_course_slot:
            reg_date, reg_sess = regular_course_slot[course_code]
            opp_sess = "AN" if reg_sess == "FN" else "FN"
            slot_key = (reg_date, opp_sess)
            if not _has_clash(reg_nos, slot_key, student_slots):
                _place_arrear(
                    schedule, used_slots, student_slots, days_used,
                    course_code, course_name, reg_date, opp_sess, sem, branches, reg_nos,
                    label="Regular cum Arrear"
                )
                tier_labels[course_code] = "Tier1-RegularCumArrear"
                assigned = True
                assigned_count += 1

        # ── TIER 2: Non-matching arrear → AN of any regular exam day (FN day with free AN) ──
        if not assigned:
            for reg_date in regular_dates:
                # Only use days where FN is a regular exam (AN is the "free" slot)
                fn_has_regular = any(
                    e["date"] == reg_date and e["session"] == "FN" and not e.get("is_arrear")
                    for e in schedule
                )
                if not fn_has_regular:
                    continue
                slot_key = (reg_date, "AN")
                if not _has_clash(reg_nos, slot_key, student_slots):
                    _place_arrear(
                        schedule, used_slots, student_slots, days_used,
                        course_code, course_name, reg_date, "AN", sem, branches, reg_nos,
                        label="Non-Matching Arrear (Regular Window AN)"
                    )
                    tier_labels[course_code] = "Tier2-RegWindowAN"
                    assigned = True
                    assigned_count += 1
                    break

        # ── TIER 3: Excess → strictly AFTER all regular exams, AN preferred ────
        if not assigned:
            for d in post_reg_dates:
                for sess in ("AN", "FN"):
                    slot_key = (d, sess)
                    if not _has_clash(reg_nos, slot_key, student_slots):
                        _place_arrear(
                            schedule, used_slots, student_slots, days_used,
                            course_code, course_name, d, sess, sem, branches, reg_nos,
                            label="Excess Arrear (Post-Regular)"
                        )
                        tier_labels[course_code] = "Tier3-PostRegular"
                        assigned = True
                        assigned_count += 1
                        break
                if assigned:
                    break

        # ── TIER 4: Guaranteed Fallback → Pick first slot in open_slots ──────────
        if not assigned and open_slots:
            fallback_slot = open_slots[-1] if open_slots else {"date": max_reg_date, "session": "AN"}
            fb_d, fb_sess = fallback_slot["date"], fallback_slot["session"]
            _place_arrear(
                schedule, used_slots, student_slots, days_used,
                course_code, course_name, fb_d, fb_sess, sem, branches, reg_nos,
                label="Fallback Arrear"
            )
            tier_labels[course_code] = "Tier4-Fallback"
            assigned_count += 1

    tier_counts = {
        "regular_cum_arrear": sum(1 for v in tier_labels.values() if v.startswith("Tier1")),
        "non_matching_reg_window": sum(1 for v in tier_labels.values() if v.startswith("Tier2")),
        "excess_post_regular": sum(1 for v in tier_labels.values() if v.startswith("Tier3")),
    }

    stats = {
        "arrear_courses": len(sorted_arrears),
        "arrear_slots_assigned": assigned_count,
        "arrear_students": len({s["reg_no"] for students in arrear_courses.values() for s in students}),
        "days_used": len(days_used),
        "tier_breakdown": tier_counts,
        "function_type": "Arrear Packer",
        "rules_applied": [
            "Tier 1: Matching Arrear → AN same day as Regular FN (Regular cum Arrear)",
            "Tier 2: Non-Matching Arrear → AN of Regular Exam Days (max utilisation)",
            "Tier 3: Excess Arrear → Post all Regular Exams only",
        ],
    }
    return schedule, stats


def _has_clash(reg_nos: list, slot_key: tuple, student_slots: dict) -> bool:
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
        "time": SESSION_TIMINGS[sess],
        "semester": sem,
        "year": (sem + 1) // 2,
        "branches": branches,
        "is_shared": len(branches) > 1,
        "is_arrear": True,
        "arrear_label": label,
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
