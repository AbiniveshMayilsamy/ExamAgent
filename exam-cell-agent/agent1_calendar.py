"""
agent1_calendar.py — Agent 1: Calendar & Session Manager
Rules: Rule 1 (max 2 sessions/day), Rule 4 (FN/AN timings), Rule 5 (leave days excluded),
       Rule 10 (year-wise session pattern).

Stats emitted:
  total_days, exam_days, total_slots, leave_days_excluded
"""
from datetime import date, timedelta
from config import SESSION_TIMINGS, DEFAULT_YEAR_SESSION_PATTERN, sem_to_year


def build_calendar(
    start_date: str,
    end_date: str,
    leave_days: list[str],
    year_session_pattern: dict[int, str] | None = None,
) -> tuple[list[dict], dict]:
    """
    Build the open slot grid for the exam window.

    Returns:
        (slots, stats)
        slots: [{date, session, time, preferred_years: [1,2,3,4]}, ...]
        stats: {total_days, exam_days, total_slots, leave_days_excluded}
    """
    pattern = year_session_pattern or DEFAULT_YEAR_SESSION_PATTERN
    leave_set = set(leave_days)

    slots: list[dict] = []
    total_days = 0
    exam_days = 0

    current = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)

    while current <= end:
        total_days += 1
        date_str = current.isoformat()
        if date_str not in leave_set:
            exam_days += 1
            for session in ("FN", "AN"):
                # Which years prefer this session on this day?
                preferred_years = [yr for yr, pref in pattern.items() if pref == session]
                slots.append({
                    "date": date_str,
                    "session": session,
                    "time": SESSION_TIMINGS[session],
                    "preferred_years": preferred_years,
                })
        current += timedelta(days=1)

    stats = {
        "total_days": total_days,
        "exam_days": exam_days,
        "total_slots": len(slots),
        "leave_days_excluded": len(leave_set),
        "function_type": "Calendar Builder",
        "rules_applied": ["Rule 1 (max 2 sessions/day)", "Rule 4 (FN/AN timings)", "Rule 5 (leave days)", "Rule 10 (year-session pattern)"],
    }
    return slots, stats
