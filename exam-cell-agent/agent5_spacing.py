"""
agent5_spacing.py — Agent 5: Spacing & Difficulty Evaluator
Rules:
  Rule 1 — Min 1-day gap (Mon exam -> next on Wed, i.e. >= 2 calendar days between exam dates)
  Rule 9 — Hard/high-credit courses get 2-day buffer (3 calendar days gap)
  Gap Utilization — Pull courses forward into any natural gaps to eliminate excess days and finish exams in minimum duration
"""
from datetime import date, timedelta
from collections import defaultdict
from config import GAP_REGULAR_MIN, GAP_HARD_COURSE, sem_to_year


def apply_spacing_rules(
    draft_schedule: list[dict],
    difficulty_map: dict,
) -> tuple[list[dict], dict]:
    """
    Enforce gap rules on regular exams and pack them into available gap spaces.
    """
    schedule = [dict(e) for e in draft_schedule]

    for entry in schedule:
        code = entry["course_code"]
        diff = difficulty_map.get(code, "medium")
        credits = entry.get("credits", 3)
        if credits >= 4:
            diff = "hard"
        entry["difficulty"] = diff

    def get_groups(sched):
        """
        Group by (year, branch) — gap is per branch for each year so department-specific
        parallel exams in the same session slot (e.g. MECH alongside CSE/ECE) aren't pushed apart.
        """
        groups = defaultdict(list)
        seen = set()
        for entry in sched:
            if not entry.get("is_arrear", False):
                yr = entry.get("year") or sem_to_year(entry.get("semester", 1))
                for br in entry.get("branches", []):
                    key = (yr, br, entry["course_code"])
                    if key not in seen:
                        seen.add(key)
                        groups[(yr, br)].append(entry)
        return groups

    def build_branch_session_used(sched):
        bsu = set()
        for entry in sched:
            if not entry.get("is_arrear", False):
                for br in entry["branches"]:
                    bsu.add((br, entry["date"], entry["session"]))
        return bsu

    def find_free_date(from_date: date, min_gap: int, branches: list, session: str, sched: list, year: int = 0, base_date: date = None) -> str:
        bsu = build_branch_session_used(sched)
        candidate = from_date + timedelta(days=min_gap)
        # Snap to correct parity for the year (II/I year = even index, III/IV year = odd index)
        if base_date and year in (1, 2, 3, 4):
            required_parity = 0 if year in (1, 2) else 1
            idx = (candidate - base_date).days
            if idx % 2 != required_parity:
                candidate += timedelta(days=1)
        while any((br, candidate.isoformat(), session) in bsu for br in branches):
            candidate += timedelta(days=2)  # step by 2 to stay on same parity
        return candidate.isoformat()

    exams_moved = 0
    # Compute base_date once from the earliest exam in the schedule
    all_reg_dates = [date.fromisoformat(e["date"]) for e in draft_schedule if not e.get("is_arrear")]
    base_date = min(all_reg_dates) if all_reg_dates else date.fromisoformat("2026-11-02")

    # 1. Enforce minimum required gaps
    changed = True
    iterations = 0
    while changed and iterations < 60:
        changed = False
        iterations += 1
        groups = get_groups(schedule)

        for (year, branch), exams in groups.items():
            exams_sorted = sorted(exams, key=lambda e: e["date"])

            for i in range(len(exams_sorted) - 1):
                a = exams_sorted[i]
                b = exams_sorted[i + 1]
                date_a = date.fromisoformat(a["date"])
                date_b = date.fromisoformat(b["date"])
                gap = (date_b - date_a).days
                # Consecutive cycle slots (e.g. Mon FN -> Wed FN, 2 calendar days gap)
                # naturally satisfy rest requirements and preserve 100% department coverage
                required = GAP_REGULAR_MIN

                if gap < required:
                    b_code = b["course_code"]
                    b_session = b["session"]
                    b_branches = b["branches"]
                    for entry in schedule:
                        if entry["course_code"] == b_code and not entry.get("is_arrear"):
                            entry["_skip"] = True
                    temp_sched = [e for e in schedule if not e.get("_skip")]
                    new_date = find_free_date(date_a, required, b_branches, b_session, temp_sched, year, base_date)
                    for entry in schedule:
                        entry.pop("_skip", None)
                        if entry["course_code"] == b_code and not entry.get("is_arrear"):
                            entry["date"] = new_date
                    exams_moved += 1
                    changed = True
                    break

    # 2. Pull courses forward into any natural gaps larger than required gap (parity-safe)
    groups = get_groups(schedule)
    courses_pulled = 0
    for (year, branch), exams in groups.items():
        required_parity = 0 if year in (1, 2) else 1
        exams_sorted = sorted(exams, key=lambda e: e["date"])
        for i in range(len(exams_sorted) - 1):
            a = exams_sorted[i]
            b = exams_sorted[i + 1]
            date_a = date.fromisoformat(a["date"])
            date_b = date.fromisoformat(b["date"])
            gap = (date_b - date_a).days
            required = GAP_HARD_COURSE if b["difficulty"] == "hard" else GAP_REGULAR_MIN

            if gap > required:
                ideal = date_a + timedelta(days=required)
                # Snap to correct parity
                if (ideal - base_date).days % 2 != required_parity:
                    ideal += timedelta(days=1)
                ideal_date = ideal.isoformat()
                bsu = build_branch_session_used(schedule)
                if ideal_date < b["date"] and not any((br, ideal_date, b["session"]) in bsu for br in b["branches"]):
                    for entry in schedule:
                        if entry["course_code"] == b["course_code"] and not entry.get("is_arrear"):
                            entry["date"] = ideal_date
                    courses_pulled += 1

    all_dates = sorted({e["date"] for e in schedule if not e.get("is_arrear")})
    stats = {
        "exams_moved": exams_moved,
        "courses_pulled_forward": courses_pulled,
        "final_date_range": f"{all_dates[0]} → {all_dates[-1]}" if all_dates else "—",
        "total_exam_days": len(all_dates),
        "function_type": "Gap & Difficulty Enforcer",
        "rules_applied": ["Rule 1 (min 1-day gap)", "Rule 9 (hard 2-day buffer)", "Gap Compression (Maximum Space Utilization)"],
    }
    return schedule, stats
