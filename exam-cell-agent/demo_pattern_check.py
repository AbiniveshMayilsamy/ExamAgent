"""
demo_pattern_check.py — quick sanity check that the new harmonizer produces
the exact FN/AN pattern from the reference master schedule:

  Day 1 FN -> Sem 3 (II yr)
  Day 1 AN -> Sem 5 (III yr)
  Day 2 FN -> Sem 7 (IV yr)
  Day 2 AN -> arrear sweep (reserved for uncommon arrears)
  Day 3 FN -> Sem 3 again, ...

Run: cd "d:\\Agent - Exam cell AI\\exam-cell-agent" && python demo_pattern_check.py
"""

from config import ScheduleConfig
from agent1_calendar import build_calendar
from agent4_harmonizer import assign_regular_slots

# Use real build_calendar so slots carry target_sem / is_arrear_sweep tags.
# One leave day on 04-Nov so Day 3 starts on 05-Nov (matching reference pattern).
open_slots, cal_stats = build_calendar(
    start_date="2026-11-02",
    leave_days=["2026-11-04"],
    estimated_days=6,
)

clusters = [
    {
        "course_code": "U23CS491",
        "semester": 3,
        "branches": ["CSE", "ECE", "EEE", "IT", "AIDS", "AIML", "CCE", "CYSE", "CSBS", "MECH"],
        "course_name": "Engineering Mathematics III",
        "credits": 4,
    },
    {
        "course_code": "U23CB593",
        "semester": 5,
        "branches": ["CSE", "IT", "AIDS", "AIML", "CCE", "CSBS", "CYSE"],
        "course_name": "Data Science Fundamentals",
        "credits": 3,
    },
    {
        "course_code": "U23CB103",
        "semester": 7,
        "branches": ["CSE", "ECE", "EEE", "MECH", "IT", "AIDS", "AIML", "CCE"],
        "course_name": "Project Management",
        "credits": 3,
    },
    {
        "course_code": "U23CS403",
        "semester": 3,
        "branches": ["CSE", "IT", "AIDS", "AIML", "CCE", "CYSE", "CSBS"],
        "course_name": "Operating Systems",
        "credits": 3,
    },
    {
        "course_code": "U23EC581",
        "semester": 5,
        "branches": ["ECE", "EEE"],
        "course_name": "Digital Signal Processing",
        "credits": 4,
    },
]

config = ScheduleConfig()
result = assign_regular_slots(open_slots, clusters, config)

print()
print("=" * 70)
print("  DEMO: Semester-Rotation Cycle Pattern Check")
print("=" * 70)
print(f"  GAP_FILL_POLICY   : {config.gap_fill_policy}")
print(f"  ARREAR_SWEEP_RULE : {config.arrear_sweep_rule}")
print(f"  Cycle order       : {' -> '.join(str(s['semester']) for s in config.semester_cycle)}")
print()
print(f"  {'Date':<13} {'Sess':<5} {'Sem':<5} {'Course':<14} {'Branches'}")
print(f"  {'-'*13} {'-'*5} {'-'*5} {'-'*14} {'-'*40}")

for row in result["draft_schedule"]:
    branch_str = ",".join(row["branches"])
    print(f"  {row['date']:<13} {row['session']:<5} {str(row['semester']):<5} {row['course_code']:<14} {branch_str}")

print()
print(f"  Reserved for arrear sweep ({len(result['arrear_sweep_slots'])} slot(s)):")
for slot in result["arrear_sweep_slots"]:
    print(f"    {slot['date']} {slot['session']}")

unscheduled = result.get("unscheduled_clusters", [])
if unscheduled:
    print(f"\n  [WARN] {len(unscheduled)} cluster(s) unscheduled (fallback needed):")
    for c in unscheduled:
        print(f"    {c.get('course_code', '?')} (Sem {c.get('semester', '?')})")

print()
print("  Expected pattern:")
expected = [
    ("2026-11-02", "FN", 3),
    ("2026-11-02", "AN", 5),
    ("2026-11-03", "FN", 7),
    ("2026-11-03", "AN", "SWEEP"),
    ("2026-11-05", "FN", 3),
    ("2026-11-05", "AN", 5),
]
print(f"  {'Date':<13} {'Sess':<5} {'Expected':<10} {'Actual':<10} {'Result'}")
print(f"  {'-'*13} {'-'*5} {'-'*10} {'-'*10} {'-'*10}")

assigned_map = {(r["date"], r["session"]): r.get("semester") for r in result["draft_schedule"]}
sweep_set = {(s["date"], s["session"]) for s in result["arrear_sweep_slots"]}

all_pass = True
for date, sess, exp_sem in expected:
    if exp_sem == "SWEEP":
        actual = "SWEEP" if (date, sess) in sweep_set else assigned_map.get((date, sess), "?")
        ok = (date, sess) in sweep_set
    else:
        actual = assigned_map.get((date, sess), "none")
        ok = actual == exp_sem
    all_pass = all_pass and ok
    mark = "PASS" if ok else "FAIL"
    print(f"  {date:<13} {sess:<5} {str(exp_sem):<10} {str(actual):<10} {mark}")

print()
print(f"  {'[OK] ALL PATTERN CHECKS PASSED' if all_pass else '[FAIL] Some checks failed — see above'}")
print("=" * 70)
print()
