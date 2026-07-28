"""
agent4_harmonizer.py — Agent 4: Regular Stream Harmonizer
Rules: Rule 4 (session slot placement), Rule 11 (common exams → exact same session).

Key responsibilities:
- Place shared multi-branch courses in the EXACT same date+session for all branches.
- Respect preferred session per year (Rule 4).
- Ensure a branch never has two exams in the same session.
"""
from collections import defaultdict
from config import DEFAULT_YEAR_SESSION_PATTERN, SESSION_TIMINGS, sem_to_year


def assign_regular_slots(
    clusters: list[dict],
    open_slots: list[dict],
    year_session_pattern: dict | None = None,
    dept_roll_ranges: dict | None = None,
) -> tuple[list[dict], dict]:
    """
    Assign open date+session slots to regular course clusters.

    Args:
        clusters: output from agent3_matcher (or enriched with 'year')
        open_slots: output from agent1_calendar
        year_session_pattern: {year: "FN"|"AN"}
        dept_roll_ranges: {branch: {semester: "24CS001–24CS320"}}

    Returns:
        (draft, stats)
    """
    pattern = year_session_pattern or DEFAULT_YEAR_SESSION_PATTERN
    used_branch_session: set[tuple] = set()
    used_slots: set[tuple] = set()           # (date, session) used globally
    year_date_used: dict[int, set] = set()      # year -> set of dates used

    # Ensure all clusters have year set from semesters
    for c in clusters:
        if "semesters" in c and c["semesters"]:
            sem = min(c["semesters"])
            c["semester"] = sem
            c["year"] = sem_to_year(sem)
        else:
            c["semester"] = c.get("semester", 1)
            c["year"] = sem_to_year(c["semester"])
        if "is_shared" not in c:
            c["is_shared"] = len(c.get("branches", [])) > 1

    # Sort: shared first, then credits desc, then year asc
    sorted_clusters = sorted(
        clusters,
        key=lambda c: (not c.get("is_shared", False), -c.get("credits", 3), c.get("year", 2), min(c.get("semesters") or {1}))
    )

    draft: list[dict] = []
    unassigned: list[str] = []

    for cluster in sorted_clusters:
        year = cluster.get("year", 2)
        sems = cluster.get("semesters") or {cluster.get("semester", 1)}
        sem = min(sems)
        preferred_session = pattern.get(year)

        assigned = False
        # Two-pass: preferred session first, then any free slot
        for prefer_only in (True, False):
            for slot in open_slots:
                d = slot["date"]
                sess = slot["session"]

                if prefer_only and preferred_session and sess != preferred_session:
                    continue

                # Check if ANY branch in this cluster already has an exam at (branch, d, sess)
                branch_clash = any(
                    (b, d, sess) in used_branch_session
                    for b in cluster.get("branches", [])
                )
                if branch_clash:
                    continue

                # Slot is free for all branches in this cluster — assign it
                for b in cluster.get("branches", []):
                    used_branch_session.add((b, d, sess))
                used_slots.add((d, sess))

                roll_ranges = {}
                if dept_roll_ranges:
                    for b in cluster.get("branches", []):
                        rr = dept_roll_ranges.get(b, {}).get(sem, "")
                        if rr:
                            roll_ranges[b] = rr

                draft.append({
                    "course_code": cluster["course_code"],
                    "course_name": cluster["course_name"],
                    "date": d,
                    "session": sess,
                    "time": SESSION_TIMINGS[sess],
                    "semester": sem,
                    "year": year,
                    "branches": sorted(list(cluster.get("branches", []))),
                    "is_shared": cluster.get("is_shared", False),
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
        "regular_courses_assigned": len(draft),
        "unassigned_courses": len(unassigned),
        "unassigned_list": unassigned,
        "total_slots_used": len(used_slots),
        "function_type": "Slot Harmonizer",
        "rules_applied": ["Rule 4 (session slot placement)", "Rule 11 (common course exact session)"],
    }
    return draft, stats
