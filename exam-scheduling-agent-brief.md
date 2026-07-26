# AI Multi-Agent Exam Scheduling System — Build Brief

**Purpose of this file:** this is a complete project brief for Amazon Q (or any AI coding assistant) to implement a 6-agent exam timetable generator for a college exam cell. It consolidates the architecture, rules, data model, tech stack, build plan, and code skeletons already agreed on. Follow this document as the source of truth — do not redesign the architecture, only implement it.

---

## 1. Project Goal

Convert a manual, rule-based exam scheduling procedure into an automated system that:
- Takes student/course enrolment data (Name, Reg. No, Course, Semester) as input
- Generates a complete, collision-free exam timetable
- Enforces all 9 rules below with **100% accuracy on hard constraints** (no student double-booked, no more than 2 sessions/day)
- Is structured as **6 cooperating agents** controlled by a **central orchestrator hub**
- Is exposed through a simple **web dashboard** (upload data → generate → download)

**Non-negotiable design decision:** each of the 6 "agents" is implemented as a **plain Python function/class**, not wired through an LLM framework (no CrewAI/LangChain call in the critical path). All date math, session allocation, and conflict detection must be deterministic code. This is what makes 100% rule accuracy achievable — an LLM must never be asked to compute a date, count, or slot match itself. An LLM layer (optional, later) may only be used for parsing messy free-text input or generating human-readable audit explanations — never for the actual scheduling logic.

---

## 2. The 9 Rules (source of truth — do not alter)

| # | Rule | Owner Agent |
|---|------|-------------|
| 1 | Maximum 2 sessions of exam can be conducted per day. | Agent 1 – Calendar & Session Manager |
| 2 | 1 student can write a maximum of 1 exam per session. | Agent 2 – Student Conflict Checker |
| 3 | Courses common to students of various branches/semesters must be examined in the same session. | Agent 3 – Common Course Matcher |
| 4 | Regular courses of a particular semester should, as far as possible, be held in the same session across all branches. | Agent 4 – Regular Stream Harmonizer |
| 5 | A course studied by 2 different branches in odd and even semesters respectively must be scheduled in the same session. | Agent 3 – Common Course Matcher |
| 6 | Minimum one-day gap must be maintained between 2 successive exams of regular courses. | Agent 5 – Spacing & Difficulty Evaluator |
| 7 | Arrear course exams can be scheduled in the other session of a regular exam day, if necessary. | Agent 6 – Arrear & Backlog Scheduler |
| 8 | Leave days are to be considered based on requirements. | Agent 1 – Calendar & Session Manager |
| 9 | If there is a 2-day gap between 2 successive regular exams, a difficult course's exam can be scheduled after the 2-day leave. | Agent 5 – Spacing & Difficulty Evaluator |

Every implementation decision must trace back to one of these rules. If in doubt, the rule wins over convenience.

---

## 3. Architecture

```
                        ┌──────────────────────────┐
                        │     CENTRAL HUB (main)    │
                        │   owns shared state,      │
                        │   controls run order,      │
                        │   handles retry loop        │
                        └────────────┬─────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │ Step 1                    │ Step 2                     │ Step 3
        ▼                           ▼                             ▼
  ┌──────────────┐            ┌──────────────┐             ┌──────────────┐
  │  Agent 1      │            │  Agent 3      │             │  Agent 4      │
  │  Calendar &   │            │  Common       │             │  Regular      │
  │  Session Mgr  │            │  Course       │             │  Stream       │
  │  (Rules 1, 8) │            │  Matcher      │             │  Harmonizer   │
  │               │            │  (Rules 3, 5) │             │  (Rule 4)     │
  └──────┬────────┘            └──────┬────────┘             └──────┬────────┘
         │                            │                              │
         └────────────────────────────┼──────────────────────────────┘
                                      │
                       ┌──────────────┼───────────────┐
                       │ Step 4                       │ Step 5
                       ▼                               ▼
                ┌──────────────┐                ┌──────────────┐
                │  Agent 5      │                │  Agent 6      │
                │  Spacing &    │                │  Arrear &     │
                │  Difficulty   │──────────────▶ │  Backlog      │
                │  Evaluator    │                │  Scheduler    │
                │  (Rules 6, 9) │                │  (Rule 7)     │
                └──────────────┘                └──────┬────────┘
                                                        │ Step 6
                                                        ▼
                                                 ┌──────────────┐
                                                 │  Agent 2      │
                                                 │  Student      │
                                                 │  Conflict     │
                                                 │  Checker      │
                                                 │  (Rule 2)     │
                                                 └──────┬────────┘
                                                        │
                                        PASS ───────────┴─────────── FAIL
                                          │                            │
                                          ▼                            ▼
                                 Freeze & publish            Route conflict back to
                                 schedule to dashboard        Agent 5 or Agent 6,
                                                               re-run Agent 2 only
                                                               (retry cap ~10-20)
```

### 3.1 Agent specifications

**Agent 1 — Calendar & Session Manager**
- Input: exam window start date, end date, list of leave dates
- Output: ordered list of `{date, session}` open slots (2 sessions/day: FN, AN), leave days excluded
- Logic: generate all dates in range → remove leave dates → create FN/AN session per remaining date

**Agent 2 — Student Conflict Checker** *(final gatekeeper — never skip)*
- Input: full draft timetable + full student enrolment list (incl. arrears)
- Output: `PASS` or a structured conflict list: `{reg_no, course_a, course_b, date, session}`
- Logic: build a lookup of courses per `{date, session}`; for every `reg_no`, check if two of their enrolled courses land on the same slot

**Agent 3 — Common Course Matcher**
- Input: course/enrolment list (course, semester, branch)
- Output: clusters of course codes that must share one session
- Logic: group by course code → list distinct branches per course → if >1 branch, or the course spans odd/even semesters across branches, mark as a shared cluster

**Agent 4 — Regular Stream Harmonizer**
- Input: open slots (Agent 1), course clusters (Agent 3)
- Output: draft timetable with each cluster assigned a `{date, session}`
- Logic: sort clusters by size (largest/most-branches first) → assign the same session across a semester wherever possible → assign earliest open slot, mark slot used

**Agent 5 — Spacing & Difficulty Evaluator**
- Input: draft timetable (Agent 4), course difficulty rating (easy/medium/hard)
- Output: re-spaced timetable — min 1-day gap between regular exams per branch/semester; hard courses placed right after any 2-day gap
- Logic: for each branch+semester, list regular exams in date order → push adjacent-day exams forward until ≥1 day gap → where a 2+ day gap exists, move a hard course there if possible

**Agent 6 — Arrear & Backlog Scheduler**
- Input: spaced timetable (Agent 5), arrear enrolment list
- Output: complete draft including arrear exams
- Logic: for each arrear course, find a day with an existing regular exam → check if the other session is free and doesn't clash with that student's regular exam → assign there; else fall back to any open slot with no clash
- **5-day deadline fallback:** if time is short, skip the "same-day secondary session" optimization and just assign each arrear course to any open slot that doesn't clash with the student's regular exams — still satisfies Rule 7, just less optimal

### 3.2 Central Hub responsibilities

1. Own one shared state object (dict/DB row) — never let agents silently overwrite each other's output.
2. Call agents strictly in this order: **Agent 1 → Agent 3 → Agent 4 → Agent 5 → Agent 6 → Agent 2**.
3. If Agent 2 returns a conflict: route the specific issue back to Agent 5 (regular-exam clash) or Agent 6 (arrear clash), then re-run **only Agent 2** again — do not restart the whole pipeline.
4. Cap retries at ~10–20 loops; beyond that, flag the case for manual review instead of looping forever.

---

## 4. Data Model

Base input fields (as given): **Name, Reg. No, Course, Semester**

| Field | Source | Used by | Notes |
|---|---|---|---|
| Name | Given | Display/audit only | Not used in scheduling logic |
| Reg. No | Given | Agents 2, 6 | Branch usually parseable from a prefix, e.g. `2026CSE001` |
| Course (code + name) | Given | Agents 3, 4, 5, 6 | Primary scheduling key |
| Semester | Given | Agents 3, 4, 5 | Distinguishes regular vs arrear enrolment |
| Branch | Derived | Agents 3, 4 | Parse from Reg. No, or a separate column |
| Course difficulty | New, small addition | Agent 5 | Simple tag: easy / medium / hard, set once per course |
| Is-arrear flag | Derived | Agent 6 | True if course's semester < student's current semester |
| Exam window & leave days | Set per exam cycle | Agent 1 | Entered once per cycle via the dashboard |

### Sample input (`students.json`)
```json
[
  {
    "name": "Alex Smith",
    "reg_no": "2026CSE001",
    "course": "Data Structures",
    "semester": 3
  },
  {
    "name": "Alex Smith",
    "reg_no": "2026CSE001",
    "course": "Engineering Mathematics-I",
    "semester": 1
  },
  {
    "name": "Priya Sharma",
    "reg_no": "2026ECE012",
    "course": "Signals and Systems",
    "semester": 3
  }
]
```

### Standard structured output shape (every agent returns this shape, not prose)
```json
{
  "status": "VALID",
  "scheduled_exam": {
    "course_code": "CS301",
    "date": "2026-11-05",
    "session": "FN",
    "rule_applied": "Rule 9 (2-day gap for difficult paper)"
  }
}
```

---

## 5. Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Core logic | Plain Python 3.10+ | Deterministic, testable, no framework overhead |
| Data handling | `pandas` | CSV/Excel parsing |
| Dashboard | `streamlit` | File upload, buttons, tables in minimal code |
| Storage | CSV/Excel input, SQLite for run history (optional) | Zero setup |
| LLM layer (optional, later) | Any hosted LLM API | Only for messy-input parsing help or plain-English audit explanations — never for date/conflict math |

```bash
pip install pandas streamlit openpyxl
```

Do **not** require `crewai`/`langchain` for the core deliverable. They may be added later purely as an optional wrapper around the same Python functions if a natural-language layer is wanted — the scheduling correctness must never depend on them.

---

## 6. Repository Structure

```
exam-cell-agent/
├── app.py                # Streamlit dashboard
├── data_loader.py         # CSV parsing + derived fields (Branch, Is-arrear)
├── agent1_calendar.py      # Agent 1 — calendar/session grid
├── agent2_conflict.py      # Agent 2 — conflict checker
├── agent3_matcher.py       # Agent 3 — common course matcher
├── agent4_harmonizer.py    # Agent 4 — regular stream harmonizer
├── agent5_spacing.py       # Agent 5 — spacing & difficulty evaluator
├── agent6_arrear.py        # Agent 6 — arrear/backlog scheduler
├── hub.py                  # Central orchestrator hub + retry loop
├── tests/                  # Unit + integration tests (see Section 8)
├── sample_data/
│   └── students.json
├── requirements.txt
└── README.md
```

---

## 7. Code Skeletons

> These are skeletons with the exact logic steps as comments/docstrings. Implement the bodies to match Section 3.1 precisely. Keep every function pure (input in, output out) so it is independently testable.

### `data_loader.py`
```python
import pandas as pd

def load_students(csv_path: str) -> list[dict]:
    """
    1. Read CSV into a DataFrame with columns: name, reg_no, course, semester
    2. Derive 'branch' from reg_no prefix (e.g. '2026CSE001' -> 'CSE')
    3. Derive 'is_arrear' per student: True if this course's semester
       is earlier than the student's current (max) semester
    4. Return a list of clean dict records
    """
    raise NotImplementedError
```

### `agent1_calendar.py`
```python
def build_calendar(start_date: str, end_date: str, leave_days: list[str]) -> list[dict]:
    """
    Rule 1 (max 2 sessions/day), Rule 8 (leave days).
    1. Generate every date between start_date and end_date inclusive
    2. Remove any date present in leave_days
    3. For each remaining date, create two slots: {date, session: 'FN'} and {date, session: 'AN'}
    4. Return the ordered list of open slots
    """
    raise NotImplementedError
```

### `agent3_matcher.py`
```python
def build_course_clusters(enrolments: list[dict]) -> list[dict]:
    """
    Rule 3 (common courses across branches), Rule 5 (odd/even cross-branch courses).
    1. Group enrolment rows by course code
    2. For each course, list distinct branches enrolled
    3. If a course has >1 branch, OR appears in an odd semester for one branch
       and the even-semester equivalent for another, mark as a shared cluster
    4. Return list of clusters: [{course_code, semester(s), branches: [...]}]
    """
    raise NotImplementedError
```

### `agent4_harmonizer.py`
```python
def assign_regular_slots(open_slots: list[dict], clusters: list[dict]) -> list[dict]:
    """
    Rule 4 (regular courses of a semester in same session, all branches).
    1. Sort clusters: largest (most students/branches) first
    2. For each semester, try to reuse the same session across all its
       clusters unless it would break spacing (handled later by Agent 5)
    3. Assign each cluster the earliest open slot consistent with the above;
       mark slot as used
    4. Return draft schedule: [{course_code, date, session, semester, branches}]
    """
    raise NotImplementedError
```

### `agent5_spacing.py`
```python
def apply_spacing_rules(draft_schedule: list[dict], difficulty_map: dict) -> list[dict]:
    """
    Rule 6 (min 1-day gap), Rule 9 (2-day gap before difficult courses).
    1. For each branch+semester, list its regular exams in date order
    2. Walk pairwise: if two consecutive exams are on adjacent days,
       push the later one forward until >=1 day gap; re-check downstream
    3. Wherever a >=2-day gap naturally exists, move a 'hard' course there if possible
    4. Return the updated schedule
    """
    raise NotImplementedError
```

### `agent6_arrear.py`
```python
def schedule_arrears(spaced_schedule: list[dict], arrear_enrolments: list[dict]) -> list[dict]:
    """
    Rule 7 (arrears in the other session of a regular day).
    1. For each arrear course, find days that already host a regular exam
    2. Check the other session of that day: if free, and no student needing
       this arrear also has a regular exam that session, assign it there
    3. If no such day exists, fall back to any open slot with no student clash
       (5-day deadline mode: always use this fallback directly)
    4. Return the complete draft schedule including arrears
    """
    raise NotImplementedError
```

### `agent2_conflict.py`
```python
def check_conflicts(complete_schedule: list[dict], enrolments: list[dict]) -> dict:
    """
    Rule 2 (1 student, max 1 exam per session) — final gatekeeper, never skip.
    1. Build a lookup: {date, session} -> [course codes scheduled there]
    2. Build a lookup: reg_no -> [courses that student is enrolled in]
    3. For each student, check if two of their courses land on the same
       {date, session}. Record any conflict.
    4. Return {"status": "PASS"} or
       {"status": "FAIL", "conflicts": [{reg_no, course_a, course_b, date, session}, ...]}
    """
    raise NotImplementedError
```

### `hub.py`
```python
from data_loader import load_students
from agent1_calendar import build_calendar
from agent3_matcher import build_course_clusters
from agent4_harmonizer import assign_regular_slots
from agent5_spacing import apply_spacing_rules
from agent6_arrear import schedule_arrears
from agent2_conflict import check_conflicts

MAX_RETRIES = 15

def run_pipeline(csv_path, start_date, end_date, leave_days, difficulty_map):
    """
    Central Hub: owns shared state, runs agents in order, retries on conflict.
    1. Load and clean data (data_loader)
    2. Agent 1: build_calendar
    3. Agent 3: build_course_clusters
    4. Agent 4: assign_regular_slots
    5. Agent 5: apply_spacing_rules
    6. Agent 6: schedule_arrears
    7. Agent 2: check_conflicts
    8. If FAIL: route the conflict back to Agent 5 or Agent 6 depending on
       whether it's a regular or arrear clash, re-run only Agent 2, retry
       up to MAX_RETRIES times. If still failing, flag for manual review.
    9. Return the final schedule + audit log
    """
    raise NotImplementedError
```

### `app.py` (Streamlit dashboard)
```python
import streamlit as st
import pandas as pd
from hub import run_pipeline

st.set_page_config(page_title="Exam Cell AI Hub", layout="wide")
st.title("College Exam Cell Timetable Dashboard")

col1, col2 = st.columns([1, 2])

with col1:
    st.subheader("Input")
    file = st.file_uploader("Upload student data (CSV)", type=["csv"])
    start_date = st.date_input("Exam start date")
    end_date = st.date_input("Exam end date")
    leave_days = st.multiselect("Leave days", options=[])  # TODO: populate from calendar
    run_btn = st.button("Generate Timetable", type="primary")

with col2:
    st.subheader("Output")
    if file and run_btn:
        # TODO: call run_pipeline(file, start_date, end_date, leave_days, difficulty_map)
        # TODO: display resulting schedule as a table
        # TODO: display audit log / "0 conflicts found" confirmation
        # TODO: add download_button for CSV/Excel export
        pass
```

---

## 8. Testing Strategy (target: 100% on hard constraints)

Hard constraints (Rule 1, Rule 2) must be **100% correct**, not "99%" — they're checked with exact arithmetic, not fuzzy logic. Soft constraints (Rule 4, Rule 9 — "as far as possible") are measured for how often they're achieved when the calendar allows it.

1. **Unit tests** — each agent function individually, against small hand-built cases with a known correct answer.
2. **Integration test** — full pipeline on a ~30-50 row sample dataset (2-3 branches, a couple of arrear cases). Target: 0 conflicts every run.
3. **Scale test** — synthetic dataset of 200-500 students, 4-6 branches, 10-15% arrears. Target: 0 conflicts; report soft-rule alignment.
4. **Ground-truth benchmark** — 15-20 hand-checked tricky scenarios (student with 3 arrears, course shared by 4 branches, back-to-back hard courses). Must pass 100% before go-live.
5. **Human sign-off** — exam controller reviews and approves a sample generated timetable before real use.

---

## 9. Build Plan (5-Day Deadline Version)

- **Day 1:** Data layer (`data_loader.py`) + Agent 1 + Agent 3. Test by hand on ~20 rows.
- **Day 2:** Agent 4 + Agent 5 (spacing is the trickiest — budget most of the day here).
- **Day 3:** Agent 6 (use the deadline fallback logic) + Agent 2 + `hub.py` with retry loop. Run the full pipeline end-to-end for the first time.
- **Day 4:** `app.py` dashboard (upload, generate button, output table, download button). Run on the real/largest available dataset — fix what breaks.
- **Day 5:** No new features. Bug fixes only. Dry-run the demo.

If Day 3 slips: cut scope on Agent 6 first (use the simplified fallback). Never cut Agent 2 (conflict checking) or the retry loop — those protect the one thing that must never be wrong: a student being double-booked.

---

## 10. How Each Agent Was "Trained" / Configured (for reference, not re-implementation)

No traditional ML training is used. Each agent (if an LLM layer is ever added on top of the deterministic function) is configured via:
1. **Role, goal, and exact rule text** — no ambiguity about what "correct" means.
2. **Few-shot examples** — 3-5 worked input/output pairs from the real sample dataset for any messy-text-parsing sub-task.
3. **Tools, not guesses** — any calculation (date math, slot equality, lookups) is a real Python function call, never LLM-computed.
4. **Forced structured output** — every agent returns the fixed JSON shape from Section 4, never free prose.

If an LLM is used anywhere, keep temperature at 0 — scheduling needs repeatable, not creative, output.

---

## 11. What NOT to Do

- Do not let an LLM compute dates, counts, or session matches directly — always route through a deterministic function.
- Do not skip Agent 2 (Conflict Checker) or the retry loop, even under time pressure.
- Do not restart the whole pipeline on a conflict — only re-run the specific downstream agent + Agent 2.
- Do not publish a generated timetable without human (exam controller) sign-off.
- Do not send real student data to any external LLM API — keep the rule engine local; only use anonymised/synthetic data if an LLM layer is added.

---

## 12. Deliverables Checklist

- [ ] `data_loader.py` with derived Branch + Is-arrear fields, tested on sample data
- [ ] Agents 1, 3, 4, 5, 6, 2 implemented per Section 7 skeletons
- [ ] `hub.py` orchestrating the 6 agents in order with retry loop
- [ ] `app.py` Streamlit dashboard: upload → generate → table → export
- [ ] Unit tests for each agent
- [ ] Integration test on sample dataset showing 0 conflicts
- [ ] Scale test on 200-500 synthetic students
- [ ] README documenting how to run the system
