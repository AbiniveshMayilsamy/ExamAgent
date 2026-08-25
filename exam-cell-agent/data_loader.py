"""
data_loader.py — Multi-Year and Arrear Data Ingestion & Harmonization Engine.

Handles multi-sheet Excel (.xlsx/.xls), CSV, and JSON files across 1st to 4th Year.
Features:
- Pure-python zipfile XML parsing for zero-dependency Excel reading.
- Dynamic sheet department inferencing (e.g. 'III CYS' sheet missing Dept column).
- Authoritative 12-digit Register Number department mapping (REG_DEPT_MAP).
- Lateral Entry (LE) rule enforcement (LE students joined in Sem 3, Sem 1/2 arrears discarded).
- Course Code Semester Inferencing (e.g., U23EC384 -> Sem 3, U23CS494 -> Sem 4, U23MA209 -> Sem 4, U23OME06 -> Sem 4).
- Cyber Security department code harmonization ('149' / 'CYS' / 'CYSE' -> 'CYSE').
- Active scheduled year filtering (only process arrears for loaded active years).
- Department normalization ('AI&DS' -> 'AIDS').
- Student Master Database building (RegNo / RollNo indexing).
- Arrear file harmonization & deduplication.
"""
import re
import json
import csv
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from config import sem_to_year

KNOWN_DEPTS = ["AIDS", "AIML", "CCE", "CSBS", "CYSE", "ECE", "EEE", "CSE", "IT", "MECH"]

# Official Anna University / Sri Eshwar 3-digit department code map
REG_DEPT_MAP = {
    '104': 'CSE',
    '105': 'EEE',
    '106': 'ECE',
    '114': 'MECH',
    '134': 'CCE',
    '148': 'AIML',
    '149': 'CYSE',
    '205': 'IT',
    '243': 'AIDS',
    '244': 'CSBS',
}

# Regex for student roll numbers (e.g. 25CC002, 25AD001, 24EE001, IC26BTecL0019)
ROLL_NO_PATTERN = re.compile(r'^(26|25|24|23|22|21|20|19)(AD|CS|CC|EC|EE|ME|IT|CB|SY|AM|VL|CY)[A-Z0-9]{2,6}$', re.IGNORECASE)

def normalize_dept(dept_str: str) -> str:
    """Normalize department strings — handles compound sheet names like 'III ECE', 'IV MECH A', '3rd Year CSE'."""
    if not dept_str:
        return "UNKNOWN"
    clean = str(dept_str).strip().upper().replace("&", "")

    # Strip year/section prefixes and suffixes (e.g. 'III ', 'IV ', '3RD ', 'A', 'B', 'C')
    # so 'III ECE', 'IV MECH A', '3RD YEAR CSE B' all reduce to their dept token
    clean = re.sub(r'^(I{1,3}V?|IV|VI{0,3}|\d+(ST|ND|RD|TH)\s*(YEAR)?)\s*', '', clean)
    clean = re.sub(r'\s+[A-D]$', '', clean)   # trailing section letter
    clean = clean.strip()

    if clean in ["AIDS", "AIDS A", "AIDS B", "AI&DS", "ARTIFICIAL INTELLIGENCE AND DATA SCIENCE", "ARTIFICIAL INTELLIGENCE AND DATA"]:
        return "AIDS"
    if clean in ["AIML", "AIML A", "AIML B", "AI-ML", "MACHINE LEARNING"]:
        return "AIML"
    if clean in ["CSBS", "BUSINESS SYSTEMS"]:
        return "CSBS"
    if clean in ["CYS", "CYSE", "CYBER", "CYBER SECURITY", "CSE CYBER SECURITY", "CYBERSECURITY"]:
        return "CYSE"
    if clean in ["CCE", "COMPUTER AND COMMUNICATION ENGINEERING"]:
        return "CCE"
    if clean in ["CSE", "CSE A", "CSE B", "CSE C", "COMPUTER SCIENCE"]:
        return "CSE"
    if clean in ["ECE", "ECE A", "ECE B", "ECE C", "ELECTRONICS AND COMMUNICATION ENGINEERING"]:
        return "ECE"
    if clean in ["EEE", "ELECTRICAL AND ELECTRONICS ENGINEERING"]:
        return "EEE"
    if clean in ["MECH", "MECHANICAL ENGINEERING"]:
        return "MECH"
    if clean in ["IT", "INFORMATION TECHNOLOGY"]:
        return "IT"

    # Last resort: scan tokens for a known dept keyword
    for token in clean.split():
        token = token.strip()
        if token in KNOWN_DEPTS:
            return token
        if token in ["CYS", "CYSE", "CYBER"]:
            return "CYSE"

    return clean


def is_valid_course_code(item: str) -> bool:
    """Check if item is a legitimate course code and NOT a student roll number, reg number, or table header."""
    if not item:
        return False
    item_clean = str(item).strip()
    if len(item_clean) < 4 or len(item_clean) > 12:
        return False
    item_upper = item_clean.upper()

    # Reject known headers and non-course keywords
    if item_upper in ['S.NO', 'SNO', 'SL.NO', 'ROLL NO', 'ROLLNO', 'REGISTER NUMBER', 'REGISTER NO', 'REG NO', 'REGNO', 'STUDENT NAME', 'NAME', 'COURSECODE', 'COURSE CODE', 'COURSE', 'DEPT', 'DEPARTMENT', 'SEMESTER', 'SEM', 'GRADE', 'RESULT', 'REMARKS', 'PASS', 'FAIL']:
        return False

    # Reject student roll numbers (e.g. 25CS001) and register numbers (12 digits)
    if ROLL_NO_PATTERN.match(item_upper) or item_upper.startswith('IC'):
        return False
    if item_clean.isdigit():
        return False

    # Must contain at least one letter AND at least one digit (e.g. MA3151, GE3151, U23CS405, CS301, OEC84, 19CS301)
    if re.search(r'[A-Z]', item_upper) and re.search(r'\d', item_upper):
        return True

    return False


def get_dept_from_reg_no(reg_no: str) -> str:
    """Extract department directly from 12-digit Anna University Register Number."""
    if reg_no and len(reg_no) == 12 and reg_no.isdigit():
        code = reg_no[6:9]
        return REG_DEPT_MAP.get(code, None)
    return None


def is_lateral_entry_student(roll_no: str, reg_no: str) -> bool:
    """Check if a student is a Lateral Entry (LE) student (joined directly in 2nd year / Sem 3)."""
    r_str = str(roll_no or '').upper()
    p_str = str(reg_no or '').upper()
    if r_str.startswith('IC') or 'BTECL' in r_str or 'BEL' in r_str:
        return True
    if len(r_str) >= 5 and r_str[-3] == '3' and r_str[-2:].isdigit():
        return True
    if len(p_str) == 12 and p_str.isdigit() and p_str[9] == '3':
        return True
    return False


def extract_sem_from_course_code(course_code: str, fallback_sem: int = 1) -> int:
    """
    Extract semester from course code for Sri Eshwar / Anna University Regulations 2023.
    Preserves fallback_sem for Open Electives and non-standard subject codes.
    """
    if not course_code:
        return fallback_sem if fallback_sem else 1
    code = str(course_code).upper().strip()

    # 1. Specific Known Course Overrides
    if code in ["U23MA209", "U23MA210", "U23MA282", "U23OME04", "U23OME06", "U23OCS86"]:
        return 4
    if code in ["U23MA204", "U23OAD81"]:
        return 3

    # Strip regulation prefix if present at start (e.g. U23, U22, U24, 19, 20, 21, 22, 23)
    code_no_reg = re.sub(r'^(U23|U22|U24|19|20|21|22|23)', '', code)

    # 2. Match 3-digit subject number (e.g. U23CS591 -> 5, U23EC384 -> 3, U23CB593 -> 5)
    match = re.search(r'[A-Z]{2,4}(\d{3})', code_no_reg)
    if match:
        digit3 = match.group(1)
        sem_digit = int(digit3[0])
        if 1 <= sem_digit <= 8:
            if code.startswith("U23MA20") and sem_digit == 2:
                return 2
            return sem_digit

    # 3. Open Elective / Elective pattern check (e.g., OME81, OCS85, OEC84, OAD81, OCS82, OME06)
    match_oe = re.search(r'[A-Z]{2,4}(\d{2,3})', code_no_reg)
    if match_oe:
        digits = match_oe.group(1)
        if len(digits) == 3 and digits[0] in '12345678':
            return int(digits[0])
        elif len(digits) == 2:
            d0 = digits[0]
            if d0 in '345678':
                return int(d0)
            elif d0 in '012':
                return fallback_sem if fallback_sem and fallback_sem != 1 else 4

    # 4. Fallback pattern match
    match2 = re.search(r'^[U\d]{0,3}[A-Z]{2,4}(\d)', code)
    if match2:
        sem_digit = int(match2.group(1))
        if 1 <= sem_digit <= 8:
            return sem_digit

    return fallback_sem if fallback_sem else 1


def _parse_reg_no_info(reg_no: str, sem_type: str = "odd", fallback_sem: int = 1) -> dict:
    """
    Parse batch, department, and regular semester from a 12-digit register number
    or roll number (e.g. 722825104001, 25CS001, 24EE012).
    Supports both 'odd' and 'even' semester maps.
    """
    if not reg_no:
        return {"batch": "26", "branch": "GENERAL", "regular_sem": fallback_sem if fallback_sem else 1}

    reg_str = str(reg_no).strip().upper()
    batch = None
    branch = "GENERAL"

    # Case 1: 12-digit Anna University Register Number (e.g. 722825104001)
    if len(reg_str) == 12 and reg_str.isdigit():
        batch = reg_str[4:6]
        dept_code = reg_str[6:9]
        branch = REG_DEPT_MAP.get(dept_code, "GENERAL")
    # Case 2: Roll number starting with 2-digit batch (e.g. 25CS001, 24EE012, 23AD005)
    elif ROLL_NO_PATTERN.match(reg_str) or (len(reg_str) >= 4 and reg_str[:2].isdigit()):
        batch = reg_str[:2]

    is_even = str(sem_type).lower() == "even"
    batch_sem_map = {
        "26": 2 if is_even else 1,
        "25": 4 if is_even else 3,
        "24": 6 if is_even else 5,
        "23": 8 if is_even else 7,
    }
    regular_sem = batch_sem_map.get(batch, fallback_sem if fallback_sem else (2 if is_even else 1))

    return {
        "batch": batch or "26",
        "branch": branch,
        "regular_sem": regular_sem
    }


def parse_xlsx_with_zipfile(filepath: str, default_sem: int = 1, is_arrear: bool = False, sem_type: str = "odd") -> list:
    """
    Parses all worksheets in an Excel .xlsx file using pure python zipfile.
    Returns list of dicts: [ {reg_no, roll_no, name, branch, course_code, semester, year, is_arrear}, ... ]
    """
    records = []
    try:
        with zipfile.ZipFile(filepath, 'r') as z:
            strings = []
            if 'xl/sharedStrings.xml' in z.namelist():
                tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
                for elem in tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                    t_texts = [t.text for t in elem.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text]
                    strings.append(''.join(t_texts))

            wb = ET.fromstring(z.read('xl/workbook.xml'))
            rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
            rel_dict = {r.attrib['Id']: r.attrib['Target'] for r in rels.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')}
            sheets = wb.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheets')
            
            for s in sheets:
                sheet_name = s.attrib['name']
                r_id = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
                target = rel_dict[r_id]
                sheet_path = 'xl/' + target if not target.startswith('xl/') else target
                sheet_tree = ET.fromstring(z.read(sheet_path))
                rows = sheet_tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
                
                sheet_grid = {}
                max_row = 0
                for r in rows:
                    r_idx = int(r.attrib['r'])
                    max_row = max(max_row, r_idx)
                    for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                        c_ref = c.attrib['r']
                        t_type = c.attrib.get('t')
                        v_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                        val = v_elem.text if v_elem is not None else None
                        if t_type == 's' and val is not None and int(val) < len(strings):
                            val = strings[int(val)]
                        sheet_grid[c_ref] = val

                sheet_dept = normalize_dept(sheet_name)

                for r_idx in range(1, max_row + 1):
                    raw = [sheet_grid.get(f'{chr(64+c)}{r_idx}', '') or '' for c in range(1, 10)]
                    raw_clean = [str(v).strip() for v in raw if str(v).strip()]
                    if not raw_clean:
                        continue
                    if any(x in ['S.No', 'Roll No', 'Register Number', 'Register No', 'Student Name', 'CourseCode', 'Dept'] for x in raw_clean):
                        continue
                    if any('Sri Eshwar' in x or 'Coimbatore' in x for x in raw_clean):
                        continue
                    
                    course_code = None
                    reg_no = None
                    roll_no = None
                    dept = None
                    name = None
                    row_sem = default_sem

                    # Extract explicit semester digit if present in row cells (e.g. '1', '2', '3', '4', '5', '6', '7', '8')
                    for item in raw_clean:
                        if item.isdigit() and len(item) == 1 and 1 <= int(item) <= 8:
                            row_sem = int(item)
                            break

                    # 1. Reg No (12 digits)
                    for item in raw_clean:
                        if len(item) == 12 and item.isdigit():
                            reg_no = item
                            break

                    # 2. Course Code (Strict course code check)
                    for item in raw_clean:
                        if is_valid_course_code(item):
                            course_code = item.upper()
                            break

                    # 3. Dept (Exact token matching only)
                    for item in raw_clean:
                        norm = normalize_dept(item)
                        if norm in KNOWN_DEPTS:
                            dept = norm
                            break

                    # 4. Roll No
                    for item in raw_clean:
                        if item != reg_no and item != course_code and item != dept:
                            if ROLL_NO_PATTERN.match(item) or 'IC' in item or 'BTec' in item:
                                roll_no = item
                                break

                    # Fallback Roll No if not matched
                    if not roll_no:
                        for item in raw_clean:
                            if item not in [reg_no, course_code, dept] and not item.isdigit():
                                if re.search(r'[A-Za-z]', item) and re.search(r'\d', item) and len(item) >= 4:
                                    roll_no = item
                                    break

                    # 5. Name is remaining string containing letters
                    for item in raw_clean:
                        if item not in [reg_no, roll_no, course_code, dept] and not item.isdigit():
                            if re.search(r'[A-Za-z]', item):
                                name = item
                                break

                    # Resolve final department: RegNo 12-digit prefix > In-sheet dept > Sheet name
                    final_dept = get_dept_from_reg_no(reg_no) or dept or sheet_dept
                    if not final_dept or final_dept == "UNKNOWN":
                        final_dept = "GENERAL"

                    primary_id = reg_no if reg_no else roll_no
                    if primary_id and course_code:
                        if is_arrear:
                            # Use explicit row_sem from sheet if found, otherwise deduce from course code
                            if row_sem != default_sem:
                                actual_sem = row_sem
                            else:
                                actual_sem = extract_sem_from_course_code(course_code, row_sem)
                        else:
                            reg_info = _parse_reg_no_info(primary_id, sem_type=sem_type, fallback_sem=row_sem)
                            actual_sem = reg_info["regular_sem"] if reg_info and reg_info.get("regular_sem") else row_sem
                        records.append({
                            "name": name or f"Student {primary_id}",
                            "reg_no": primary_id,
                            "roll_no": roll_no or primary_id,
                            "branch": final_dept,
                            "semester": actual_sem,
                            "year": sem_to_year(actual_sem),
                            "course_code": course_code,
                            "course_name": course_code,
                            "credits": 3,
                            "is_arrear": is_arrear,
                        })
    except Exception as e:
        print(f"Error parsing xlsx zipfile {filepath}: {e}")
    return records


def load_students(source, file_type: str = "auto") -> list:
    """Legacy single-source loader wrapper supporting xlsx, json, csv, or dict."""
    if isinstance(source, str):
        if source.endswith(".xlsx") or source.endswith(".xls"):
            is_arr = True if file_type == "arrear" or "arrear" in source.lower() else False
            return parse_xlsx_with_zipfile(source, default_sem=1, is_arrear=is_arr)
        elif source.endswith(".json"):
            with open(source, "r", encoding="utf-8") as f:
                data = json.load(f)
                for r in data:
                    if "branch" not in r:
                        r["branch"] = normalize_dept(r.get("dept") or r.get("department") or "GENERAL")
                    if "semester" not in r:
                        r["semester"] = 1
                return data
        elif source.endswith(".csv"):
            records = []
            with open(source, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    records.append({
                        "name": row.get("name") or row.get("Student Name") or "Student",
                        "reg_no": row.get("reg_no") or row.get("Register No") or row.get("roll_no"),
                        "roll_no": row.get("roll_no") or row.get("Roll No"),
                        "branch": normalize_dept(row.get("branch") or row.get("Dept")),
                        "semester": int(row.get("semester") or 1),
                        "year": sem_to_year(int(row.get("semester") or 1)),
                        "course_code": row.get("course_code") or row.get("Course Code"),
                        "course_name": row.get("course_name") or row.get("course_code"),
                        "credits": int(row.get("credits") or 3),
                        "is_arrear": row.get("is_arrear") == "true" or file_type == "arrear",
                    })
            return records
    elif isinstance(source, dict):
        return load_multi_year_dataset(source)
    return []


def load_multi_year_dataset(year_files: dict = None, arrear_file: str = None, sem_type: str = "odd", regular_file: str = None) -> list:
    """
    Ingests regular dataset (either 4 year_files or single regular_file) and optional arrear file.
    Only harmonizes arrears belonging to active enrolled students and enforces LE rules.
    """
    sem_mapping = {
        "odd":  {1: 1, 2: 3, 3: 5, 4: 7},
        "even": {1: 2, 2: 4, 3: 6, 4: 8},
    }
    active_sem_map = sem_mapping.get(sem_type.lower(), sem_mapping["odd"])
    
    all_enrolments = []
    student_master_db = {}  # primary_id -> {name, branch, year, semester, roll_no}

    # 1. Ingest Direct Regular File if passed
    if regular_file:
        parsed = parse_xlsx_with_zipfile(regular_file, default_sem=1, is_arrear=False, sem_type=sem_type)
        for rec in parsed:
            p_id = rec["reg_no"]
            if p_id not in student_master_db and not rec["name"].startswith("Student "):
                student_master_db[p_id] = {
                    "name": rec["name"],
                    "branch": rec["branch"],
                    "year": rec["year"],
                    "semester": rec["semester"],
                    "roll_no": rec["roll_no"]
                }
            all_enrolments.append(rec)
            
    # 2. Ingest Regular Year Files if year_files provided
    elif year_files:
        for y_str, fpath in year_files.items():
            if not fpath:
                continue
            y_num = int(y_str) if y_str.isdigit() else 1
            target_sem = active_sem_map.get(y_num, y_num * 2 - 1)
            
            parsed = parse_xlsx_with_zipfile(fpath, default_sem=target_sem, is_arrear=False, sem_type=sem_type)
            for rec in parsed:
                p_id = rec["reg_no"]
                if p_id not in student_master_db and not rec["name"].startswith("Student "):
                    student_master_db[p_id] = {
                        "name": rec["name"],
                        "branch": rec["branch"],
                        "year": rec["year"],
                        "semester": rec["semester"],
                        "roll_no": rec["roll_no"]
                    }
                all_enrolments.append(rec)
            
    # 3. Ingest & Harmonize Arrear File if present
    if arrear_file:
        arrear_records = parse_xlsx_with_zipfile(arrear_file, default_sem=1, is_arrear=True, sem_type=sem_type)
        seen_arrears = set()  # (reg_no, course_code) deduplication
        
        for arr in arrear_records:
            p_id = arr["reg_no"]
            c_code = arr["course_code"]
            arr_sem = arr.get("semester", 1)
            
            # RULE 1: Only schedule arrears for active enrolled students in uploaded regular files
            if student_master_db and p_id not in student_master_db:
                continue

            m_info = student_master_db.get(p_id, {"name": arr["name"], "branch": arr["branch"], "year": arr["year"], "roll_no": arr["roll_no"]})
            r_no = m_info.get("roll_no", arr.get("roll_no"))

            # RULE 2: Lateral Entry students joined in Sem 3 -> MUST NOT receive Sem 1 or Sem 2 arrears
            if is_lateral_entry_student(r_no, p_id) and arr_sem in [1, 2]:
                continue

            if (p_id, c_code) in seen_arrears:
                continue
            seen_arrears.add((p_id, c_code))
            
            arr["name"] = m_info["name"]
            arr["branch"] = m_info["branch"]
            arr["current_year"] = m_info.get("year", 1)
            arr["roll_no"] = r_no
                
            all_enrolments.append(arr)
            
    return all_enrolments


def _roll_range(reg_nos: list) -> str:
    if not reg_nos:
        return ""
    s = sorted(reg_nos)
    return f"{s[0]}–{s[-1]}"


def build_dept_roll_ranges(enrolments: list) -> dict:
    """Build {branch: {semester: 'MIN–MAX'}} roll ranges."""
    dept_sem_rolls = defaultdict(list)
    for row in enrolments:
        branch = row.get("branch") or "GENERAL"
        sem = row.get("semester", 1)
        reg = row.get("reg_no") or row.get("roll_no") or ""
        if reg:
            dept_sem_rolls[(branch, sem)].append(reg)

    result = defaultdict(dict)
    for (branch, sem), rolls in dept_sem_rolls.items():
        result[branch][sem] = _roll_range(rolls)
    return dict(result)
