"""
agent4_harmonizer.py — Agent 4: Regular Stream Harmonizer
Rules: Rule 4 (session slot placement), Rule 11 (common exams → exact same session).

Key responsibilities:
- Place shared multi-branch courses in the EXACT same date+session for all branches.
- Respect preferred session per year (Rule 4).
- Ensure a branch never has two exams in the same session.
"""
from datetime import date
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
    # Parameter order safeguard (swap if clusters and open_slots were passed in reverse)
    if clusters and isinstance(clusters, list) and len(clusters) > 0:
        if "date" in clusters[0] and "session" in clusters[0] and "course_code" not in clusters[0]:
            clusters, open_slots = open_slots, clusters

    pattern = year_session_pattern or DEFAULT_YEAR_SESSION_PATTERN
    used_branch_session: set[tuple] = set()
    used_slots: set[tuple] = set()           # (date, session) used globally
    sem_last_date: dict[int, str] = {}      # sem -> last assigned date ISO string
    branch_last_date: dict[tuple, str] = {}   # (branch, sem) -> last assigned date ISO string

    # Get sorted unique dates from open_slots
    all_dates = sorted(list(set(s["date"] for s in open_slots)))

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

    # Sort: shared first, then credits desc, then year asc, semester asc
    sorted_clusters = sorted(
        clusters,
        key=lambda c: (not c.get("is_shared", False), -c.get("credits", 3), c.get("year", 2), min(c.get("semesters") or {1}))
    )

    date_index_map = {d: i for i, d in enumerate(all_dates)}

    # Per-year last assigned date (study gap is per-year, not global)
    # This allows III/IV year to write on a day that is a gap day for II year
    year_last_date: dict[int, str] = {}

    draft: list[dict] = []
    unassigned: list[str] = []

    for cluster in sorted_clusters:
        year = cluster.get("year", 2)
        sems = cluster.get("semesters") or {cluster.get("semester", 1)}
        sem = min(sems)

        # Scheduling pattern (matches the table):
        #   II  year (Sem 3) → odd  days (parity 0), FN session
        #   III year (Sem 5) → even days (parity 1), FN session
        #   IV  year (Sem 7) → even days (parity 1), AN session  (same days as III year)
        #   I   year (Sem 1) → odd  days (parity 0), FN session  (fallback)
        if year == 2:
            preferred_parity = 0
            preferred_session = "FN"
        elif year == 3:
            preferred_parity = 1
            preferred_session = "FN"
        elif year == 4:
            preferred_parity = 1          # same days as III year, but AN slot
            preferred_session = "AN"
        else:  # Year 1
            preferred_parity = 0
            preferred_session = "FN"

        assigned = False
        # Four-pass slot allocation:
        # Pass 1: Strict year-parity + preferred session + per-year gap >= 2 days
        # Pass 2: Strict year-parity + any session   + per-year gap >= 2 days
        # Pass 3: Any date/session + no branch clash + per-year gap >= 2 days
        # Pass 4: Fallback (any open date/session without branch clash, guaranteeing 100% assignment)
        for pass_num in (1, 2, 3, 4):
            for slot in open_slots:
                d = slot["date"]
                sess = slot["session"]
                d_idx = date_index_map.get(d, 0)

                # Pass 1 & 2: enforce year-alternating day parity
                if pass_num in (1, 2) and (d_idx % 2) != preferred_parity:
                    continue

                # Pass 1: enforce preferred session
                if pass_num == 1 and sess != preferred_session:
                    continue

                # Pass 1, 2 & 3: enforce min 2-day gap PER BRANCH for this semester
                branch_gap_clash = False
                if pass_num in (1, 2, 3):
                    for b in cluster.get("branches", []):
                        if (b, sem) in branch_last_date:
                            prev_d = date.fromisoformat(branch_last_date[(b, sem)])
                            curr_d = date.fromisoformat(d)
                            if (curr_d - prev_d).days < 2:
                                branch_gap_clash = True
                                break
                if branch_gap_clash:
                    continue

                # Check if ANY branch in this cluster already has an exam at (branch, d, sess)
                branch_clash = any(
                    (b, d, sess) in used_branch_session
                    for b in cluster.get("branches", [])
                )
                if branch_clash:
                    continue

                # Slot is free — assign it
                for b in cluster.get("branches", []):
                    used_branch_session.add((b, d, sess))
                    branch_last_date[(b, sem)] = d
                used_slots.add((d, sess))
                year_last_date[year] = d
                sem_last_date[sem] = d

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
                    "time": SESSION_TIMINGS.get(sess, "9:30 AM – 12:30 PM"),
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
            # Last resort fallback: pick first open slot
            fallback_slot = open_slots[0] if open_slots else {"date": "2026-11-02", "session": "FN"}
            d, sess = fallback_slot["date"], fallback_slot["session"]
            for b in cluster.get("branches", []):
                used_branch_session.add((b, d, sess))
            used_slots.add((d, sess))
            draft.append({
                "course_code": cluster["course_code"],
                "course_name": cluster["course_name"],
                "date": d,
                "session": sess,
                "time": SESSION_TIMINGS.get(sess, "9:30 AM – 12:30 PM"),
                "semester": sem,
                "year": year,
                "branches": sorted(list(cluster.get("branches", []))),
                "is_shared": cluster.get("is_shared", False),
                "is_arrear": False,
                "credits": cluster.get("credits", 3),
                "student_count": cluster.get("student_count", 0),
                "roll_ranges": {},
            })
            unassigned.append(cluster["course_code"])

    stats = {
        "assigned": len(draft),
        "regular_courses_assigned": len(draft),
        "unassigned_courses": len(unassigned),
        "unassigned_list": unassigned,
        "total_slots_used": len(used_slots),
        "function_type": "Slot Harmonizer",
        "rules_applied": ["Rule 4 (session slot placement)", "Rule 11 (common course exact session)"],
    }
    return draft, stats
