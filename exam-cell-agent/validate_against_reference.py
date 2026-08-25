# -*- coding: utf-8 -*-
"""
validate_against_reference.py
─────────────────────────────
Standalone validation script. Runs the full pipeline against the two real
data files and checks that the first 5-6 exam days match the known pattern
from the reference master schedule (Year_Wise_Color_Consolidated_Master_Schedule).

Expected ground-truth pattern (from reference):
  Day 1 FN  → Sem 3 (II yr) shared courses
  Day 1 AN  → Sem 5 (III yr) shared courses
  Day 2 FN  → Sem 7 (IV yr) shared courses
  Day 2 AN  → Arrear-only session (no regular semester tag)
  Day 3 FN  → Sem 3 again (next cycle)
  ... repeats

Usage:
  cd "d:\\Agent - Exam cell AI\\exam-cell-agent"
  python validate_against_reference.py
"""
import os
import sys

# Allow running from project root
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

from data_loader import load_multi_year_dataset
from agent1_calendar import build_calendar
from agent3_matcher import build_course_clusters
from agent4_harmonizer import assign_regular_slots
from agent6_arrear import schedule_arrears
from config import SEMESTER_SESSION_CYCLE, GAP_FILL_POLICY

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(script_dir)
REGULAR_FILE = os.path.join(BASE_DIR, "Regular_All Courses.xlsx")
ARREAR_FILE  = os.path.join(BASE_DIR, "Arrear Details_AM2026 (1).xlsx")

START_DATE  = "2026-11-02"
LEAVE_DAYS  = []   # add any leave dates here

# Ground-truth pattern: what should appear in each slot of the first 2 days
# (one full cycle = 3 regular sessions + 1 arrear sweep session)
EXPECTED_PATTERN = [
    {"day": 1, "session": "FN", "target_sem": 3,        "label": "Sem 3 (II yr) regular"},
    {"day": 1, "session": "AN", "target_sem": 5,        "label": "Sem 5 (III yr) regular"},
    {"day": 2, "session": "FN", "target_sem": 7,        "label": "Sem 7 (IV yr) regular"},
    {"day": 2, "session": "AN", "target_sem": "arrear", "label": "Arrear-only sweep"},
    {"day": 3, "session": "FN", "target_sem": 3,        "label": "Sem 3 (II yr) regular (cycle 2)"},
    {"day": 3, "session": "AN", "target_sem": 5,        "label": "Sem 5 (III yr) regular (cycle 2)"},
]

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
RESET  = "\033[0m"
BOLD   = "\033[1m"


def main():
    print(f"\n{BOLD}=== Exam Scheduling Pipeline -- Ground-Truth Validation ==={RESET}")
    print(f"Regular file : {REGULAR_FILE}")
    print(f"Arrear file  : {ARREAR_FILE}")
    print(f"Start date   : {START_DATE}")
    print(f"GAP_FILL_POLICY : {GAP_FILL_POLICY}\n")

    # ── Check files exist ────────────────────────────────────────────────────
    missing = [f for f in [REGULAR_FILE, ARREAR_FILE] if not os.path.exists(f)]
    if missing:
        print(f"{RED}ERROR: Missing data files:{RESET}")
        for m in missing:
            print(f"  ✗ {m}")
        sys.exit(1)

    # ── Step 1: Load data ────────────────────────────────────────────────────
    print("Loading data files …")
    enrolments = load_multi_year_dataset(
        regular_file=REGULAR_FILE,
        arrear_file=ARREAR_FILE,
        sem_type="odd",
    )
    regular_enrolments = [e for e in enrolments if not e.get("is_arrear")]
    arrear_enrolments  = [e for e in enrolments if e.get("is_arrear")]
    print(f"  Loaded {len(regular_enrolments)} regular + {len(arrear_enrolments)} arrear enrolments.\n")

    # ── Step 2: Agent 1 — Build calendar ─────────────────────────────────────
    print("Agent 1: Building calendar …")
    open_slots, stats1 = build_calendar(START_DATE, leave_days=LEAVE_DAYS, estimated_days=15)
    print(f"  {stats1['total_slots']} slots across {stats1['exam_days']} days (end: {stats1['end_date']}).\n")

    # ── Validate calendar slot tagging ───────────────────────────────────────
    print(f"{BOLD}--- Calendar Slot Tagging (first 8 slots) ---{RESET}")
    dates = sorted({s["date"] for s in open_slots})[:4]
    all_tagging_ok = True
    for i, exp in enumerate(EXPECTED_PATTERN):
        if i >= len(open_slots):
            break
        slot = open_slots[i]
        actual_sem = slot.get("target_sem")
        expected_sem = exp["target_sem"]
        ok = actual_sem == expected_sem
        all_tagging_ok = all_tagging_ok and ok
        status = f"{GREEN}✅ PASS{RESET}" if ok else f"{RED}❌ FAIL{RESET}"
        print(f"  Slot {i} | Day {exp['day']} {exp['session']} | "
              f"Expected target_sem={expected_sem!r:8} | "
              f"Got={actual_sem!r:8} | {exp['label']} | {status}")

    print()

    # ── Step 3: Agent 3 — Course clusters ────────────────────────────────────
    print("Agent 3: Building course clusters …")
    clusters, stats3 = build_course_clusters(regular_enrolments)
    print(f"  {stats3['total_courses']} courses, {stats3['shared_courses']} shared, "
          f"{stats3['branches_seen']} branches.\n")

    # ── Step 4: Agent 4 — Assign slots ───────────────────────────────────────
    print("Agent 4: Assigning regular slots (cycle-walking) …")
    res4 = assign_regular_slots(open_slots, clusters)
    draft = res4["draft_schedule"]
    arrear_sweep_slots = res4["arrear_sweep_slots"]
    stats4 = res4["stats"]
    print(f"  Assigned {stats4['regular_courses_assigned']} courses. "
          f"Unassigned: {stats4['unassigned_courses']}.\n")

    # ── Step 5: Agent 6 — Arrear scheduling ──────────────────────────────────
    print("Agent 6: Scheduling arrears …")
    complete, stats6 = schedule_arrears(draft, arrear_enrolments, arrear_sweep_slots, open_slots,
                                        all_enrolments=enrolments)
    print(f"  Arrear courses: {stats6['arrear_courses']}, "
          f"Assigned: {stats6['arrear_slots_assigned']}, "
          f"Sweep slots: {stats6['sweep_slots_available']}.")
    tiers = stats6["tier_breakdown"]
    for k, v in tiers.items():
        print(f"  Tier {k} : {v}")

    # ── Validate schedule pattern for first 5-6 exam days ────────────────────
    print(f"{BOLD}--- Schedule Pattern Validation (first 5-6 sessions) ---{RESET}")

    # Build a day→session→entries map
    day_sess_map: dict[tuple, list] = {}
    for entry in complete:
        key = (entry["date"], entry["session"])
        day_sess_map.setdefault(key, []).append(entry)

    exam_dates = sorted({e["date"] for e in complete})[:3]  # first 3 days
    all_pattern_ok = True

    for i, exp in enumerate(EXPECTED_PATTERN):
        if exp["day"] - 1 >= len(exam_dates):
            print(f"  {YELLOW}[WARN] Day {exp['day']} {exp['session']}: not enough exam dates generated.{RESET}")
            continue

        d = exam_dates[exp["day"] - 1]
        sess = exp["session"]
        entries = day_sess_map.get((d, sess), [])
        expected_sem = exp["target_sem"]

        if expected_sem == "arrear":
            # Arrear sweep slot: all entries should be is_arrear=True
            non_arrear = [e for e in entries if not e.get("is_arrear")]
            ok = len(non_arrear) == 0
            detail = (f"{len(entries)} arrear entries" if ok
                      else f"{RED}has {len(non_arrear)} non-arrear entries!{RESET}")
        else:
            # Regular slot: at least some entries should be for expected_sem, none is_arrear
            sem_entries = [e for e in entries if e.get("semester") == expected_sem and not e.get("is_arrear")]
            ok = len(sem_entries) > 0
            detail = (f"{len(sem_entries)} Sem {expected_sem} courses across "
                      f"{sorted({b for e in sem_entries for b in e.get('branches', [])})} branches"
                      if ok else f"{RED}no Sem {expected_sem} regular courses found!{RESET}")

        all_pattern_ok = all_pattern_ok and ok
        status = f"{GREEN}✅ PASS{RESET}" if ok else f"{RED}❌ FAIL{RESET}"
        status_plain = "PASS" if ok else "FAIL"
        print(f"  {d} {sess} | Expected: {exp['label']!r:40} | {detail} | {status} [{status_plain}]")

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    if all_tagging_ok and all_pattern_ok:
        print(f"{GREEN}{BOLD}[OK] ALL CHECKS PASSED -- Output matches ground-truth reference pattern.{RESET}")
    else:
        if not all_tagging_ok:
            print(f"{RED}{BOLD}[FAIL] Calendar slot tagging mismatch -- check config.py SEMESTER_SESSION_CYCLE.{RESET}")
        if not all_pattern_ok:
            print(f"{RED}{BOLD}[FAIL] Schedule pattern mismatch -- check agent4_harmonizer.py cycle-walking logic.{RESET}")

    print(f"\nGAP_FILL_POLICY = {GAP_FILL_POLICY!r}")
    print("  → To switch to 'always' fill, edit GAP_FILL_POLICY in config.py and re-run.")
    print()


if __name__ == "__main__":
    main()
