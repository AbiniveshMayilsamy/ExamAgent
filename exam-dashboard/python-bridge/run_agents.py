"""
python-bridge/run_agents.py
Runs the 6-agent pipeline and streams JSON events to stdout.
Node.js reads these events line-by-line via child_process.spawn.

Human intervention: after each agent completes, emits agent_awaiting_review.
Node.js sends a JSON line to stdin: {"action": "resume", "override": null | [...]}
The bridge waits (blocking read) until that line arrives.

Event shapes:
  {event: agent_start,          agentId, agentName}
  {event: agent_log,            agentId, message}
  {event: agent_done,           agentId, summary, stats, llmExplanation, output}
  {event: agent_awaiting_review,agentId, output, stats}
  {event: agent_fail,           agentId, error}
  {event: pipeline_done,        schedule, auditLog, status, conflicts, agentStats, deptRollRanges, ...}
  {event: ai_suggestion,        text}
  {event: pipeline_fail,        error}
"""
import sys
import os
import json
import argparse
import requests

AGENTS_PATH = os.environ.get("AGENTS_PATH", os.path.join(os.path.dirname(__file__), "../../exam-cell-agent"))
sys.path.insert(0, AGENTS_PATH)

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3")

AGENT_NAMES = {
    1: "Calendar & Session Manager",
    2: "Student Conflict Checker",
    3: "Common Course Matcher",
    4: "Regular Stream Harmonizer",
    5: "Spacing & Difficulty Evaluator",
    6: "Arrear & Backlog Scheduler",
}

AGENT_FUNCTION_TYPES = {
    1: "Calendar Builder",
    2: "Conflict Gatekeeper",
    3: "Course Cluster Builder",
    4: "Slot Harmonizer",
    5: "Gap & Difficulty Enforcer",
    6: "Arrear Packer",
}

AGENT_RULES = {
    1: "Rules 1, 4, 5, 10 — slot grid, FN/AN timings, leave days, year-session pattern",
    2: "Rule 2 — 1 student max 1 exam per session",
    3: "Rules 3, 5, 8, 11 — common courses, cross-parity, exams-per-branch cap",
    4: "Rules 4, 9, 10, 11 — session harmony, credit priority, year pattern, shared courses",
    5: "Rules 1, 9 — min 1-day gap (Mon→Wed), hard/high-credit 2-day buffer",
    6: "Rules 2, 7, 10, 13 — 2 arrears/day consecutive, opposite session, year pattern",
}


def emit(obj: dict):
    print(json.dumps(obj), flush=True)


def ask_ollama(prompt: str) -> str:
    try:
        resp = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=60,
        )
        return resp.json().get("response", "").strip()
    except Exception as e:
        return f"(LLM unavailable: {e})"


def agent_explanation(agent_id: int, summary: str) -> str:
    prompt = (
        f"You are an exam scheduling assistant. "
        f"Agent {agent_id} ({AGENT_NAMES[agent_id]}) just completed. "
        f"Function type: {AGENT_FUNCTION_TYPES[agent_id]}. "
        f"It enforces: {AGENT_RULES[agent_id]}. "
        f"Result: {summary}. "
        f"Explain in 2 simple sentences what this agent did and why it matters for students."
    )
    return ask_ollama(prompt)


def ai_suggestions(schedule: list, audit_log: list) -> str:
    preview = json.dumps(schedule[:10], indent=2)
    audit_text = "\n".join(audit_log)
    prompt = (
        "You are an expert academic exam scheduler. "
        f"Timetable (first 10 entries):\n{preview}\n\n"
        f"Audit log:\n{audit_text}\n\n"
        "Give 3 specific, actionable suggestions to improve this timetable for student well-being. "
        "One sentence each."
    )
    return ask_ollama(prompt)


def wait_for_resume(agent_id: int, output, stats: dict):
    """
    Emit agent_awaiting_review and block until Node.js sends a resume signal on stdin.
    Returns the (possibly overridden) output.
    """
    emit({
        "event": "agent_awaiting_review",
        "agentId": agent_id,
        "output": output,
        "stats": stats,
    })
    # Read one line from stdin — Node.js will write {"action":"resume","override":null|[...]}
    try:
        line = sys.stdin.readline()
        if line:
            msg = json.loads(line.strip())
            if msg.get("action") == "resume" and msg.get("override") is not None:
                return msg["override"]
    except Exception:
        pass
    return output


def run_agent(agent_id, fn, *args, human_intervention=False, **kwargs):
    """Run one agent, emit events, optionally pause for human review."""
    emit({"event": "agent_start", "agentId": agent_id, "agentName": AGENT_NAMES[agent_id],
          "functionType": AGENT_FUNCTION_TYPES[agent_id], "rules": AGENT_RULES[agent_id]})
    try:
        result, stats = fn(*args, **kwargs)
        summary = _build_summary(agent_id, stats)
        emit({"event": "agent_log", "agentId": agent_id, "message": summary})
        llm = agent_explanation(agent_id, summary)
        emit({"event": "agent_done", "agentId": agent_id, "summary": summary,
              "stats": stats, "llmExplanation": llm, "output": result})

        if human_intervention:
            result = wait_for_resume(agent_id, result, stats)

        return result, stats
    except Exception as e:
        emit({"event": "agent_fail", "agentId": agent_id, "error": str(e)})
        raise


def _build_summary(agent_id: int, stats: dict) -> str:
    summaries = {
        1: lambda s: f"Built {s['total_slots']} slots across {s['exam_days']} exam days. {s['leave_days_excluded']} leave days excluded.",
        3: lambda s: f"Found {s['total_courses']} courses, {s['shared_courses']} shared across branches.",
        4: lambda s: f"Assigned {s['assigned']} courses to slots. {s['unassigned']} unassigned.",
        5: lambda s: f"Moved {s['exams_moved']} exams for gap compliance. Range: {s['final_date_range']}.",
        6: lambda s: f"Scheduled {s['arrear_slots_assigned']} arrear slots for {s['arrear_students']} students.",
        2: lambda s: f"Checked {s['students_checked']} students. {s['conflicts_found']} conflicts found.",
    }
    return summaries.get(agent_id, lambda s: str(s))(stats)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True)
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    parser.add_argument("--leaves", default="[]")
    parser.add_argument("--difficulty", default="{}")
    parser.add_argument("--year-session-pattern", default="{}", dest="year_session_pattern")
    parser.add_argument("--exams-per-branch", default="{}", dest="exams_per_branch")
    parser.add_argument("--human-intervention", action="store_true", dest="human_intervention")
    args = parser.parse_args()

    leave_days = json.loads(args.leaves)

    def safe_parse(raw_str):
        """Parse JSON string, handling double-encoding from FormData."""
        val = json.loads(raw_str)
        return json.loads(val) if isinstance(val, str) else val

    difficulty_map = safe_parse(args.difficulty)
    raw_pattern = safe_parse(args.year_session_pattern)
    year_session_pattern = {int(k): v for k, v in raw_pattern.items()} if raw_pattern else None
    exams_per_branch = safe_parse(args.exams_per_branch) or None
    hi = args.human_intervention

    try:
        from data_loader import load_students, build_dept_roll_ranges
        from agent1_calendar import build_calendar
        from agent3_matcher import build_course_clusters
        from agent4_harmonizer import assign_regular_slots
        from agent5_spacing import apply_spacing_rules
        from agent6_arrear import schedule_arrears
        from agent2_conflict import check_conflicts
    except Exception as e:
        emit({"event": "pipeline_fail", "error": f"Import error: {e}"})
        return

    MAX_RETRIES = 15
    audit_log = []
    agent_stats = {}

    try:
        enrolments = load_students(args.csv)
        dept_roll_ranges = build_dept_roll_ranges(enrolments)
        emit({"event": "agent_log", "agentId": 0, "message": f"Loaded {len(enrolments)} enrolment rows."})
    except Exception as e:
        emit({"event": "pipeline_fail", "error": f"Data load failed: {e}"})
        return

    # ── Agent 1 ──────────────────────────────────────────────────────────────
    try:
        open_slots, stats1 = run_agent(1, build_calendar,
            args.start, args.end, leave_days, year_session_pattern,
            human_intervention=hi)
        agent_stats[1] = stats1
        audit_log.append(_build_summary(1, stats1))
    except Exception as e:
        emit({"event": "pipeline_fail", "error": str(e)}); return

    # ── Agent 3 ──────────────────────────────────────────────────────────────
    try:
        clusters, stats3 = run_agent(3, build_course_clusters,
            enrolments, exams_per_branch,
            human_intervention=hi)
        agent_stats[3] = stats3
        audit_log.append(_build_summary(3, stats3))
    except Exception as e:
        emit({"event": "pipeline_fail", "error": str(e)}); return

    # ── Agent 4 ──────────────────────────────────────────────────────────────
    try:
        draft, stats4 = run_agent(4, assign_regular_slots,
            open_slots, clusters, year_session_pattern, dept_roll_ranges,
            human_intervention=hi)
        agent_stats[4] = stats4
        audit_log.append(_build_summary(4, stats4))
    except Exception as e:
        emit({"event": "pipeline_fail", "error": str(e)}); return

    # ── Agent 5 ──────────────────────────────────────────────────────────────
    try:
        spaced, stats5 = run_agent(5, apply_spacing_rules,
            draft, difficulty_map,
            human_intervention=hi)
        agent_stats[5] = stats5
        audit_log.append(_build_summary(5, stats5))
    except Exception as e:
        emit({"event": "pipeline_fail", "error": str(e)}); return

    # ── Agent 6 ──────────────────────────────────────────────────────────────
    try:
        arrear_enrolments = [r for r in enrolments if r.get("is_arrear")]
        complete, stats6 = run_agent(6, schedule_arrears,
            spaced, arrear_enrolments, open_slots, year_session_pattern, enrolments,
            human_intervention=hi)
        agent_stats[6] = stats6
        audit_log.append(_build_summary(6, stats6))
    except Exception as e:
        emit({"event": "pipeline_fail", "error": str(e)}); return

    # ── Agent 2 with retry ───────────────────────────────────────────────────
    schedule = complete
    final_status = "MANUAL_REVIEW_REQUIRED"
    final_conflicts = []

    emit({"event": "agent_start", "agentId": 2, "agentName": AGENT_NAMES[2],
          "functionType": AGENT_FUNCTION_TYPES[2], "rules": AGENT_RULES[2]})

    for attempt in range(1, MAX_RETRIES + 1):
        result = check_conflicts(schedule, enrolments)
        agent_stats[2] = result["stats"]
        if result["status"] == "PASS":
            summary = f"0 conflicts after {attempt} check(s). Timetable valid."
            audit_log.append(summary)
            emit({"event": "agent_log", "agentId": 2, "message": summary})
            llm = agent_explanation(2, summary)
            emit({"event": "agent_done", "agentId": 2, "summary": summary,
                  "stats": result["stats"], "llmExplanation": llm, "output": []})
            final_status = "PASS"
            break
        else:
            conflict = result["conflicts"][0]
            msg = (f"Attempt {attempt}: {conflict['reg_no']} — "
                   f"{conflict['course_a']} vs {conflict['course_b']} on {conflict['date']} {conflict['session']}")
            audit_log.append(msg)
            emit({"event": "agent_log", "agentId": 2, "message": msg})
            final_conflicts = result["conflicts"]
            try:
                reg_clusters = [e for e in clusters]  # re-use clusters from agent3
                reg, _ = assign_regular_slots(open_slots, reg_clusters, year_session_pattern, dept_roll_ranges)
                reg, _ = apply_spacing_rules(reg, difficulty_map)
                schedule, _ = schedule_arrears(reg, arrear_enrolments, open_slots, year_session_pattern, enrolments)
            except Exception:
                pass
    else:
        summary = f"Exceeded {MAX_RETRIES} retries. Manual review required."
        emit({"event": "agent_log", "agentId": 2, "message": summary})
        emit({"event": "agent_done", "agentId": 2, "summary": summary,
              "stats": agent_stats.get(2, {}), "llmExplanation": ask_ollama(
                  f"Exam conflict unresolved after {MAX_RETRIES} attempts. "
                  "Explain in 2 sentences what a human exam controller should check."
              ), "output": final_conflicts})

    # ── AI Suggestions ───────────────────────────────────────────────────────
    suggestions = ai_suggestions(schedule, audit_log)
    emit({"event": "ai_suggestion", "text": suggestions})

    # ── Final result ─────────────────────────────────────────────────────────
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
    })


if __name__ == "__main__":
    main()
