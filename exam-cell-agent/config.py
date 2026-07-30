"""
config.py — Shared configuration constants for the exam scheduling pipeline.
All rule-driven parameters live here so agents stay stateless.
"""

# Rule 4 — Exam session timings
SESSION_TIMINGS = {
    "FN": "9:30 AM – 12:30 PM",
    "AN": "1:30 PM – 4:30 PM",
}

# Rule 10 — Optimized year-wise session pattern
# Accommodates regular exams in both FN (Morning) and AN (Evening) to conclude exams in minimum days
DEFAULT_YEAR_SESSION_PATTERN = {
    1: "FN",   # 1st year → morning
    2: "AN",   # 2nd year → evening
    3: "FN",   # 3rd year → morning
    4: "AN",   # 4th year → evening
}

# Consecutive 4-slot alternating session pattern (Day 1 FN: Sem 3, Day 1 AN: Sem 5, Day 2 FN: Sem 7, Day 2 AN: Arrears)
CONSECUTIVE_4SLOT_ROTATION = [
    {"session": "FN", "target_sem": 3, "label": "3rd Sem Regular (Morning)"},
    {"session": "AN", "target_sem": 5, "label": "5th Sem Regular (Afternoon)"},
    {"session": "FN", "target_sem": 7, "label": "7th Sem Regular (Morning)"},
    {"session": "AN", "target_sem": "arrear", "label": "Arrear & Backlog Exams (Afternoon)"},
]

# Rule 3 — Schedule window defaults
SCHEDULE_WINDOWS = {
    "odd":  {"month_start": 11, "month_end": 12},   # Nov–Dec
    "even": {"month_start": 4,  "month_end": 5},    # Apr–May
}

# Rule 9 — Gap rules (calendar days between exam dates)
GAP_REGULAR_MIN = 2        # Mon exam → next on Wed (gap of 2 calendar days)
GAP_HARD_COURSE = 3        # Hard course needs 3-day gap (2 free days before it)

# Rule 2 — Arrear packing: max arrear exams per day (FN + AN = 2 slots)
ARREAR_MAX_PER_DAY = 2

# Semester → year mapping
def sem_to_year(semester: int) -> int:
    return (semester + 1) // 2
