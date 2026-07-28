# Exam Cell AI Timetable Generator

A 6-agent system that generates collision-free exam timetables from student enrolment data, enforcing all exam cell rules deterministically.

## Setup

```bash
cd exam-cell-agent
pip install -r requirements.txt
```

## Input format

Upload an Excel (.xlsx, .xls), CSV, or JSON file with these columns:

| Column | Example |
|---|---|
| name | Alex Smith |
| reg_no | 722825104001 |
| course_code | CS301 |
| course_name | Data Structures |
| semester | 3 |

College code (`7228`) and batch year (`23`, `24`, `25`, `26`) are auto-parsed from `reg_no`.  
Arrear flag is auto-derived based on whether the course semester matches the student batch's assigned regular semester.

## Run tests

```bash
python -m pytest tests/ -v
```

## The 6 Agents

| Agent | File | Rules |
|---|---|---|
| 1 — Calendar & Session Manager | `agent1_calendar.py` | 1, 8 |
| 2 — Student Conflict Checker | `agent2_conflict.py` | 2 |
| 3 — Common Course Matcher | `agent3_matcher.py` | 3, 5 |
| 4 — Regular Stream Harmonizer | `agent4_harmonizer.py` | 4 |
| 5 — Spacing & Difficulty Evaluator | `agent5_spacing.py` | 6, 9 |
| 6 — Arrear & Backlog Scheduler | `agent6_arrear.py` | 7 |

The Central Hub (`hub.py`) runs them in order: 1 → 3 → 4 → 5 → 6 → 2, with an automatic retry loop if Agent 2 finds a conflict.

## Project structure

```
exam-cell-agent/
├── data_loader.py          # Excel/CSV/JSON parsing + derived fields
├── agent1_calendar.py      # Agent 1
├── agent2_conflict.py      # Agent 2
├── agent3_matcher.py       # Agent 3
├── agent4_harmonizer.py    # Agent 4
├── agent5_spacing.py       # Agent 5
├── agent6_arrear.py        # Agent 6
├── hub.py                  # Central orchestrator + retry loop
├── tests/test_agents.py    # Unit + integration tests
├── sample_data/students.json
├── requirements.txt
└── README.md
```
