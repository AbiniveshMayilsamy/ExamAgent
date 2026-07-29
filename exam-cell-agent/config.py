"""
config.py — Shared configuration constants for the exam scheduling pipeline.
All rule-driven parameters live here so agents stay stateless.
"""

# Rule 4 — Exam session timings
SESSION_TIMINGS = {
    "FN": "9:30 AM – 12:30 PM",
    "AN": "1:30 PM – 4:30 PM",
}

# Rule 10 — Default year-wise session pattern
# Regular exams default to Morning (FN), Arrears default to Evening (AN)
DEFAULT_YEAR_SESSION_PATTERN = {
    1: "FN",   # 1st year → morning
    2: "FN",   # 2nd year → morning
    3: "FN",   # 3rd year → morning
    4: "FN",   # 4th year → morning
}

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
