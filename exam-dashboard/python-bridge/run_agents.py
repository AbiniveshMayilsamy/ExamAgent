#!/usr/bin/env python3
"""
python-bridge/run_agents.py
Bridge CLI script invoked by Node.js express backend.
Parses multi-year files, streams JSON event logs to stdout, and emits final pipeline result.
"""

import sys
import os
import json
import argparse
from datetime import datetime
from collections import defaultdict

# Add exam-cell-agent to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../exam-cell-agent')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../exam-cell-agent')))

from data_loader import load_multi_year_dataset, build_dept_roll_ranges
from agent1_calendar import build_calendar
from agent2_conflict import check_conflicts
from agent3_matcher import build_course_clusters
from agent4_harmonizer import assign_regular_slots, apply_gap_fill
from agent5_spacing import apply_spacing_rules
from agent6_arrear import schedule_arrears
from agent7_resolver import resolve_cumulative_conflicts
from groq_service import assess_course_difficulties, generate_schedule_summary
from config import ScheduleConfig, get_semester_session_cycle, sem_to_year


def emit(data):
    """Output JSON line for Node.js stdout parser."""
    print(json.dumps(data), flush=True)


def main():
    parser = argparse.ArgumentParser(description="Run Exam Cell Agents Multi-Year Pipeline")
    parser.add_argument("--sem-type", default="odd", choices=["odd", "even"])
    parser.add_argument("--year-1", default=None)
    parser.add_argument("--year-2", default=None)
    parser.add_argument("--year-3", default=None)
    parser.add_argument("--year-4", default=None)
    parser.add_argument("--regular-file", default=None)
    parser.add_argument("--arrear-file", default=None)
    parser.add_argument("--start-dates", default="{}")
    parser.add_argument("--leaves", default="[]")
    parser.add_argument("--pattern-type", default="alternating", choices=["alternating", "semester_wise"])
    parser.add_argument("--use-groq-ai", action="store_true")
    parser.add_argument("--human-intervention", action="store_true")
    
    # Backwards compatibility fallback args
    parser.add_argument("--file", default=None)
    parser.add_argument("--start-date", default="2026-11-02")
    parser.add_argument("--end-date", default=None)
    
    args = parser.parse_args()

    pattern_type = args.pattern_type

    regular_file = args.regular_file or args.file
    year_files = {
        "1": args.year_1 or (args.file if "1" in str(args.file) else None),
        "2": args.year_2 or (args.file if "2" in str(args.file) else None),
        "3": args.year_3 or (args.file if "3" in str(args.file) else None),
        "4": args.year_4 or (args.file if "4" in str(args.file) else None),
    }

    # Default fallback if single file uploaded
    if not regular_file and not any(year_files.values()) and args.file:
        regular_file = args.file

    try:
        start_dates = json.loads(args.start_dates)
    except Exception:
        start_dates = {"1": args.start_date, "2": args.start_date, "3": args.start_date, "4": args.start_date}

    try:
        leave_days = json.loads(args.leaves)
    except Exception:
        leave_days = []

    # Select earliest start date
    valid_dates = [d for d in start_dates.values() if d]
    start_date = min(valid_dates) if valid_dates else args.start_date

    audit_log = []
    agent_stats = {}

    # 1. Ingest Datasets
    enrolments = load_multi_year_dataset(year_files=year_files, arrear_file=args.arrear_file, sem_type=args.sem_type, regular_file=regular_file)
    dept_roll_ranges = build_dept_roll_ranges(enrolments)

    # Derive active semester cycle dynamically from regular enrolments
    active_sems = sorted(list({e["semester"] for e in enrolments if not e.get("is_arrear") and "semester" in e}))
    if active_sems:
        sem_cycle = [{"semester": s, "year_label": str(sem_to_year(s))} for s in active_sems]
    else:
        sem_cycle = get_semester_session_cycle(args.sem_type)

    # Agent 1: Calendar Builder
    emit({
        "event": "agent_start",
        "agentId": 1,
        "agentName": "Calendar & Session Manager",
        "functionType": "Calendar Builder",
        "rules": f"Rules 1, 8 — max 2 sessions/day, leave days exclusion (Pattern: {pattern_type})"
    })
    
    # Dynamic calendar horizon based on total course count
    reg_count = len({e["course_code"] for e in enrolments if not e.get("is_arrear")})
    est_days = max(18, (reg_count // 3) + 10)
    
    slots1, stats1 = build_calendar(start_date, leave_days=leave_days, estimated_days=est_days, pattern_type=pattern_type, semester_cycle=sem_cycle)
    agent_stats[1] = stats1
    emit({"event": "agent_log", "agentId": 1, "message": f"Generated {len(slots1)} available session slots through {stats1['end_date']} (Pattern: {pattern_type})."})
    emit({"event": "agent_done", "agentId": 1, "summary": f"Built {len(slots1)} slots across {stats1['total_days']} exam days.", "stats": stats1})

    # Optional Groq AI Course Difficulty Tagging
    difficulty_map = {}
    if args.use_groq_ai:
        all_courses = list({e["course_code"] for e in enrolments})
        difficulty_map = assess_course_difficulties(all_courses)

    # Agent 3: Common Course Matcher
    emit({
        "event": "agent_start",
        "agentId": 3,
        "agentName": "Common Course Matcher",
        "functionType": "Course Cluster Builder",
        "rules": "Rules 3, 5 — common course clustering & alignment"
    })
    clusters, stats3 = build_course_clusters(enrolments)
    agent_stats[3] = stats3
    shared_cnt = stats3.get("shared_courses", stats3.get("shared_clusters", 0))
    total_cnt = stats3.get("total_courses", stats3.get("total_clusters", len(clusters)))
    emit({"event": "agent_log", "agentId": 3, "message": f"Identified {shared_cnt} shared courses across branches."})
    emit({"event": "agent_done", "agentId": 3, "summary": f"Clustered {total_cnt} unique course blocks.", "stats": stats3})

    # Agent 4: Regular Stream Harmonizer
    emit({
        "event": "agent_start",
        "agentId": 4,
        "agentName": "Regular Stream Harmonizer",
        "functionType": "Slot Harmonizer",
        "rules": f"Rule 4 — regular course slot assignment (Pattern: {pattern_type})"
    })
    reg_clusters = [c for c in clusters if not c.get("is_arrear")]
    schedule_config = ScheduleConfig(pattern_type=pattern_type, semester_cycle=sem_cycle)
    agent4_result = assign_regular_slots(slots1, reg_clusters, schedule_config)
    spaced  = agent4_result["draft_schedule"]
    sweep   = agent4_result["arrear_sweep_slots"]
    stats4  = agent4_result["stats"]
    agent_stats[4] = stats4
    emit({"event": "agent_log", "agentId": 4, "message": f"Harmonized {len(spaced)} regular course slots."})
    emit({"event": "agent_done", "agentId": 4, "summary": f"Harmonized {len(spaced)} regular exam slots.", "stats": stats4})

    # Agent 5: Spacing & Difficulty Evaluator
    emit({
        "event": "agent_start",
        "agentId": 5,
        "agentName": "Spacing & Difficulty Evaluator",
        "functionType": "Gap & Difficulty Enforcer",
        "rules": "Rules 1, 6, 9 — min 1-day gap, hard course 2-day buffer post gap"
    })
    spaced_opt, stats5 = apply_spacing_rules(spaced, difficulty_map)
    agent_stats[5] = stats5
    emit({"event": "agent_log", "agentId": 5, "message": f"Applied difficulty gaps and rest days."})
    emit({"event": "agent_done", "agentId": 5, "summary": "Enforced rest gaps and hard course buffers.", "stats": stats5})

    # Agent 6: Arrear Packer
    emit({
        "event": "agent_start",
        "agentId": 6,
        "agentName": "Arrear & Backlog Scheduler",
        "functionType": "Arrear Packer",
        "rules": "Rule 7 — opposite session arrear placement"
    })
    arr_enrolments = [e for e in enrolments if e.get("is_arrear")]
    complete, stats6 = schedule_arrears(spaced_opt, arr_enrolments, sweep, slots1, all_enrolments=enrolments)
    agent_stats[6] = stats6
    emit({"event": "agent_log", "agentId": 6, "message": f"Placed {stats6['arrear_slots_assigned']} arrear courses."})
    emit({"event": "agent_done", "agentId": 6, "summary": f"Scheduled {stats6['arrear_slots_assigned']} arrear slots.", "stats": stats6})

    # Agent 7 & 2: Conflict Gatekeeper & Cumulative Resolver
    emit({
        "event": "agent_start",
        "agentId": 7,
        "agentName": "Cumulative Conflict Resolver",
        "functionType": "Conflict Resolution Expert",
        "rules": "Rule 2 — zero student clashes"
    })
    
    schedule, final_status, final_conflicts = resolve_cumulative_conflicts(complete, enrolments, slots1)
    
    emit({
        "event": "agent_start",
        "agentId": 2,
        "agentName": "Student Conflict Checker",
        "functionType": "Conflict Gatekeeper",
        "rules": "Rule 2 — zero student clashes"
    })
    emit({"event": "agent_log", "agentId": 2, "message": f"Conflict Gatekeeper verification: {final_status} ({len(final_conflicts)} clashes)."})
    emit({"event": "agent_done", "agentId": 2, "summary": f"Status: {final_status}.", "stats": {"conflicts": len(final_conflicts)}})
    emit({"event": "agent_done", "agentId": 7, "summary": f"Final Resolution Status: {final_status}.", "stats": {"conflicts": len(final_conflicts)}})

    # Build student roll mapping per (branch, semester) for regular schedule items
    reg_stus_by_branch_sem = defaultdict(list)
    seen_stus = {}

    # Pass 1: Regular enrolments ONLY (sets real active semester, branch, and name)
    for row in enrolments:
        if not row.get("is_arrear", False):
            rn = str(row["reg_no"]).strip()
            if rn not in seen_stus:
                seen_stus[rn] = {
                    "reg_no": rn,
                    "name": row.get("name", f"Student {rn}"),
                    "branch": row["branch"],
                    "semester": row["semester"],
                }
            reg_stus_by_branch_sem[(row["branch"], row["semester"])].append(rn)

    # Pass 2: Arrear enrolments (add any arrear-only students if not in regular)
    for row in enrolments:
        if row.get("is_arrear", False):
            rn = str(row["reg_no"]).strip()
            if rn not in seen_stus:
                seen_stus[rn] = {
                    "reg_no": rn,
                    "name": row.get("name", f"Student {rn}"),
                    "branch": row["branch"],
                    "semester": row["semester"],
                }

    # Attach student_reg_nos to all schedule items (regular & arrear)
    for entry in schedule:
        if not entry.get("is_arrear", False):
            stus = []
            for br in entry.get("branches", []):
                stus.extend(reg_stus_by_branch_sem.get((br, entry.get("semester")), []))
            entry["student_reg_nos"] = sorted(list(set(stus)))
        elif "student_reg_nos" in entry and isinstance(entry["student_reg_nos"], list):
            entry["student_reg_nos"] = [str(r).strip() for r in entry["student_reg_nos"]]

    students_list = [
        {
            "reg_no": s["reg_no"],
            "name": s["name"],
            "branch": s["branch"],
            "semester": s["semester"]
        } for s in seen_stus.values()
    ]

    ai_summary = generate_schedule_summary({"regular_exams": spaced_opt, "arrear_exams": complete, "start_date": start_date, "end_date": stats1['end_date']}, None)

    emit({
        "event": "pipeline_done",
        "status": final_status,
        "schedule": schedule,
        "auditLog": audit_log,
        "conflicts": final_conflicts,
        "agentStats": agent_stats,
        "deptRollRanges": dept_roll_ranges,
        "totalExams": len([e for e in schedule if not e.get("is_arrear")]),
        "totalArrears": len([e for e in schedule if e.get("is_arrear")]),
        "students": students_list,
        "aiSummary": ai_summary,
        "startDate": start_date,
        "endDate": stats1["end_date"]
    })


if __name__ == "__main__":
    main()
