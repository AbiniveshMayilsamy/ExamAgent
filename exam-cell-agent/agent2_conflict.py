"""
agent2_conflict.py — Agent 2: Student Conflict Checker (Final Gatekeeper)
Rule: Rule 2 (1 student, max 1 exam per session).

Stats emitted:
  students_checked, conflicts_found, clean_students
"""
from collections import defaultdict


def check_conflicts(complete_schedule: list[dict], enrolments: list[dict]) -> dict:
    """
    Final gatekeeper — accurately checks each student's regular and arrear exam slots.

    1. Map regular course codes -> (date, session)
    2. Map student reg_no -> list of (course_code, date, session)
    3. Arrear courses map directly via student_reg_nos on scheduled item
    4. Flag any student who has >1 exam in the same (date, session) slot

    Returns:
        {status, conflicts, stats}
    """
    # 1. Map regular course codes to their scheduled slots
    regular_course_slots = {}
    for entry in complete_schedule:
        if not entry.get("is_arrear", False):
            regular_course_slots[entry["course_code"]] = (entry["date"], entry["session"])

    # 2. Map each student to their assigned exam slots
    student_scheduled_slots = defaultdict(list)

    # Add regular enrolments
    for row in enrolments:
        if not row.get("is_arrear", False):
            reg_no = row.get("reg_no")
            c_code = row.get("course_code")
            if reg_no and c_code and c_code in regular_course_slots:
                student_scheduled_slots[reg_no].append((c_code, regular_course_slots[c_code]))

    # Add arrear enrolments (strictly using student_reg_nos attached to scheduled item)
    for entry in complete_schedule:
        if entry.get("is_arrear", False):
            stus = entry.get("student_reg_nos", [])
            c_code = entry.get("course_code")
            slot = (entry["date"], entry["session"])
            for r_no in stus:
                student_scheduled_slots[r_no].append((c_code, slot))

    # 3. Detect clashes per student
    conflicts = []
    for reg_no, exam_list in student_scheduled_slots.items():
        slot_map = defaultdict(list)
        for c_code, slot in exam_list:
            slot_map[slot].append(c_code)
            
        for (d, s), codes in slot_map.items():
            # Deduplicate same course code if listed multiple times
            unique_codes = list(dict.fromkeys(codes))
            if len(unique_codes) > 1:
                for i in range(len(unique_codes)):
                    for j in range(i + 1, len(unique_codes)):
                        conflicts.append({
                            "reg_no": reg_no,
                            "course_a": unique_codes[i],
                            "course_b": unique_codes[j],
                            "course1": unique_codes[i],
                            "course2": unique_codes[j],
                            "date": d,
                            "session": s,
                        })

    total_students = len(student_scheduled_slots)
    conflicting_students = len({c["reg_no"] for c in conflicts})

    stats = {
        "students_checked": total_students,
        "conflicts_found": len(conflicts),
        "clean_students": total_students - conflicting_students,
        "function_type": "Conflict Gatekeeper",
        "rules_applied": ["Rule 2 (1 exam per student per session)"],
    }

    if conflicts:
        return {"status": "FAIL", "conflicts": conflicts, "stats": stats}
    return {"status": "PASS", "conflicts": [], "stats": stats}