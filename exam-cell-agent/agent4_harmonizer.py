"""
agent4_harmonizer.py — Agent 4: Regular Stream Harmonizer
Rules: Rule 4 (same session per semester across branches), Rule 10 (year-wise session pattern),
       Rule 11 (shared/common courses → same session, max accommodation), Rule 9 (credit priority).

Stats emitted:
  assigned, unassigned, shared_assigned, slots_used
"""
from config import DEFAULT_YEAR_SESSION_PATTERN


def assign_regular_slots(
    open_slots: list[dict],
    clusters: list[dict],
    year_session_pattern: dict[int, str] | None = None,
    dept_roll_ranges: dict | None = None,
) -> tuple[list[dict], dict]:
    """
    Assign each course cluster to a unique (date, session) slot.

    Priority order:
      1. Shared (multi-branch) courses first — Rule 11
      2. Higher credits first — Rule 9
      3. Within a year, prefer the configured session — Rule 10
      4. Strict one course per slot — Rule 4

    Args:
        open_slots: from agent1, each has {date, session, time, preferred_years}
        clusters: from agent3
        year_session_pattern: {year: "FN"|"AN"}
        dept_roll_ranges: {branch: {semester: "24CS001–24CS320"}}

    Returns:
        (draft, stats)
    """
    pattern = year_session_pattern or DEFAULT_YEAR_SESSION_PATTERN
    used_slots: set[tuple] = set()          # (date, session) already taken
    year_date_used: dict[int, set] = {}     # year -> set of dates used (for gap enforcement)

    # Sort: shared first, then credits desc, then year asc
    sorted_clusters = sorted(
        clusters,
        key=lambda c: (not c["is_shared"], -c.get("credits", 3), c["year"], min(c["semesters"]))
    )

    draft: list[dict] = []
    unassigned: list[str] = []

    for cluster in sorted_clusters:
        year = cluster["year"]
        preferred_session = pattern.get(year)

        assigned = False
        # Two-pass: preferred session first, then any free slot
        for prefer_only in (True, False):
            for slot in open_slots:
                slot_key = (slot["date"], slot["session"])
                if slot_key in used_slots:
                    continue
                if prefer_only and preferred_session and slot["session"] != preferred_session:
                    continue

                used_slots.add(slot_key)
                if year not in year_date_used:
                    year_date_used[year] = set()
                year_date_used[year].add(slot["date"])

                # Build dept-wise roll ranges for this cluster
                roll_ranges = {}
                if dept_roll_ranges:
                    sem = min(cluster["semesters"])
                    for branch in cluster["branches"]:
                        rr = dept_roll_ranges.get(branch, {}).get(sem, "")
                        if rr:
                            roll_ranges[branch] = rr

                draft.append({
                    "course_code": cluster["course_code"],
                    "course_name": cluster["course_name"],
                    "date": slot["date"],
                    "session": slot["session"],
                    "time": slot["time"],
                    "semester": min(cluster["semesters"]),
                    "year": year,
                    "branches": cluster["branches"],
                    "is_shared": cluster["is_shared"],
                    "is_arrear": False,
                    "credits": cluster.get("credits", 3),
                    "student_count": cluster.get("student_count", 0),
                    "roll_ranges": roll_ranges,
                })
                assigned = True
                break
            if assigned:
                break

        if not assigned:
            unassigned.append(cluster["course_code"])

    stats = {
        "assigned": len(draft),
        "unassigned": len(unassigned),
        "unassigned_courses": unassigned,
        "shared_assigned": len([e for e in draft if e["is_shared"]]),
        "slots_used": len(used_slots),
        "function_type": "Slot Harmonizer",
        "rules_applied": ["Rule 4 (same session per semester)", "Rule 9 (credit priority)", "Rule 10 (year-session pattern)", "Rule 11 (shared courses)"],
    }
    return draft, stats
