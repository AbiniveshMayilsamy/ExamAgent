"""
data_loader.py — Loads student/course enrolment data.
Derives: branch, is_arrear, year, credits, roll_range per dept.
"""
import json
import re
import pandas as pd
from config import sem_to_year


def _parse_branch(reg_no: str) -> str:
    """Extract branch code from reg_no, e.g. '24CS001' -> 'CS'."""
    match = re.search(r"[A-Z]{2,6}", reg_no)
    return match.group(0) if match else "UNKNOWN"


def _roll_range(reg_nos: list[str]) -> str:
    """Return 'MIN–MAX' roll range string from a list of reg_nos."""
    if not reg_nos:
        return ""
    sorted_rolls = sorted(reg_nos)
    return f"{sorted_rolls[0]}–{sorted_rolls[-1]}"


def load_students(source) -> list[dict]:
    """
    Load student enrolment data from CSV/JSON.

    Columns expected: name, reg_no, course_code, course_name, semester
    Optional columns: credits (defaults to 3 if absent)

    Derives:
      branch       — from reg_no prefix
      year         — from semester (sem 1-2 → yr 1, 3-4 → yr 2, etc.)
      current_semester — max semester for that student
      is_arrear    — semester < current_semester
      credits      — from column or default 3
    """
    if isinstance(source, str) and source.endswith(".json"):
        with open(source) as f:
            records = json.load(f)
        df = pd.DataFrame(records)
    else:
        df = pd.read_csv(source)

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    required = {"name", "reg_no", "course_code", "course_name", "semester"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Input data is missing columns: {missing}")

    df["semester"] = df["semester"].astype(int)
    df["branch"] = df["reg_no"].apply(_parse_branch)
    df["year"] = df["semester"].apply(sem_to_year)

    if "credits" not in df.columns:
        df["credits"] = 3
    else:
        df["credits"] = pd.to_numeric(df["credits"], errors="coerce").fillna(3).astype(int)

    current_sem = df.groupby("reg_no")["semester"].max().rename("current_semester")
    df = df.join(current_sem, on="reg_no")
    df["is_arrear"] = df["semester"] < df["current_semester"]

    return df.to_dict(orient="records")


def build_dept_roll_ranges(enrolments: list[dict]) -> dict[str, dict]:
    """
    Build dept-wise roll ranges per semester.

    Returns:
        {branch: {semester: "24CS001–24CS320"}}
    """
    from collections import defaultdict
    dept_sem_rolls: dict[tuple, list] = defaultdict(list)
    for row in enrolments:
        dept_sem_rolls[(row["branch"], row["semester"])].append(row["reg_no"])

    result: dict[str, dict] = defaultdict(dict)
    for (branch, sem), rolls in dept_sem_rolls.items():
        result[branch][sem] = _roll_range(rolls)
    return dict(result)
