"""
agent5_spacing.py — Agent 5: Spacing & Difficulty Evaluator
Rules: Rule 1 (min 1-day gap = Mon→Wed, i.e. ≥2 calendar days between exam dates),
       Rule 9 (hard/high-credit courses get 2-day buffer = 3 calendar days gap).

Stats emitted:
  exams_moved, hard_courses_repositioned, final_date_range
"""
from datetime import date, timedelta
from collections import defaultdict
from config import GAP_REGULAR_MIN, GAP_HARD_COURSE, sem_to_year


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
                yr = entry.get("year") or sem_to_year(entry.get("semester", 1))
                for branch in entry["branches"]:
                    groups[(branch, yr)].append(entry)
        return groups

    # Track (branch, date, session) to prevent cross-year same-branch slot collisions
    def build_branch_session_used(sched):
        bsu = set()
        for entry in sched:
            if not entry.get("is_arrear", False):
                for br in entry["branches"]:
                    bsu.add((br, entry["date"], entry["session"]))
        return bsu

    def find_free_date(from_date: date, min_gap: int, branches: list, session: str, sched: list) -> str:
        """Find earliest date >= from_date+min_gap where no branch has an exam in session."""
        bsu = build_branch_session_used(sched)
        candidate = from_date + timedelta(days=min_gap)
        while any((br, candidate.isoformat(), session) in bsu for br in branches):
            candidate += timedelta(days=1)
        return candidate.isoformat()

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

                required = GAP_HARD_COURSE if b["difficulty"] == "hard" else GAP_REGULAR_MIN

                if gap < required:
                    # Temporarily remove b from schedule so find_free_date doesn't block on b's own slot
                    b_code = b["course_code"]
                    b_session = b["session"]
                    b_branches = b["branches"]
                    for entry in schedule:
                        if entry["course_code"] == b_code and not entry.get("is_arrear"):
                            entry["_skip"] = True
                    temp_sched = [e for e in schedule if not e.get("_skip")]
                    new_date = find_free_date(date_a, required, b_branches, b_session, temp_sched)
                    for entry in schedule:
                        entry.pop("_skip", None)
                        if entry["course_code"] == b_code and not entry.get("is_arrear"):
                            entry["date"] = new_date
                    exams_moved += 1
                    changed = True
                    break

    # Rule 9: pull hard courses forward into natural gaps
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
                bsu = build_branch_session_used(schedule)
                for j in range(i + 2, len(exams_sorted)):
                    cand = exams_sorted[j]
                    if cand["difficulty"] == "hard" and cand["date"] > ideal:
                        # Only move if ideal slot is free for all branches
                        if not any((br, ideal, cand["session"]) in bsu for br in cand["branches"]):
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
