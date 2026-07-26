"""
agent2_conflict.py — Agent 2: Student Conflict Checker (Final Gatekeeper)
Rule: Rule 2 (1 student, max 1 exam per session).

Stats emitted:
  students_checked, conflicts_found, clean_students
"""
from collections import defaultdict


def check_conflicts(complete_schedule: list[dict], enrolments: list[dict]) -> dict:
    """
    Final gatekeeper — never skip.

    1. Build course_code -> (date, session): regular slots take priority over arrear
    2. For each student, collect all their exams and deduplicate same course_code
    3. Flag any two DIFFERENT courses landing on the same (date, session)

    Returns:
        {status, conflicts, stats}
    """
    course_slot: dict[str, tuple] = {}
    for entry in complete_schedule:
        if not entry.get("is_arrear", False):
            course_slot[entry["course_code"]] = (entry["date"], entry["session"])
    for entry in complete_schedule:
        if entry.get("is_arrear", False) and entry["course_code"] not in course_slot:
            course_slot[entry["course_code"]] = (entry["date"], entry["session"])

    student_exams: dict[str, list] = defaultdict(list)
    for row in enrolments:
        code = row["course_code"]
        if code in course_slot:
            d, s = course_slot[code]
            student_exams[row["reg_no"]].append((code, d, s))

    conflicts = []
    for reg_no, exams in student_exams.items():
        seen_codes: dict[str, tuple] = {}
        deduped = []
        for code, d, s in exams:
            if code not in seen_codes:
                seen_codes[code] = (d, s)
                deduped.append((code, d, s))

        slot_map: dict[tuple, list] = defaultdict(list)
        for code, d, s in deduped:
            slot_map[(d, s)].append(code)

        for (d, s), codes in slot_map.items():
            if len(codes) > 1:
                for i in range(len(codes)):
                    for j in range(i + 1, len(codes)):
                        conflicts.append({
                            "reg_no": reg_no,
                            "course_a": codes[i],
                            "course_b": codes[j],
                            "date": d,
                            "session": s,
                        })

    total_students = len(student_exams)
    stats = {
        "students_checked": total_students,
        "conflicts_found": len(conflicts),
        "clean_students": total_students - len({c["reg_no"] for c in conflicts}),
        "function_type": "Conflict Gatekeeper",
        "rules_applied": ["Rule 2 (1 exam per student per session)"],
    }

    if conflicts:
        return {"status": "FAIL", "conflicts": conflicts, "stats": stats}
    return {"status": "PASS", "conflicts": [], "stats": stats}
