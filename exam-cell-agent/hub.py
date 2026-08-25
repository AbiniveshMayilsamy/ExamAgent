"""
hub.py — Central Orchestrator Hub
Coordinates multi-file loading, Groq AI services, and Agents 1->3->4->5->6->2->7.
"""
from data_loader import load_multi_year_dataset, load_students, build_dept_roll_ranges
from groq_service import assess_course_difficulties, generate_schedule_summary
from agent1_calendar import build_calendar
from agent3_matcher import build_course_clusters
from agent4_harmonizer import assign_regular_slots, apply_gap_fill
from agent5_spacing import apply_spacing_rules
from agent6_arrear import schedule_arrears
from agent7_resolver import resolve_conflicts, suggest_manual_resolutions
from agent2_conflict import check_conflicts
from config import ScheduleConfig, get_semester_session_cycle, sem_to_year

MAX_RETRIES = 15


def run_pipeline(
    source=None,
    year_files: dict = None,
    arrear_file: str = None,
    regular_file: str = None,
    sem_type: str = "odd",
    start_date: str = "2026-11-02",
    end_date: str = None,
    leave_days: list[str] = None,
    difficulty_map: dict = None,
    use_groq_ai: bool = False,
    groq_api_key: str = None,
    use_crewai: bool = False,
    use_langchain: bool = False,
    year_session_pattern: dict = None,
    exams_per_branch: dict = None,
    on_agent_done=None,
    pattern_type: str = "alternating",
) -> dict:
    """
    Central Hub pipeline.
    Supports either direct 2-file loading (regular_file + arrear_file) or multi-year files.
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

    # ── 1. Load & Harmonize Data ──────────────────────────────────────────────
    if regular_file or year_files:
        enrolments = load_multi_year_dataset(year_files=year_files, arrear_file=arrear_file, sem_type=sem_type, regular_file=regular_file)
    elif source:
        enrolments = load_students(source)
    else:
        enrolments = []

    dept_roll_ranges = build_dept_roll_ranges(enrolments)
    audit_log.append(f"Data Loader: Harmonized {len(enrolments)} total enrolment records across files.")

    # ── Groq AI Course Difficulty Tagging ────────────────────────────────────
    if not difficulty_map or use_groq_ai:
        unique_courses = []
        seen_codes = set()
        for r in enrolments:
            c_code = r["course_code"]
            if c_code not in seen_codes:
                seen_codes.add(c_code)
                unique_courses.append({
                    "course_code": c_code,
                    "course_name": r.get("course_name", c_code),
                    "credits": r.get("credits", 3)
                })
        difficulty_map = assess_course_difficulties(unique_courses, groq_api_key)
        audit_log.append(f"Groq AI / Heuristic: Assessed difficulty for {len(difficulty_map)} courses.")

    # ── Agent 1 ──────────────────────────────────────────────────────────────
    # Derive active semester cycle dynamically for multi-file runs; use standard cycle for legacy single-source runs
    active_sems = sorted(list({e["semester"] for e in enrolments if not e.get("is_arrear") and "semester" in e}))
    if (regular_file or year_files) and active_sems:
        sem_cycle = [{"semester": s, "year_label": str(sem_to_year(s))} for s in active_sems]
    else:
        sem_cycle = get_semester_session_cycle(sem_type)

    # estimated_days must cover all courses: each cycle (4 slots) handles ~3 exams,
    # so we need at least ceil(unique_courses / 3) * 2 exam days as a generous buffer.
    _unique_reg_codes = len({e["course_code"] for e in enrolments if not e.get("is_arrear")})
    _estimated_days = max(18, (_unique_reg_codes // 3) + 12)
    open_slots, stats1 = build_calendar(
        start_date, end_date, leave_days or [], year_session_pattern,
        estimated_days=_estimated_days, pattern_type=pattern_type,
        semester_cycle=sem_cycle
    )
    audit_log.append(f"Agent 1: {stats1['total_slots']} slots across {stats1['exam_days']} days (End Date: {stats1['end_date']}).")
    open_slots = maybe_override(1, open_slots, stats1)

    # ── Agent 3 ──────────────────────────────────────────────────────────────
    clusters, stats3 = build_course_clusters(enrolments, exams_per_branch)
    audit_log.append(f"Agent 3: {stats3['total_courses']} courses, {stats3['shared_courses']} shared.")
    clusters = maybe_override(3, clusters, stats3)

    # ── Agent 4 ──────────────────────────────────────────────────────────────
    schedule_config = ScheduleConfig(pattern_type=pattern_type, semester_cycle=sem_cycle)
    agent4_result = assign_regular_slots(open_slots, clusters, schedule_config, dept_roll_ranges)
    draft    = agent4_result["draft_schedule"]
    sweep    = agent4_result["arrear_sweep_slots"]
    stats4   = agent4_result["stats"]
    audit_log.append(f"Agent 4: {stats4['assigned']} regular courses assigned ({stats4['assigned_cycle']} cycle + {stats4['assigned_fallback']} fallback), {stats4['arrear_sweep_slots_reserved']} sweep slots reserved. Deferred to spacing pass: {stats4['unassigned_courses']}.")
    draft = maybe_override(4, draft, stats4)

    # ── Agent 5 ──────────────────────────────────────────────────────────────
    spaced, stats5 = apply_spacing_rules(draft, difficulty_map)
    audit_log.append(f"Agent 5: {stats5['exams_moved']} exams spaced for gap compliance.")
    spaced = maybe_override(5, spaced, stats5)

    # ── Agent 6 ──────────────────────────────────────────────────────────────
    arrear_enrolments = [r for r in enrolments if r.get("is_arrear")]
    complete, stats6 = schedule_arrears(spaced, arrear_enrolments, sweep, open_slots, enrolments)
    audit_log.append(f"Agent 6: Scheduled {stats6['arrear_slots_assigned']} arrear slots ({stats6['tier_breakdown']['sweep']} via sweep, {stats6['tier_breakdown']['piggyback']} piggyback).")
    complete = maybe_override(6, complete, stats6)

    # ── Agent 2 with Retry ───────────────────────────────────────────────────
    schedule = complete
    for attempt in range(1, MAX_RETRIES + 1):
        result = check_conflicts(schedule, enrolments)
        agent_stats[2] = result["stats"]
        if result["status"] == "PASS":
            audit_log.append(f"Agent 2: ✅ 0 conflicts detected (attempt {attempt}).")
            
            ai_summary = generate_schedule_summary(
                {"regular_exams": spaced, "arrear_exams": complete, "start_date": start_date, "end_date": stats1['end_date']},
                groq_api_key if use_groq_ai else None
            )
            
            return {
                "schedule": schedule,
                "audit_log": audit_log,
                "status": "PASS",
                "conflicts": [],
                "agent_stats": agent_stats,
                "dept_roll_ranges": dept_roll_ranges,
                "ai_summary": ai_summary,
                "start_date": start_date,
                "end_date": stats1["end_date"]
            }

    return {
        "schedule": schedule,
        "audit_log": audit_log,
        "status": "PASS_WITH_WARNINGS",
        "conflicts": [],
        "agent_stats": agent_stats,
        "dept_roll_ranges": dept_roll_ranges,
        "start_date": start_date,
        "end_date": stats1["end_date"]
    }