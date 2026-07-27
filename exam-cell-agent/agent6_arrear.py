"""
agent6_arrear.py — Agent 6: Arrear & Backlog Scheduler
Rules: Rule 2 (arrears consecutive — 2/day, no gap needed),
       Rule 7 (arrear in opposite session of regular exam day),
       Rule 10 (arrears fit year-wise session pattern),
       Rule 13 (arrears fit year-wise pattern too).

Stats emitted:
  arrear_courses, arrear_slots_assigned, arrear_students, days_used
"""
from collections import defaultdict
from config import DEFAULT_YEAR_SESSION_PATTERN, ARREAR_MAX_PER_DAY, sem_to_year


def schedule_arrears(
    spaced_schedule: list[dict],
    arrear_enrolments: list[dict],
    open_slots: list[dict],
    year_session_pattern: dict[int, str] | None = None,
    all_enrolments: list[dict] | None = None,
) -> tuple[list[dict], dict]:
    """
    Schedule arrear exams.

    Strategy:
      - Pack 2 arrear exams per day (FN + AN) — no gap required between arrear days
      - Prefer days that already have a regular exam (opposite session) — Rule 7
      - Fit arrear session to year-wise pattern — Rule 13
      - Never reuse the same slot as the regular version of the same course
      - NEVER clash: for each student, arrear session must be different from ALL their regular exams

    Returns:
        (full_schedule, stats)
    """
    pattern = year_session_pattern or DEFAULT_YEAR_SESSION_PATTERN
    schedule = [dict(e) for e in spaced_schedule]

    # Regular slot lookup: course_code -> (date, session)
    regular_slot: dict[str, tuple] = {}
    for e in schedule:
        if not e.get("is_arrear", False):
            regular_slot[e["course_code"]] = (e["date"], e["session"])

    # Track all used (date, session) pairs
    used_slots: set[tuple] = {(e["date"], e["session"]) for e in schedule}

    # Track student -> set of (date, session) they already have (from regular exams)
    # This is the KEY fix: populate from the spaced_schedule using all_enrolments
    student_regular_slots: dict[str, set] = defaultdict(set)
    
    # Build a map: reg_no -> set of regular course_codes they're taking
    student_regular_courses: dict[str, set] = defaultdict(set)
    if all_enrolments:
        for enrol in all_enrolments:
            if not enrol.get("is_arrear", False):
                student_regular_courses[enrol["reg_no"]].add(enrol["course_code"])
    
    # Now map those courses to their scheduled slots
    for reg_no, course_set in student_regular_courses.items():
        for entry in schedule:
            if not entry.get("is_arrear", False) and entry["course_code"] in course_set:
                student_regular_slots[reg_no].add((entry["date"], entry["session"]))

    # Group arrear enrolments by course_code
    arrear_courses: dict[str, list] = defaultdict(list)
    for row in arrear_enrolments:
        if row.get("is_arrear", False):
            arrear_courses[row["course_code"]].append(row)

    # Sort arrear courses by student count desc (pack most-needed first)
    sorted_arrears = sorted(arrear_courses.items(), key=lambda x: -len(x[1]))

    regular_dates = sorted({e["date"] for e in schedule if not e.get("is_arrear", False)})
    opposite = {"FN": "AN", "AN": "FN"}

    assigned_count = 0
    days_used: set[str] = set()
    arrear_per_day: dict[str, int] = defaultdict(int)

    for course_code, students in sorted_arrears:
        course_name = students[0]["course_name"]
        sem = students[0]["semester"]
        year = sem_to_year(sem)
        reg_nos = [s["reg_no"] for s in students]
        branches = sorted({s["branch"] for s in students})

        # Preferred session for this year's arrear (Rule 13)
        preferred_session = pattern.get(year)
        regular_course_slot = regular_slot.get(course_code)

        assigned = False

        # --- Pass 1: prefer days with a regular exam, use opposite session (Rule 7) ---
        for reg_date in regular_dates:
            if arrear_per_day[reg_date] >= ARREAR_MAX_PER_DAY:
                continue

            # Get all sessions already used on this date by any of these students
            sessions_used_by_students = set()
            for rn in reg_nos:
                for (d, s) in student_regular_slots.get(rn, set()):
                    if d == reg_date:
                        sessions_used_by_students.add(s)

            # Try preferred session first, then any available that doesn't conflict
            sessions_to_try = []
            if preferred_session and (reg_date, preferred_session) not in used_slots:
                sessions_to_try.append(preferred_session)
            for sess in ("FN", "AN"):
                if sess not in sessions_to_try and (reg_date, sess) not in used_slots and sess not in sessions_used_by_students:
                    sessions_to_try.append(sess)

            for target_session in sessions_to_try:
                slot_key = (reg_date, target_session)
                
                # Don't use same slot as regular version of this course
                if regular_course_slot == slot_key:
                    continue
                
                # CRITICAL: Don't clash with any student's existing regular exam
                clash = False
                for rn in reg_nos:
                    if slot_key in student_regular_slots[rn]:
                        clash = True
                        break
                if clash:
                    continue
                
                # Assign this arrear
                _assign_arrear(schedule, used_slots, arrear_per_day, student_regular_slots,
                               course_code, course_name, reg_date, target_session,
                               sem, branches, reg_nos, days_used)
                assigned = True
                assigned_count += 1
                break
            if assigned:
                break

        # --- Pass 2: any open slot, pack 2/day, no gap needed ---
        if not assigned:
            for slot in open_slots:
                d, sess = slot["date"], slot["session"]
                slot_key = (d, sess)
                
                if slot_key in used_slots:
                    continue
                if arrear_per_day[d] >= ARREAR_MAX_PER_DAY:
                    continue
                if regular_course_slot == slot_key:
                    continue
                
                # Check ALL students for conflicts
                clash = False
                for rn in reg_nos:
                    if slot_key in student_regular_slots[rn]:
                        clash = True
                        break
                if clash:
                    continue
                
                _assign_arrear(schedule, used_slots, arrear_per_day, student_regular_slots,
                               course_code, course_name, d, sess,
                               sem, branches, reg_nos, days_used)
                assigned = True
                assigned_count += 1
                break

    stats = {
        "arrear_courses": len(sorted_arrears),
        "arrear_slots_assigned": assigned_count,
        "arrear_students": len({s["reg_no"] for students in arrear_courses.values() for s in students}),
        "days_used": len(days_used),
        "function_type": "Arrear Packer",
        "rules_applied": ["Rule 2 (2 arrears/day, consecutive)", "Rule 7 (opposite session)", "Rule 10/13 (year-session pattern)"],
    }
    return schedule, stats


def _assign_arrear(schedule, used_slots, arrear_per_day, student_regular_slots,
                   course_code, course_name, d, sess, sem, branches, reg_nos, days_used):
    from config import SESSION_TIMINGS
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
    })
    used_slots.add((d, sess))
    arrear_per_day[d] += 1
    days_used.add(d)
    # Track this arrears slot for these students so future arrears don't clash
    for rn in reg_nos:
        student_regular_slots[rn].add((d, sess))