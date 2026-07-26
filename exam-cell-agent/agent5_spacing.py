"""
agent5_spacing.py — Agent 5: Spacing & Difficulty Evaluator
Rules: Rule 1 (min 1-day gap = Mon→Wed, i.e. ≥2 calendar days between exam dates),
       Rule 9 (hard/high-credit courses get 2-day buffer = 3 calendar days gap).

Stats emitted:
  exams_moved, hard_courses_repositioned, final_date_range
"""
from datetime import date, timedelta
from collections import defaultdict
from config import GAP_REGULAR_MIN, GAP_HARD_COURSE


def _push_date(from_date: date, min_gap: int, blocked: set[str]) -> str:
    """Return earliest date >= from_date + min_gap not in blocked."""
    candidate = from_date + timedelta(days=min_gap)
    while candidate.isoformat() in blocked:
        candidate += timedelta(days=1)
    return candidate.isoformat()


def apply_spacing_rules(
    draft_schedule: list[dict],
    difficulty_map: dict,
) -> tuple[list[dict], dict]:
    """
    Enforce gap rules on regular exams.

    Rule 1: consecutive exams for the same branch+year must be ≥ GAP_REGULAR_MIN
            calendar days apart (default 2 → Mon exam, next on Wed).
    Rule 9: if a course is 'hard' OR credits >= 4, enforce GAP_HARD_COURSE (default 3).

    Returns:
        (spaced_schedule, stats)
    """
    schedule = [dict(e) for e in draft_schedule]

    for entry in schedule:
        code = entry["course_code"]
        diff = difficulty_map.get(code, "medium")
        credits = entry.get("credits", 3)
        # High-credit courses treated as hard
        if credits >= 4:
            diff = "hard"
        entry["difficulty"] = diff

    def get_groups(sched):
        groups = defaultdict(list)
        for entry in sched:
            if not entry.get("is_arrear", False):
                for branch in entry["branches"]:
                    groups[(branch, entry["year"])].append(entry)
        return groups

    used_dates = {e["date"] for e in schedule}
    exams_moved = 0

    changed = True
    iterations = 0
    while changed and iterations < 60:
        changed = False
        iterations += 1
        groups = get_groups(schedule)

        for (branch, year), exams in groups.items():
            exams_sorted = sorted(exams, key=lambda e: e["date"])

            for i in range(len(exams_sorted) - 1):
                a = exams_sorted[i]
                b = exams_sorted[i + 1]
                date_a = date.fromisoformat(a["date"])
                date_b = date.fromisoformat(b["date"])
                gap = (date_b - date_a).days

                # Determine required gap for exam b
                required = GAP_HARD_COURSE if b["difficulty"] == "hard" else GAP_REGULAR_MIN

                if gap < required:
                    new_date = _push_date(date_a, required, used_dates - {b["date"]})
                    used_dates.discard(b["date"])
                    used_dates.add(new_date)
                    for entry in schedule:
                        if entry["course_code"] == b["course_code"] and not entry.get("is_arrear"):
                            entry["date"] = new_date
                    exams_moved += 1
                    changed = True
                    break

    # Rule 9: if a natural ≥ GAP_HARD_COURSE gap exists, pull hard courses forward into it
    groups = get_groups(schedule)
    hard_repositioned = 0
    for (branch, year), exams in groups.items():
        exams_sorted = sorted(exams, key=lambda e: e["date"])
        for i in range(len(exams_sorted) - 1):
            a = exams_sorted[i]
            b = exams_sorted[i + 1]
            date_a = date.fromisoformat(a["date"])
            date_b = date.fromisoformat(b["date"])
            gap = (date_b - date_a).days

            if gap > GAP_HARD_COURSE:
                ideal = (date_a + timedelta(days=GAP_HARD_COURSE)).isoformat()
                for j in range(i + 2, len(exams_sorted)):
                    cand = exams_sorted[j]
                    if cand["difficulty"] == "hard" and cand["date"] > ideal:
                        used_dates.discard(cand["date"])
                        used_dates.add(ideal)
                        for entry in schedule:
                            if entry["course_code"] == cand["course_code"] and not entry.get("is_arrear"):
                                entry["date"] = ideal
                        hard_repositioned += 1
                        break

    all_dates = sorted({e["date"] for e in schedule if not e.get("is_arrear")})
    stats = {
        "exams_moved": exams_moved,
        "hard_courses_repositioned": hard_repositioned,
        "final_date_range": f"{all_dates[0]} → {all_dates[-1]}" if all_dates else "—",
        "total_exam_days": len(all_dates),
        "function_type": "Gap & Difficulty Enforcer",
        "rules_applied": ["Rule 1 (min 1-day gap = Mon→Wed)", "Rule 9 (hard/high-credit 2-day buffer)"],
    }
    return schedule, stats
