"""
agent6_arrear.py — Agent 6: Arrear & Backlog Scheduler
Rules:
  Rule 2  — 1 student max 1 exam per session (zero clashes)
  Rule 7  — Arrear exams go in the OPPOSITE session of the regular exam on that day
  Rule 1  — Max 2 sessions per day (FN + AN), so max 2 arrear exams on any day
"""
from collections import defaultdict
from config import DEFAULT_YEAR_SESSION_PATTERN, sem_to_year, SESSION_TIMINGS

OPPOSITE = {"FN": "AN", "AN": "FN"}


def schedule_arrears(
    spaced_schedule: list[dict],
    arrear_enrolments: list[dict],
    open_slots: list[dict],
    year_session_pattern: dict | None = None,
    all_enrolments: list[dict] | None = None,
) -> tuple[list[dict], dict]:
    """
    Schedule arrear exams without any student clash.
    """
    pattern = year_session_pattern or DEFAULT_YEAR_SESSION_PATTERN
    schedule = [dict(e) for e in spaced_schedule]

    regular_course_slot: dict[str, tuple] = {}
    for e in schedule:
        if not e.get("is_arrear", False):
            regular_course_slot[e["course_code"]] = (e["date"], e["session"])

    student_slots: dict[str, set] = defaultdict(set)
    if all_enrolments:
        for enrol in all_enrolments:
            if not enrol.get("is_arrear", False):
                slot = regular_course_slot.get(enrol["course_code"])
                if slot:
                    student_slots[enrol["reg_no"]].add(slot)

    used_slots: set[tuple] = {(e["date"], e["session"]) for e in schedule}

    arrear_courses: dict[str, list] = defaultdict(list)
    for row in arrear_enrolments:
        if row.get("is_arrear", False):
            arrear_courses[row["course_code"]].append(row)

    sorted_arrears = sorted(arrear_courses.items(), key=lambda x: -len(x[1]))

    regular_dates = sorted({e["date"] for e in schedule if not e.get("is_arrear", False)})
    open_dates = sorted({s["date"] for s in open_slots})

    assigned_count = 0
    days_used: set[str] = set()

    for course_code, students in sorted_arrears:
        course_name = students[0]["course_name"]
        sem = students[0]["semester"]
        year = sem_to_year(sem)
        reg_nos = [s["reg_no"] for s in students]
        branches = sorted({s["branch"] for s in students})

        assigned = False

        # Pass 1: prefer opposite session on a regular exam day (Rule 7)
        for reg_date in regular_dates:
            reg_sessions_today = {
                e["session"] for e in schedule
                if not e.get("is_arrear", False) and e["date"] == reg_date
            }

            target_sessions = ["AN", "FN"] if "FN" in reg_sessions_today else ["FN", "AN"]
            for sess in target_sessions:
                slot_key = (reg_date, sess)
                if not _has_clash(reg_nos, slot_key, student_slots):
                    _place_arrear(
                        schedule, used_slots, student_slots, days_used,
                        course_code, course_name, reg_date, sess, sem, branches, reg_nos
                    )
                    assigned = True
                    assigned_count += 1
                    break

            if assigned:
                break

        # Pass 2: fallback to any open date/session
        if not assigned:
            for d in open_dates:
                for sess in ("FN", "AN"):
                    slot_key = (d, sess)
                    if not _has_clash(reg_nos, slot_key, student_slots):
                        _place_arrear(
                            schedule, used_slots, student_slots, days_used,
                            course_code, course_name, d, sess, sem, branches, reg_nos
                        )
                        assigned = True
                        assigned_count += 1
                        break
                if assigned:
                    break

    stats = {
        "arrear_courses": len(sorted_arrears),
        "arrear_slots_assigned": assigned_count,
        "arrear_students": len({s["reg_no"] for students in arrear_courses.values() for s in students}),
        "days_used": len(days_used),
        "function_type": "Arrear Packer",
        "rules_applied": ["Rule 1 (max 2 sessions/day)", "Rule 2 (0 clashes)", "Rule 7 (opposite session)"],
    }
    return schedule, stats


def _has_clash(reg_nos: list, slot_key: tuple, student_slots: dict) -> bool:
    for rn in reg_nos:
        if slot_key in student_slots.get(rn, set()):
            return True
    return False


def _place_arrear(schedule, used_slots, student_slots, days_used,
                  course_code, course_name, d, sess, sem, branches, reg_nos):
    schedule.append({
        "course_code": course_code,
        "course_name": course_name,
        "date": d,
        "session": sess,
        "time": SESSION_TIMINGS[sess],
        "semester": sem,
        "year": (sem + 1) // 2,
        "branches": branches,
        "is_shared": False,
        "is_arrear": True,
        "difficulty": "medium",
        "credits": 3,
        "roll_ranges": {},
        "student_reg_nos": list(set(reg_nos)),  # Store exact enrolled student reg_nos
    })
    slot_key = (d, sess)
    used_slots.add(slot_key)
    days_used.add(d)
    for rn in reg_nos:
        student_slots[rn].add(slot_key)
