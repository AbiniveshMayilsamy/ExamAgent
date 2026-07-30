"""
agent1_calendar.py — Agent 1: Calendar & Session Manager.
Rules: Rule 1 (max 2 sessions/day), Rule 4 (FN/AN timings), Rule 8 (leave days excluded),
       Auto end-date extension if needed.
"""
from datetime import date, timedelta
from config import SESSION_TIMINGS, DEFAULT_YEAR_SESSION_PATTERN, CONSECUTIVE_4SLOT_ROTATION

def build_calendar(
    start_date: str,
    end_date: str = None,
    leave_days: list[str] = None,
    year_session_pattern: dict = None,
    estimated_days: int = 15,
) -> tuple[list[dict], dict]:
    """
    Build the open slot grid for the exam window.
    If end_date is None, auto-calculates from start_date + estimated_days (excluding leave days).
    """
    pattern = year_session_pattern or DEFAULT_YEAR_SESSION_PATTERN
    leave_set = set(leave_days or [])

    slots: list[dict] = []
    total_days = 0
    exam_days = 0

    current = date.fromisoformat(start_date)
    
    if end_date:
        end = date.fromisoformat(end_date)
    else:
        # Auto-compute end date ensuring at least estimated_days of actual exam days
        count = 0
        tmp = current
        while count < estimated_days:
            if tmp.isoformat() not in leave_set:
                count += 1
            tmp += timedelta(days=1)
        end = tmp + timedelta(days=5) # buffer

    while current <= end:
        total_days += 1
        date_str = current.isoformat()
        if date_str not in leave_set:
            exam_days += 1
            for session in ("FN", "AN"):
                slot_idx = len(slots)
                rot_info = CONSECUTIVE_4SLOT_ROTATION[slot_idx % 4]
                preferred_years = [yr for yr, pref in pattern.items() if pref == session]
                slots.append({
                    "date": date_str,
                    "session": session,
                    "time": SESSION_TIMINGS[session],
                    "preferred_years": preferred_years,
                    "slot_index": slot_idx,
                    "target_sem": rot_info["target_sem"],
                    "rotation_label": rot_info["label"],
                })
        current += timedelta(days=1)

    stats = {
        "total_days": total_days,
        "exam_days": exam_days,
        "total_slots": len(slots),
        "leave_days_excluded": len(leave_set),
        "start_date": start_date,
        "end_date": end.isoformat(),
        "function_type": "Calendar Builder",
        "rules_applied": ["Rule 1 (max 2 sessions/day)", "Rule 4 (FN/AN timings)", "Rule 8 (leave days)"],
    }
    return slots, stats
