"""
agent3_matcher.py — Agent 3: Common Course Matcher
Rules: Rule 3 (common courses across branches), Rule 5 (cross-parity), Rule 9 (credits),
       Rule 11 (common exams → same session, max accommodation), Rule 8 (exams-per-branch cap).

Stats emitted:
  total_courses, shared_courses, single_branch_courses, branches_seen
"""
from collections import defaultdict


def build_course_clusters(
    enrolments: list[dict],
    exams_per_branch: dict[str, int] | None = None,
) -> tuple[list[dict], dict]:
    """
    Group courses into clusters. Shared courses (multi-branch) are flagged for
    same-session assignment (Rule 11).

    Args:
        enrolments: list of student dicts from data_loader
        exams_per_branch: optional {branch: max_exams} cap per branch

    Returns:
        (clusters, stats)
        clusters: [{course_code, course_name, semesters, branches, is_shared,
                    credits, year, student_count}]
        stats: {total_courses, shared_courses, ...}
    """
    course_map: dict[str, dict] = {}
    for row in enrolments:
        if row.get("is_arrear"):
            continue  # arrears handled by agent6
        code = row["course_code"]
        if code not in course_map:
            course_map[code] = {
                "course_code": code,
                "course_name": row["course_name"],
                "semesters": set(),
                "branches": set(),
                "credits": row.get("credits", 3),
                "student_count": 0,
            }
        course_map[code]["semesters"].add(row["semester"])
        course_map[code]["branches"].add(row["branch"])
        course_map[code]["student_count"] += 1
        # Take max credits seen for this course
        course_map[code]["credits"] = max(course_map[code]["credits"], row.get("credits", 3))

    # Apply exams-per-branch cap: if a branch already has enough exams, drop extra courses
    branch_exam_count: dict[str, int] = defaultdict(int)
    clusters: list[dict] = []

    # Sort by student_count desc so high-enrolment courses get priority
    for code, info in sorted(course_map.items(), key=lambda x: -x[1]["student_count"]):
        branches = info["branches"]
        semesters = info["semesters"]

        # Check cap: only include if at least one branch still has room
        if exams_per_branch:
            eligible_branches = {
                b for b in branches
                if branch_exam_count[b] < exams_per_branch.get(b, 999)
            }
            if not eligible_branches:
                continue
            branches = eligible_branches

        multi_branch = len(branches) > 1
        has_odd = any(s % 2 != 0 for s in semesters)
        has_even = any(s % 2 == 0 for s in semesters)
        cross_parity = has_odd and has_even and len(branches) > 1

        sem = min(semesters)
        from config import sem_to_year
        year = sem_to_year(sem)

        clusters.append({
            "course_code": code,
            "course_name": info["course_name"],
            "semesters": sorted(semesters),
            "branches": sorted(branches),
            "is_shared": multi_branch or cross_parity,
            "credits": info["credits"],
            "year": year,
            "student_count": info["student_count"],
        })

        for b in branches:
            branch_exam_count[b] += 1

    shared = [c for c in clusters if c["is_shared"]]
    stats = {
        "total_courses": len(clusters),
        "shared_courses": len(shared),
        "single_branch_courses": len(clusters) - len(shared),
        "branches_seen": len({b for c in clusters for b in c["branches"]}),
        "function_type": "Course Cluster Builder",
        "rules_applied": ["Rule 3 (common courses)", "Rule 5 (cross-parity)", "Rule 8 (exams-per-branch)", "Rule 11 (max accommodation)"],
    }
    return clusters, stats
