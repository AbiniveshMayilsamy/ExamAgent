"""
config.py — Shared scheduling rules for the exam-cell-agent pipeline.

This replaces the vague "Year-Alternating FN/AN" prose description with an
EXPLICIT, machine-checkable rotation, matched against the real reference
master schedule (Year_Wise_Color_Consolidated_Master_Schedule).

Nothing here changes the 7-agent architecture or the original 9 rules in
exam-scheduling-agent-brief.md — this only makes Rule 3/4/7's "as far as
possible" language concrete enough for a deterministic agent to follow
without guessing.
"""

from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# 1. Semester rotation cycle
# ---------------------------------------------------------------------------
# One semester gets ONE session slot (FN or AN) at a time, in this fixed
# order. After Sem 7's slot, the cycle restarts at Sem 3. This matches the
# reference file:
#   02.11.26 FN  -> Sem 3 (II yr)
#   02.11.26 AN  -> Sem 5 (III yr)
#   03.11.26 FN  -> Sem 7 (IV yr)
#   03.11.26 AN  -> arrear sweep (see below)
#   05.11.26 FN  -> Sem 3 again ... etc.
SEMESTER_SESSION_CYCLE = [
    {"semester": 3, "year_label": "II"},
    {"semester": 5, "year_label": "III"},
    {"semester": 7, "year_label": "IV"},
]

# ---------------------------------------------------------------------------
# 2. Arrear sweep — dedicated session after each full cycle
# ---------------------------------------------------------------------------
# "after_each_full_cycle": once every semester in SEMESTER_SESSION_CYCLE has
#   used one session, the NEXT open session is reserved purely for arrear
#   courses that don't share a common slot with any regular course this
#   round ("uncommon arrears") — no semester tag on this session.
# "none": disable — arrears only ride along in the secondary session of a
#   regular exam day (original Rule 7 behaviour, no dedicated sweep).
ARREAR_SWEEP_RULE = "after_each_full_cycle"

# ---------------------------------------------------------------------------
# 3. Gap-fill policy
# ---------------------------------------------------------------------------
# What happens to a branch that has NO shared course in a given regular
# session (e.g. MECH when everyone else is writing a CSE-owned elective)?
#
#   "always"       -> that branch MUST get something in this slot: its own
#                     branch-specific regular course due this round, or an
#                     arrear due for its students. Only leave "-" if neither
#                     exists (should be rare with good data).
#   "opportunistic"-> leave "-" unless an arrear/branch course happens to
#                     already be scheduled there. This matches the observed
#                     (inconsistent) behaviour in the human-made reference
#                     file — kept here only for exact-replication testing.
#
# Recommendation: use "always" for real generation; use "opportunistic"
# only when validating output bit-for-bit against the old manual file.
GAP_FILL_POLICY = "always"

# ---------------------------------------------------------------------------
# 4. Misc session constants (unchanged from original Rule 1/8)
# ---------------------------------------------------------------------------
SESSIONS_PER_DAY = ["FN", "AN"]
MAX_SESSIONS_PER_DAY = 2

# Course difficulty tiers used by Agent 5 (Rule 9) — unchanged.
DIFFICULTY_LEVELS = ["easy", "medium", "hard"]

# ---------------------------------------------------------------------------
# 5. Retained constants (used by Agent 1, 5, 6)
# ---------------------------------------------------------------------------
SESSION_TIMINGS = {
    "FN": "9:30 AM – 12:30 PM",
    "AN": "1:30 PM – 4:30 PM",
}

SCHEDULE_WINDOWS = {
    "odd":  {"month_start": 11, "month_end": 12},
    "even": {"month_start": 4,  "month_end": 5},
}

GAP_REGULAR_MIN = 2
GAP_HARD_COURSE = 3
ARREAR_MAX_PER_DAY = 2

# Legacy alias — fallback only; primary logic uses SEMESTER_SESSION_CYCLE.
DEFAULT_YEAR_SESSION_PATTERN = {
    1: "FN",
    2: "AN",
    3: "FN",
    4: "AN",
}


PATTERN_ALTERNATING = "alternating"
PATTERN_SEMESTER_WISE = "semester_wise"


def sem_to_year(semester: int) -> int:
    return (semester + 1) // 2


# ---------------------------------------------------------------------------
# 6. ScheduleConfig dataclass
# ---------------------------------------------------------------------------
@dataclass
class ScheduleConfig:
    """Bundle of scheduling parameters — pass this around / override in tests
    instead of importing module-level globals everywhere."""
    semester_cycle: list = field(default_factory=lambda: SEMESTER_SESSION_CYCLE)
    arrear_sweep_rule: str = ARREAR_SWEEP_RULE
    gap_fill_policy: str = GAP_FILL_POLICY
    sessions_per_day: list = field(default_factory=lambda: SESSIONS_PER_DAY)
    pattern_type: str = PATTERN_ALTERNATING

