"""
test_crew_langchain.py — Automated test suite for CrewAI and LangChain integration & CLI training capabilities.
"""
import pytest
import json
import subprocess
import os

from crew_agent import (
    calendar_tool,
    course_matcher_tool,
    harmonizer_tool,
    spacing_tool,
    arrear_tool,
    conflict_checker_tool,
    resolver_tool,
    create_exam_cell_crew,
    train_crew
)
from langchain_agent import (
    get_langchain_tools,
    build_langchain_executor,
    train_langchain_agent
)


def test_crewai_tools():
    """Verify that all CrewAI custom tools execute successfully."""
    cal_res = calendar_tool._run(start_date="2026-11-02", leave_days_json="[]")
    cal_data = json.loads(cal_res)
    assert "slots" in cal_data
    assert len(cal_data["slots"]) > 0

    sample_enrolments = [
        {"reg_no": "722823101", "course_code": "CS301", "course_name": "Data Structures", "semester": 3, "department": "CSE", "branch": "CSE"},
        {"reg_no": "722823101", "course_code": "MA301", "course_name": "Maths III", "semester": 3, "department": "CSE", "branch": "CSE"}
    ]
    matcher_res = course_matcher_tool._run(enrolments_json=json.dumps(sample_enrolments))
    matcher_data = json.loads(matcher_res)
    assert "clusters" in matcher_data

    harm_res = harmonizer_tool._run(
        open_slots_json=json.dumps(cal_data["slots"]),
        clusters_json=json.dumps(matcher_data["clusters"])
    )
    harm_data = json.loads(harm_res)
    assert "draft_schedule" in harm_data

    spacing_res = spacing_tool._run(
        draft_schedule_json=json.dumps(harm_data["draft_schedule"])
    )
    spacing_data = json.loads(spacing_res)
    assert "spaced_schedule" in spacing_data

    arrear_res = arrear_tool._run(
        spaced_schedule_json=json.dumps(spacing_data["spaced_schedule"]),
        open_slots_json=json.dumps(cal_data["slots"]),
        arrear_sweep_slots_json=json.dumps(harm_data["arrear_sweep_slots"]),
        enrolments_json=json.dumps(sample_enrolments)
    )
    arrear_data = json.loads(arrear_res)
    assert "final_schedule" in arrear_data

    conflict_res = conflict_checker_tool._run(
        timetable_json=json.dumps(arrear_data["final_schedule"]),
        enrolments_json=json.dumps(sample_enrolments)
    )
    conflict_data = json.loads(conflict_res)
    assert "status" in conflict_data


def test_crewai_crew_structure():
    """Verify that the CrewAI Crew initializes with 7 agents and 6 tasks."""
    crew = create_exam_cell_crew()
    assert len(crew.agents) == 7
    assert len(crew.tasks) == 6


def test_langchain_tools():
    """Verify that LangChain StructuredTools execute cleanly."""
    tools = get_langchain_tools()
    assert len(tools) == 7
    tool_names = [t.name for t in tools]
    assert "calendar_manager" in tool_names
    assert "conflict_checker" in tool_names


def test_langchain_training_loop():
    """Verify LangChain training and benchmark loop."""
    res = train_langchain_agent(n_iterations=2)
    assert res["iterations"] == 2
    assert len(res["results"]) == 2
    assert res["results"][0]["status"] == "PASS"


def test_cli_train_execution():
    """Test CLI execution for CrewAI and LangChain training options."""
    env = os.environ.copy()
    # Test LangChain CLI train
    res_lc = subprocess.run(
        ["python", "cli_train.py", "langchain", "--train", "--iterations", "1"],
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        capture_output=True,
        text=True,
        env=env
    )
    assert res_lc.returncode == 0
    assert "LangChain Agent Training" in res_lc.stdout
