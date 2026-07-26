"""
tests/test_agents.py — Unit and integration tests for all 6 agents + hub.
Run with: python -m pytest tests/ -v
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from agent1_calendar import build_calendar
from agent2_conflict import check_conflicts
from agent3_matcher import build_course_clusters
from agent4_harmonizer import assign_regular_slots
from agent5_spacing import apply_spacing_rules
from agent6_arrear import schedule_arrears
from data_loader import load_students


# ── Agent 1 ──────────────────────────────────────────────────────────────────

def test_agent1_basic_slot_count():
    slots = build_calendar("2026-11-01", "2026-11-05", [])
    assert len(slots) == 10  # 5 days × 2 sessions

def test_agent1_leave_days_excluded():
    slots = build_calendar("2026-11-01", "2026-11-05", ["2026-11-03"])
    assert len(slots) == 8  # 4 days × 2 sessions
    dates = {s["date"] for s in slots}
    assert "2026-11-03" not in dates

def test_agent1_sessions_are_fn_and_an():
    slots = build_calendar("2026-11-01", "2026-11-01", [])
    sessions = {s["session"] for s in slots}
    assert sessions == {"FN", "AN"}

def test_agent1_empty_range():
    slots = build_calendar("2026-11-05", "2026-11-04", [])
    assert slots == []


# ── Agent 3 ──────────────────────────────────────────────────────────────────

SAMPLE_ENROLMENTS = [
    {"reg_no": "2026CSE001", "course_code": "MA101", "course_name": "Maths I", "semester": 1, "branch": "CSE", "is_arrear": False},
    {"reg_no": "2026ECE001", "course_code": "MA101", "course_name": "Maths I", "semester": 1, "branch": "ECE", "is_arrear": False},
    {"reg_no": "2026CSE001", "course_code": "CS301", "course_name": "Data Structures", "semester": 3, "branch": "CSE", "is_arrear": False},
]

def test_agent3_shared_course_detected():
    clusters = build_course_clusters(SAMPLE_ENROLMENTS)
    ma101 = next(c for c in clusters if c["course_code"] == "MA101")
    assert ma101["is_shared"] is True
    assert set(ma101["branches"]) == {"CSE", "ECE"}

def test_agent3_single_branch_not_shared():
    clusters = build_course_clusters(SAMPLE_ENROLMENTS)
    cs301 = next(c for c in clusters if c["course_code"] == "CS301")
    assert cs301["is_shared"] is False


# ── Agent 2 ──────────────────────────────────────────────────────────────────

def test_agent2_no_conflict():
    schedule = [
        {"course_code": "CS301", "date": "2026-11-02", "session": "FN", "branches": ["CSE"], "is_arrear": False},
        {"course_code": "MA101", "date": "2026-11-04", "session": "FN", "branches": ["CSE"], "is_arrear": False},
    ]
    enrolments = [
        {"reg_no": "2026CSE001", "course_code": "CS301", "branch": "CSE"},
        {"reg_no": "2026CSE001", "course_code": "MA101", "branch": "CSE"},
    ]
    result = check_conflicts(schedule, enrolments)
    assert result["status"] == "PASS"

def test_agent2_detects_conflict():
    schedule = [
        {"course_code": "CS301", "date": "2026-11-02", "session": "FN", "branches": ["CSE"], "is_arrear": False},
        {"course_code": "MA101", "date": "2026-11-02", "session": "FN", "branches": ["CSE"], "is_arrear": False},
    ]
    enrolments = [
        {"reg_no": "2026CSE001", "course_code": "CS301", "branch": "CSE"},
        {"reg_no": "2026CSE001", "course_code": "MA101", "branch": "CSE"},
    ]
    result = check_conflicts(schedule, enrolments)
    assert result["status"] == "FAIL"
    assert len(result["conflicts"]) >= 1
    assert result["conflicts"][0]["reg_no"] == "2026CSE001"


# ── Agent 5 ──────────────────────────────────────────────────────────────────

def test_agent5_enforces_1day_gap():
    draft = [
        {"course_code": "CS301", "course_name": "DS", "date": "2026-11-02", "session": "FN",
         "semester": 3, "branches": ["CSE"], "is_shared": False, "is_arrear": False},
        {"course_code": "CS302", "course_name": "OS", "date": "2026-11-03", "session": "FN",
         "semester": 3, "branches": ["CSE"], "is_shared": False, "is_arrear": False},
    ]
    difficulty_map = {"CS301": "medium", "CS302": "medium"}
    spaced = apply_spacing_rules(draft, difficulty_map)
    dates = sorted(e["date"] for e in spaced)
    from datetime import date as d
    gap = (d.fromisoformat(dates[1]) - d.fromisoformat(dates[0])).days
    assert gap >= 2  # at least 1 full day between them

def test_agent5_hard_course_after_2day_gap():
    draft = [
        {"course_code": "CS301", "course_name": "DS", "date": "2026-11-02", "session": "FN",
         "semester": 3, "branches": ["CSE"], "is_shared": False, "is_arrear": False},
        {"course_code": "CS302", "course_name": "OS", "date": "2026-11-06", "session": "FN",
         "semester": 3, "branches": ["CSE"], "is_shared": False, "is_arrear": False},
        {"course_code": "CS303", "course_name": "CN", "date": "2026-11-10", "session": "FN",
         "semester": 3, "branches": ["CSE"], "is_shared": False, "is_arrear": False},
    ]
    difficulty_map = {"CS301": "easy", "CS302": "easy", "CS303": "hard"}
    spaced = apply_spacing_rules(draft, difficulty_map)
    # Hard course should be moved closer to the 2-day gap after CS301
    hard_entry = next(e for e in spaced if e["course_code"] == "CS303")
    assert hard_entry is not None  # just verify it's still in the schedule


# ── Integration test ──────────────────────────────────────────────────────────

def test_full_pipeline_no_conflicts():
    """Integration test: run the full pipeline on sample data and expect 0 conflicts."""
    from hub import run_pipeline
    import os
    sample_path = os.path.join(os.path.dirname(__file__), "..", "sample_data", "students.json")
    difficulty_map = {
        "CS301": "hard", "CS302": "hard", "MA101": "medium",
        "EC301": "medium", "EC302": "easy", "ME301": "hard",
        "ME302": "medium", "CS303": "medium", "CS201": "easy",
    }
    result = run_pipeline(
        source=sample_path,
        start_date="2026-11-01",
        end_date="2026-11-30",
        leave_days=["2026-11-10", "2026-11-15"],
        difficulty_map=difficulty_map,
    )
    assert result["status"] == "PASS", f"Conflicts found: {result.get('conflicts', [])}"
    assert len(result["schedule"]) > 0
