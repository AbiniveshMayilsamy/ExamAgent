"""
hub.py — Central Orchestrator Hub
Runs agents 1→3→4→5→6→2 with retry on conflict.
Supports human intervention: each agent's output can be overridden before the next runs.
"""
from data_loader import load_students, build_dept_roll_ranges
from agent1_calendar import build_calendar
from agent3_matcher import build_course_clusters
from agent4_harmonizer import assign_regular_slots
from agent5_spacing import apply_spacing_rules
from agent6_arrear import schedule_arrears
from agent7_resolver import resolve_conflicts, suggest_manual_resolutions
from agent2_conflict import check_conflicts

MAX_RETRIES = 15


def run_pipeline(
    source,
    start_date: str,
    end_date: str,
    leave_days: list[str],
    difficulty_map: dict,
    year_session_pattern: dict | None = None,
    exams_per_branch: dict | None = None,
    on_agent_done=None,   # callback(agent_id, output, stats) -> override_output | None
) -> dict:
    """
    Central Hub.

    Args:
        on_agent_done: optional callback called after each agent completes.
                       Receives (agent_id, output, stats).
                       If it returns a non-None value, that value replaces the agent output
                       (human intervention / override).

    Returns:
        {schedule, audit_log, status, conflicts, agent_stats, dept_roll_ranges}
    """
    audit_log = []
    agent_stats = {}

    def maybe_override(agent_id, output, stats):
        agent_stats[agent_id] = stats
        if on_agent_done:
            override = on_agent_done(agent_id, output, stats)
            if override is not None:
                audit_log.append(f"Agent {agent_id}: ⚡ Human override applied.")
                return override
        return output

    # ── Load data ────────────────────────────────────────────────────────────
    enrolments = load_students(source)
    dept_roll_ranges = build_dept_roll_ranges(enrolments)
    audit_log.append(f"Data: Loaded {len(enrolments)} enrolment rows.")

    # ── Agent 1 ──────────────────────────────────────────────────────────────
    open_slots, stats1 = build_calendar(start_date, end_date, leave_days, year_session_pattern)
    audit_log.append(f"Agent 1: {stats1['total_slots']} slots across {stats1['exam_days']} days.")
    open_slots = maybe_override(1, open_slots, stats1)

    # ── Agent 3 ──────────────────────────────────────────────────────────────
    clusters, stats3 = build_course_clusters(enrolments, exams_per_branch)
    audit_log.append(f"Agent 3: {stats3['total_courses']} courses, {stats3['shared_courses']} shared.")
    clusters = maybe_override(3, clusters, stats3)

    # ── Agent 4 ──────────────────────────────────────────────────────────────
    draft, stats4 = assign_regular_slots(open_slots, clusters, year_session_pattern, dept_roll_ranges)
    audit_log.append(f"Agent 4: Assigned {stats4['assigned']} courses. Unassigned: {stats4['unassigned']}.")
    draft = maybe_override(4, draft, stats4)

    # ── Agent 5 ──────────────────────────────────────────────────────────────
    spaced, stats5 = apply_spacing_rules(draft, difficulty_map)
    audit_log.append(f"Agent 5: {stats5['exams_moved']} exams moved. Range: {stats5['final_date_range']}.")
    spaced = maybe_override(5, spaced, stats5)

    # ── Agent 6 ──────────────────────────────────────────────────────────────
    # Separate arrears from regular enrolments
    arrear_enrolments = [r for r in enrolments if r.get("is_arrear")]
    # Pass full enrolments so Agent 6 can track which sessions each student already has
    complete, stats6 = schedule_arrears(spaced, arrear_enrolments, open_slots, year_session_pattern, enrolments)
    audit_log.append(f"Agent 6: {stats6['arrear_slots_assigned']} arrear slots for {stats6['arrear_students']} students.")
    complete = maybe_override(6, complete, stats6)

    # ── Agent 2 with retry ───────────────────────────────────────────────────
    schedule = complete
    for attempt in range(1, MAX_RETRIES + 1):
        result = check_conflicts(schedule, enrolments)
        agent_stats[2] = result["stats"]
        if result["status"] == "PASS":
            audit_log.append(f"Agent 2: ✅ 0 conflicts (attempt {attempt}).")
            return {
                "schedule": schedule,
                "audit_log": audit_log,
                "status": "PASS",
                "conflicts": [],
                "agent_stats": agent_stats,
                "dept_roll_ranges": dept_roll_ranges,
            }
        
        # If retries exhausted, call Agent 7
        if attempt == MAX_RETRIES:
            audit_log.append(f"Agent 2: Max retries reached. Calling Agent 7 for cumulative resolution...")
            
            # Convert Agent 2 conflict format to Agent 7 expected format
            agent7_conflicts = [
                {
                    "reg_no": c.get("reg_no", ""),
                    "course1": c.get("course_a", c.get("course1", "")),
                    "course2": c.get("course_b", c.get("course2", "")),
                    "date": c.get("date", ""),
                    "session": c.get("session", "")
                }
                for c in result["conflicts"]
            ]
            result7 = resolve_conflicts(schedule, enrolments, agent7_conflicts, open_slots)
            agent_stats[7] = {
                "resolved": result7["resolved"],
                "unresolved": result7["unresolved"]
            }
            schedule = result7["schedule"]
            audit_log.extend(result7["resolution_log"])
            
            # Verify after Agent 7
            final_check = check_conflicts(schedule, enrolments)
            if final_check["status"] == "PASS":
                audit_log.append("Agent 7: ✅ All conflicts resolved!")
                return {
                    "schedule": schedule,
                    "audit_log": audit_log,
                    "status": "PASS",
                    "conflicts": [],
                    "agent_stats": agent_stats,
                    "dept_roll_ranges": dept_roll_ranges,
                }
            
            # If still unresolved, provide manual suggestions
            suggestions = suggest_manual_resolutions(final_check["conflicts"], enrolments)
            audit_log.append(f"Agent 7: ⚠️ {result7['unresolved']} conflicts remain. Manual review required.")
            return {
                "schedule": schedule,
                "audit_log": audit_log,
                "status": "MANUAL_REVIEW_REQUIRED",
                "conflicts": final_check.get("conflicts", []),
                "manual_suggestions": suggestions,
                "agent_stats": agent_stats,
                "dept_roll_ranges": dept_roll_ranges,
            }
        
        conflict = result["conflicts"][0]
        audit_log.append(
            f"Agent 2 attempt {attempt}: {conflict['reg_no']} — "
            f"{conflict['course_a']} vs {conflict['course_b']} on {conflict['date']} {conflict['session']}"
        )
        # Re-run spacing + arrear to fix
        reg = [e for e in schedule if not e.get("is_arrear")]
        reg, _ = apply_spacing_rules(reg, difficulty_map)
        schedule, _ = schedule_arrears(reg, arrear_enrolments, open_slots, year_session_pattern, enrolments)

    final = check_conflicts(schedule, enrolments)
    audit_log.append(f"⚠️ Exceeded {MAX_RETRIES} retries. Manual review required.")
    return {
        "schedule": schedule,
        "audit_log": audit_log,
        "status": "MANUAL_REVIEW_REQUIRED",
        "conflicts": final.get("conflicts", []),
        "agent_stats": agent_stats,
        "dept_roll_ranges": dept_roll_ranges,
    }