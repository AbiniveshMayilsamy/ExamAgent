"""
agent1_calendar.py — Agent 1: Calendar & Session Manager.
Rules: Rule 1 (max 2 sessions/day), Rule 4 (FN/AN timings), Rule 8 (leave days excluded),
       Auto end-date extension if needed.

Slot tagging (ground-truth cycle from SEMESTER_SESSION_CYCLE):
  Slots are tagged in calendar order with a 4-position cycle:
    Position 0 → Sem 3 (II yr) regular
    Position 1 → Sem 5 (III yr) regular
    Position 2 → Sem 7 (IV yr) regular
    Position 3 → Arrear-only sweep session (no regular semester tag)
  The FN/AN assignment of a slot is purely its calendar position within a day;
  Agent 4 walks slots in order and maps each cycle position to a semester.
  No semester is hardwired to a specific time-of-day here.
"""
from datetime import date, timedelta
from config import (
    SESSION_TIMINGS,
    DEFAULT_YEAR_SESSION_PATTERN,
    SEMESTER_SESSION_CYCLE,
)

# The full 4-position rotation: 3 regular semesters + 1 arrear sweep.
_CYCLE_LENGTH = len(SEMESTER_SESSION_CYCLE) + 1  # = 4

def _cycle_tag(slot_index: int) -> dict:
    """
    Return the cycle metadata for a given slot index.
    Positions 0-2 map to SEMESTER_SESSION_CYCLE entries.
    Position 3 is the dedicated arrear-sweep session.
    """
    pos = slot_index % _CYCLE_LENGTH
    if pos < len(SEMESTER_SESSION_CYCLE):
        entry = SEMESTER_SESSION_CYCLE[pos]
        return {
            "target_sem": entry["semester"],
            "year_label": entry["year_label"],
            "cycle_position": pos,
            "rotation_label": f"Sem {entry['semester']} Regular ({entry['year_label']} yr)",
            "is_arrear_sweep": False,
        }
    else:
        return {
            "target_sem": "arrear",
            "year_label": "Arrear",
            "cycle_position": pos,
            "rotation_label": "Arrear-Only Sweep Session",
            "is_arrear_sweep": True,
        }


def build_calendar(
    start_date: str,
    end_date: str = None,
    leave_days: list[str] = None,
    year_session_pattern: dict = None,
    estimated_days: int = 15,
    pattern_type: str = "alternating",
) -> tuple[list[dict], dict]:
    """
    Build the open slot grid for the exam window.
    If end_date is None, auto-calculates from start_date + estimated_days (excluding leave days).

    Supports two pattern types:
      - "alternating": Ground-truth cycle rotation (Sem3 -> Sem5 -> Sem7 -> Arrear sweep)
      - "semester_wise": Daily semester-dedicated pattern (Day 1: Sem 3 FN regular & Sem 3 AN arrear, Day 2: Sem 5 FN & AN arrear, etc.)

    Each slot is tagged with:
      - date, session (FN/AN), time
      - target_sem: the semester number (3/5/7) or "arrear" (for sweep sessions)
      - cycle_position: position within cycle
      - rotation_label: human-readable label
      - is_arrear_sweep: True for arrear sweep sessions
    """
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
        end = tmp + timedelta(days=5)  # buffer

    cycle_entries = SEMESTER_SESSION_CYCLE

    while current <= end:
        total_days += 1
        date_str = current.isoformat()
        if date_str not in leave_set:
            exam_days += 1
            day_idx = exam_days - 1
            
            for session in ("FN", "AN"):
                slot_idx = len(slots)
                
                if pattern_type == "semester_wise":
                    active_entry = cycle_entries[day_idx % len(cycle_entries)]
                    t_sem = active_entry["semester"]
                    y_lbl = active_entry["year_label"]
                    
                    if session == "FN":
                        tag = {
                            "target_sem": t_sem,
                            "year_label": y_lbl,
                            "cycle_position": day_idx % len(cycle_entries),
                            "rotation_label": f"Sem {t_sem} Regular Day (FN)",
                            "is_arrear_sweep": False,
                        }
                    else:
                        tag = {
                            "target_sem": t_sem,
                            "year_label": f"{y_lbl} Arrear",
                            "cycle_position": day_idx % len(cycle_entries),
                            "rotation_label": f"Sem {t_sem} Evening Arrear Session (AN)",
                            "is_arrear_sweep": True,
                        }
                else:
                    tag = _cycle_tag(slot_idx)

                slots.append({
                    "date": date_str,
                    "session": session,
                    "time": SESSION_TIMINGS[session],
                    "slot_index": slot_idx,
                    # Ground-truth cycle tagging:
                    "target_sem": tag["target_sem"],
                    "year_label": tag["year_label"],
                    "cycle_position": tag["cycle_position"],
                    "rotation_label": tag["rotation_label"],
                    "is_arrear_sweep": tag["is_arrear_sweep"],
                })
        current += timedelta(days=1)

    rules_desc = [
        "Rule 1 (max 2 sessions/day)",
        "Rule 4 (FN/AN timings)",
        "Rule 8 (leave days)",
    ]
    if pattern_type == "semester_wise":
        rules_desc.append("PATTERN: Semester-Wise Daily Pattern (Day 1: Sem3 FN/AN, Day 2: Sem5 FN/AN, Day 3: Sem7 FN/AN)")
    else:
        rules_desc.append("SEMESTER_SESSION_CYCLE: Sem3→Sem5→Sem7→Arrear (ground-truth rotation)")

    stats = {
        "total_days": total_days,
        "exam_days": exam_days,
        "total_slots": len(slots),
        "leave_days_excluded": len(leave_set),
        "start_date": start_date,
        "end_date": end.isoformat(),
        "pattern_type": pattern_type,
        "function_type": "Calendar Builder",
        "rules_applied": rules_desc,
    }
    return slots, stats

