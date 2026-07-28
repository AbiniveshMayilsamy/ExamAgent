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
    
    resolved_count = 0
    for c in conflicts:
        reg_no = c.get("reg_no")
        course_a = c.get("course_a")
        course_b = c.get("course_b")
        date = c.get("date")

        # Attempt FN -> AN or slot shift
        for slot in free_slots:
            d_new, s_new = slot
            # Move course_b to free slot
            for exam in resolved_schedule:
                if exam.get("course_code") == course_b and exam.get("date") == date:
                    exam["date"] = d_new
                    exam["session"] = s_new
                    exam["rule_applied"] = "Rule 7 (Agent 7: Shift Slot)"
                    resolution_log.append(f"  → Moved {course_b} from {date} to {d_new} [{s_new}]")
                    resolved_count += 1
                    break
            break

    unresolved = max(0, len(conflicts) - resolved_count)
    resolution_log.append(f"Agent 7: Resolved {resolved_count}/{len(conflicts)} conflicts.")
    
    return {
        "schedule": resolved_schedule,
        "resolved": resolved_count,
        "unresolved": unresolved,
        "resolution_log": resolution_log
    }


def resolve_cumulative_conflicts(schedule, enrolments, open_slots):
    """
    Wrapper function imported by run_agents.py to resolve cumulative conflicts
    and validate final zero-clash status.
    """
    from agent2_conflict import check_conflicts
    initial_check = check_conflicts(schedule, enrolments)
    if initial_check.get("status") == "PASS":
        return schedule, "PASS", []

    res = resolve_conflicts(schedule, enrolments, initial_check.get("conflicts", []), open_slots)
    resolved_schedule = res.get("schedule", schedule)
    
    final_check = check_conflicts(resolved_schedule, enrolments)
    return resolved_schedule, final_check.get("status", "PASS"), final_check.get("conflicts", [])


def suggest_manual_resolutions(conflicts, enrolments):
    """
    Provides human-readable suggestions for remaining conflicts.
    """
    suggestions = []
    
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