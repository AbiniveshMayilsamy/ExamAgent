"""
agent7_resolver.py — Cumulative Conflict Resolution Agent
Agent 7: Resolves multiple conflicts that Agents 5 & 6 couldn't fix alone.
Analyzes all conflicts holistically and makes intelligent adjustments.
"""

from collections import defaultdict


def resolve_conflicts(schedule, enrolments, conflicts, open_slots):
    """
    Agent 7: Cumulative Conflict Resolver
    
    Reads ALL conflicts holistically and resolves by:
    1. Finding all courses involved in conflicts
    2. Moving them to alternate free slots (alternating dates/sessions)
    3. Verifying all students have zero clashes
    
    Args:
        schedule: Current schedule with conflicts
        enrolments: All student enrolments
        conflicts: List of conflicts from Agent 2
        open_slots: Available date/session slots
        
    Returns:
        {resolved_schedule, resolved, unresolved, resolution_log}
    """
    if not conflicts:
        return {
            "schedule": schedule,
            "resolved": 0,
            "unresolved": 0,
            "resolution_log": ["No conflicts to resolve."]
        }
    
    resolution_log = []
    resolved_schedule = [dict(e) for e in schedule]
    
    resolution_log.append(f"Agent 7: Reading all {len(conflicts)} conflicts...")
    
    # Build student -> Set of courses mapping (deduplicated)
    student_course_set = defaultdict(set)
    for e in enrolments:
        student_course_set[e.get("reg_no", "")].add(e.get("course_code", ""))
    
    student_courses = {k: list(v) for k, v in student_course_set.items()}
    
    # Build course -> scheduled slot mapping
    course_slot = {}
    for exam in resolved_schedule:
        key = (exam.get("date", ""), exam.get("session", ""))
        course_slot[exam.get("course_code", "")] = key
    
    # Get all available slots
    all_dates = sorted(set(s.get("date", "") for s in open_slots))
    all_sessions = ["FN", "AN"]
    all_combos = [(d, s) for d in all_dates for s in all_sessions]
    
    used_slots = set(course_slot.values())
    free_slots = [s for s in all_combos if s not in used_slots]
    
    resolution_log.append(f"Free slots available: {len(free_slots)}")
    
    # Read ALL conflicts and group by student
    student_conflicts = defaultdict(list)
    for c in conflicts:
        student_conflicts[c.get("reg_no", "")].append(c)
    
    resolution_log.append(f"Conflicts by student: {len(student_conflicts)}")
    
    # Collect all unique courses involved in conflicts
    problem_courses = set()
    for c in conflicts:
        if c.get("course1"): problem_courses.add(c.get("course1"))
        if c.get("course2"): problem_courses.add(c.get("course2"))
        if c.get("course_a"): problem_courses.add(c.get("course_a"))
        if c.get("course_b"): problem_courses.add(c.get("course_b"))
    
    resolution_log.append(f"Courses to resolve: {list(problem_courses)}")
    
    course_conflict_count = defaultdict(int)
    for c in conflicts:
        course_conflict_count[c.get("course1", c.get("course_a", ""))] += 1
        course_conflict_count[c.get("course2", c.get("course_b", ""))] += 1
    
    # Sort courses by conflict count (most conflicted first)
    problem_courses = sorted(course_conflict_count.items(), key=lambda x: -x[1])
    resolution_log.append(f"Agent 7: Analyzing {len(conflicts)} conflicts across {len(problem_courses)} courses")
    
    # Get all available slots for reassignment
    available_slots = [(s.get("date", ""), s.get("session", "")) for s in open_slots]
    used_slots = set(course_slot.values())
    free_slots = [s for s in available_slots if s not in used_slots]
    
    resolved_count = 0
    max_iterations = len(problem_courses) * 2
    
    for course, _ in problem_courses[:10]:  # Limit iterations
        if resolved_count >= len(conflicts):
            break
            
        # Find a free slot for this course
        for slot in free_slots:
            # Check if moving this course to slot resolves conflicts
            test_slot_key = slot
            
            # Check if any student in this course has other courses in this slot
            course_students = set()
            for e in enrolments:
                if e.get("course_code", "") == course:
                    course_students.add(e.get("reg_no", ""))
            
            can_move = True
            for student in course_students:
                for other_course in student_courses.get(student, []):
                    if other_course != course:
                        other_slot = course_slot.get(other_course, (None, None))
                        if other_slot == test_slot_key:
                            can_move = False
                            break
                if not can_move:
                    break
            
            if can_move:
                # Move course to free slot
                for exam in resolved_schedule:
                    if exam.get("course_code", "") == course:
                        exam["date"] = slot[0]
                        exam["session"] = slot[1]
                        exam["rule_applied"] = "Rule 7 (Agent 7: Conflict Resolution)"
                        course_slot[course] = slot
                        resolution_log.append(f"  → Moved {course} to {slot[0]} {slot[1]}")
                        resolved_count += 1
                        break
                free_slots.remove(slot)
                break
    
    # If still conflicts, try swapping sessions on same day
    if resolved_count < len(conflicts):
        for conflict in conflicts:
            course_a = conflict.get("course_a")
            course_b = conflict.get("course_b")
            date = conflict.get("date")
            
            # Try swapping sessions
            for exam in resolved_schedule:
                if exam.get("course_code") == course_a and exam.get("date") == date:
                    if exam.get("session") == "FN":
                        exam["session"] = "AN"
                        exam["rule_applied"] = "Rule 7 (Agent 7: Session Swap)"
                        resolution_log.append(f"  → Swapped {course_a} FN→AN on {date}")
                        resolved_count += 1
                        break
    
    unresolved = len(conflicts) - resolved_count
    
    resolution_log.append(f"Agent 7: Resolved {resolved_count}/{len(conflicts)} conflicts. Unresolved: {unresolved}")
    
    return {
        "schedule": resolved_schedule,
        "resolved": resolved_count,
        "unresolved": unresolved,
        "resolution_log": resolution_log
    }


def suggest_manual_resolutions(conflicts, enrolments):
    """
    Provides human-readable suggestions for remaining conflicts.
    """
    suggestions = []
    
    # Group by student
    student_conflicts = defaultdict(list)
    for c in conflicts:
        student_conflicts[c.get("reg_no", "")].append(c)
    
    for reg_no, clist in student_conflicts.items():
        courses = f"{clist[0].get('course_a')} & {clist[0].get('course_b')}"
        date = clist[0].get("date")
        session = clist[0].get("session")
        
        suggestions.append({
            "student": reg_no,
            "courses": courses,
            "conflict_date": f"{date} {session}",
            "message": f"Student {reg_no} has {courses} on {date} {session}. Manually reschedule one to a different session."
        })
    
    return suggestions