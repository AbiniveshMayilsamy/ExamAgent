"""
generate_mock_students.py
Generates two realistic mock CSV files matching the real college format:

  Mock_Regular_Details_AM2026.csv  — regular exam enrolments only
  Mock_Arrear_Details_AM2026.csv   — arrear exam enrolments only

Reg No format : 7228 YY BBB RRR
  7228 = college code
  YY   = batch year (23/24/25/26)
  BBB  = dept code (104=CSE, 105=EEE, 106=ECE, 114=MECH, 148=AIML,
                    149=CSY, 205=IT, 243=AI&DS, 244=CSBS, 134=CCE)
  RRR  = roll number (001–NNN)

Batch → Regular Semester (Odd semester session):
  26 → Sem 1   (1st year)
  25 → Sem 3   (2nd year)
  24 → Sem 5   (3rd year)
  23 → Sem 7   (4th year)

Course code format: U23XXNNN  (matches real data like U23MA204, U23CS403)

Mix:
  ~75% students  → regular only  (appear only in regular file)
  ~20% students  → regular + arrear (appear in both files)
  ~5%  students  → arrear only   (appear only in arrear file, rare edge case)
"""

import csv
import os
import random

random.seed(2026)

# ── Department registry ───────────────────────────────────────────────────────
DEPTS = [
    {"name": "CSE",   "code": "104", "batches": ["23","24","25","26"], "sizes": {"23":120,"24":130,"25":140,"26":140}},
    {"name": "ECE",   "code": "106", "batches": ["23","24","25","26"], "sizes": {"23":100,"24":115,"25":120,"26":120}},
    {"name": "EEE",   "code": "105", "batches": ["23","24","25","26"], "sizes": {"23":60,"24":70,"25":75,"26":75}},
    {"name": "MECH",  "code": "114", "batches": ["23","24","25","26"], "sizes": {"23":80,"24":90,"25":100,"26":100}},
    {"name": "AIML",  "code": "148", "batches": ["23","24","25","26"], "sizes": {"23":70,"24":80,"25":90,"26":90}},
    {"name": "AI&DS", "code": "243", "batches": ["23","24","25","26"], "sizes": {"23":70,"24":80,"25":90,"26":90}},
    {"name": "IT",    "code": "205", "batches": ["23","24","25","26"], "sizes": {"23":60,"24":70,"25":75,"26":75}},
    {"name": "CSBS",  "code": "244", "batches": ["23","24","25","26"], "sizes": {"23":50,"24":60,"25":65,"26":65}},
    {"name": "CCE",   "code": "134", "batches": ["23","24","25","26"], "sizes": {"23":40,"24":50,"25":55,"26":55}},
]

BATCH_TO_SEM = {"26": 1, "25": 3, "24": 5, "23": 7}

# ── Course catalogue per dept per semester ────────────────────────────────────
# Format: (code, name)  — code matches U23XXNNN style
COURSES = {
    # Sem 1 — common across most depts
    1: {
        "ALL": [
            ("U23MA101", "Engineering Mathematics I"),
            ("U23PH101", "Engineering Physics"),
            ("U23EN101", "English Communication"),
            ("U23CS101", "Problem Solving & C Programming"),
            ("U23EG101", "Engineering Graphics"),
        ]
    },
    # Sem 3 — dept-specific
    3: {
        "CSE":   [("U23MA204","Discrete Mathematics"),("U23CS403","Design & Analysis of Algorithms"),
                  ("U23CS404","Database Management Systems"),("U23CS491","Operating Systems"),
                  ("U23IT481","Web Technologies"),("U23AM495","Probability & Statistics")],
        "ECE":   [("U23MA207","Transform Techniques"),("U23EC403","Analog Circuits"),
                  ("U23EC421","Signals & Systems"),("U23EC422","Digital Electronics"),
                  ("U23CS491","Operating Systems"),("U23OCS82","Open Elective-CS")],
        "EEE":   [("U23MA207","Transform Techniques"),("U23EE403","Electrical Machines I"),
                  ("U23EE402","Network Theory"),("U23CS303","Digital Logic"),
                  ("U23CS491","Operating Systems"),("U23OCS82","Open Elective-CS")],
        "MECH":  [("U23MA208","Numerical Methods"),("U23ME402","Fluid Mechanics"),
                  ("U23ME403","Manufacturing Processes"),("U23ME481","Strength of Materials"),
                  ("U23EC381","Basic Electronics"),("U23OAD81","Open Elective-AD")],
        "AIML":  [("U23MA204","Discrete Mathematics"),("U23CS403","Design & Analysis of Algorithms"),
                  ("U23CS404","Database Management Systems"),("U23CS491","Operating Systems"),
                  ("U23AD483","Machine Learning Fundamentals")],
        "AI&DS": [("U23MA204","Discrete Mathematics"),("U23CS403","Design & Analysis of Algorithms"),
                  ("U23CS404","Database Management Systems"),("U23EC382","Signals & Systems"),
                  ("U23CS491","Operating Systems"),("U23AD491","AI Fundamentals")],
        "IT":    [("U23MA204","Discrete Mathematics"),("U23CS403","Design & Analysis of Algorithms"),
                  ("U23CS404","Database Management Systems"),("U23EC382","Signals & Systems"),
                  ("U23CS491","Operating Systems"),("U23IT481","Web Technologies")],
        "CSBS":  [("U23MA204","Discrete Mathematics"),("U23CS403","Design & Analysis of Algorithms"),
                  ("U23CS404","Database Management Systems"),("U23EC382","Signals & Systems"),
                  ("U23CS491","Operating Systems"),("U23MA281","Business Statistics")],
        "CCE":   [("U23MA207","Transform Techniques"),("U23CS403","Design & Analysis of Algorithms"),
                  ("U23CS404","Database Management Systems"),("U23EC382","Signals & Systems"),
                  ("U23CS491","Operating Systems")],
    },
    # Sem 5 — dept-specific
    5: {
        "CSE":   [("U23CS405","Computer Networks"),("U23EC383","Microprocessors"),
                  ("U23CS584","Compiler Design"),("U23CS591","Software Engineering"),
                  ("U23CC583","Cloud Computing"),("U23IT593","Information Security"),
                  ("U23EC382","Signals & Systems"),("U23CB593","Blockchain Basics"),
                  ("U23AD491","AI Fundamentals")],
        "ECE":   [("U23EC492","Digital Signal Processing"),("U23EC407","VLSI Design"),
                  ("U23EC408","Communication Systems"),("U23EC482","Embedded Systems"),
                  ("U23EC514","Microwave Engineering"),("U23EC581","Optical Communication"),
                  ("U23EC592","Wireless Networks"),("U23EC595","Control Systems")],
        "EEE":   [("U23EE407","Power Electronics"),("U23EE408","Electric Drives"),
                  ("U23EE491","Control Systems"),("U23EE582","Power Systems II"),
                  ("U23EE585","Renewable Energy"),("U23EE409","Smart Grid"),
                  ("U23OCS85","Open Elective-CS")],
        "MECH":  [("U23ME405","CAD/CAM"),("U23ME406","Heat Transfer"),
                  ("U23ME407","Machine Design"),("U23ME522","Robotics"),
                  ("U23AM499","Operations Research"),("U23ME484","Finite Element Analysis"),
                  ("U23ME592","Automobile Engineering"),("U23ME594","Industrial Engineering"),
                  ("U23ME541","Mechatronics")],
        "AIML":  [("U23AD511","Deep Learning"),("U23AM492","Natural Language Processing"),
                  ("U23AD484","Computer Vision"),("U23IT484","IoT Systems"),
                  ("U23EC382","Signals & Systems"),("U23CB593","Blockchain Basics"),
                  ("U23EC384","Microprocessors"),("U23CS522","Generative AI")],
        "AI&DS": [("U23AD401","Machine Learning"),("U23AD484","Computer Vision"),
                  ("U23IT484","IoT Systems"),("U23AM491","Data Analytics"),
                  ("U23CB593","Blockchain Basics"),("U23EC384","Microprocessors")],
        "IT":    [("U23IT403","Network Security"),("U23EC383","Microprocessors"),
                  ("U23OME81","Open Elective-ME"),("U23AM495","Probability & Statistics"),
                  ("U23CB593","Blockchain Basics"),("U23AD491","AI Fundamentals")],
        "CSBS":  [("U23CB582","Business Intelligence"),("U23CS405","Computer Networks"),
                  ("U23OEC84","Open Elective-EC"),("U23IT402","Web Development"),
                  ("U23AM495","Probability & Statistics"),("U23CB593","Blockchain Basics"),
                  ("U23IT481","Web Technologies"),("U23CB514","FinTech")],
        "CCE":   [("U23CC401","Embedded Systems"),("U23CC483","VLSI Design"),
                  ("U23IT402","Web Development"),("U23AM498","Operations Research"),
                  ("U23CB593","Blockchain Basics"),("U23AD491","AI Fundamentals")],
    },
    # Sem 7 — dept-specific
    7: {
        "CSE":   [("U23CB103","Project Phase I"),("U23CB104","Professional Ethics"),
                  ("U23IT483","Advanced Algorithms"),("U23CS531","Deep Learning"),
                  ("U23OEC84","Open Elective-EC")],
        "ECE":   [("U23CB103","Project Phase I"),("U23CB104","Professional Ethics"),
                  ("U23EC411","Advanced Communication"),("U23EC483","Satellite Systems"),
                  ("U23EC551","5G Technologies"),("U23OME01","Open Elective-ME")],
        "EEE":   [("U23CB103","Project Phase I"),("U23CB104","Professional Ethics"),
                  ("U23EE413","Advanced Power Systems"),("U23EE582","Power Quality"),
                  ("U23EE514","Electric Vehicles"),("U23EE544","Smart Grid Advanced"),
                  ("U23EE522","FACTS Devices"),("U23EE524","Energy Audit")],
        "MECH":  [("U23CB103","Project Phase I"),("U23CB104","Professional Ethics"),
                  ("U23CS588","Industry 4.0"),("U23EE524","Energy Audit"),
                  ("U23AM584","Advanced Manufacturing"),("U23ME410","Product Design"),
                  ("U23ME552","Tribology"),("U23AM586","Operations Management"),
                  ("U23ME541","Mechatronics"),("U23CS521","AI for Engineers"),
                  ("U23EE522","FACTS Devices"),("U23AM581","Supply Chain"),
                  ("U23ME592","Automobile Engineering"),("U23ME594","Industrial Engineering")],
        "AIML":  [("U23CB103","Project Phase I"),("U23CB104","Professional Ethics"),
                  ("U23CS522","Generative AI"),("U23IT483","Advanced Algorithms"),
                  ("U23OME07","Open Elective-ME"),("U23AD511","Deep Learning")],
        "AI&DS": [("U23CB103","Project Phase I"),("U23CB104","Professional Ethics"),
                  ("U23AM586","Operations Management"),("U23OME06","Open Elective-ME"),
                  ("U23AD511","Deep Learning")],
        "IT":    [("U23CB103","Project Phase I"),("U23CB104","Professional Ethics"),
                  ("U23CB532","Blockchain Applications"),("U23OME07","Open Elective-ME"),
                  ("U23IT523","Advanced Networks")],
        "CSBS":  [("U23CB582","Business Intelligence"),("U23CB403","Strategic IT"),
                  ("U23CB491","Data Science"),("U23CB514","FinTech"),
                  ("U23OME07","Open Elective-ME")],
        "CCE":   [("U23CB103","Project Phase I"),("U23CB104","Professional Ethics"),
                  ("U23CC583","Advanced Embedded"),("U23OME06","Open Elective-ME")],
    },
}

# Arrear courses: older semester courses a student might have failed
# NOTE: Sem 1 arrears only assigned to Sem 3+ students (not Sem 7) to avoid
# same-day clashes between Sem 1 regular and Sem 1 arrear exams.
ARREAR_POOL = {
    "CSE":   {3: ["U23MA204","U23CS403","U23CS404","U23CS491"],
              5: ["U23CS405","U23CS584","U23CS591"]},
    "ECE":   {3: ["U23MA207","U23EC403","U23EC421","U23EC422"],
              5: ["U23EC492","U23EC407","U23EC408"]},
    "EEE":   {3: ["U23MA207","U23EE403","U23EE402"],
              5: ["U23EE407","U23EE408","U23EE491"]},
    "MECH":  {3: ["U23MA208","U23ME402","U23ME403"],
              5: ["U23ME405","U23ME406","U23ME407"]},
    "AIML":  {3: ["U23MA204","U23CS403","U23CS404"],
              5: ["U23AD511","U23AM492","U23AD484"]},
    "AI&DS": {3: ["U23MA204","U23CS403","U23CS404"],
              5: ["U23AD401","U23AD484","U23AM491"]},
    "IT":    {3: ["U23MA204","U23CS403","U23CS404"],
              5: ["U23IT403","U23EC383"]},
    "CSBS":  {3: ["U23MA204","U23CS403","U23CS404"],
              5: ["U23CB582","U23CS405"]},
    "CCE":   {3: ["U23MA207","U23CS403","U23CS404"],
              5: ["U23CC401","U23CC483"]},
}

# Sem 1 arrear pool — only for Sem 3 and Sem 5 students
ARREAR_POOL_SEM1 = {
    "CSE":   ["U23MA101","U23CS101","U23PH101"],
    "ECE":   ["U23MA101","U23PH101","U23EN101"],
    "EEE":   ["U23MA101","U23PH101","U23EN101"],
    "MECH":  ["U23MA101","U23PH101","U23EN101"],
    "AIML":  ["U23MA101","U23CS101","U23PH101"],
    "AI&DS": ["U23MA101","U23CS101","U23PH101"],
    "IT":    ["U23MA101","U23CS101","U23PH101"],
    "CSBS":  ["U23MA101","U23CS101","U23PH101"],
    "CCE":   ["U23MA101","U23PH101","U23EN101"],
}

NAMES = [
    "Aarav Kumar","Aditya Sharma","Akash Patel","Ananya Singh","Anjali Reddy",
    "Arjun Nair","Aryan Pillai","Bhavya Iyer","Deepak Menon","Deepika Krishnan",
    "Divya Rajan","Ganesh Subramaniam","Harini Murugan","Harish Selvam","Ishaan Pandian",
    "Ishita Arumugam","Karthik Natarajan","Kavya Venkatesh","Keerthana Balasubramanian","Kishore Ramasamy",
    "Krithika Gopal","Lakshmi Sundar","Lavanya Anand","Manoj Chandrasekaran","Meena Raghavan",
    "Mohan Srinivasan","Nandini Muthukumar","Naveen Palaniswamy","Nithya Duraisamy","Pooja Thangavel",
    "Pradeep Kumar","Pranav Sharma","Priya Patel","Rahul Singh","Raja Reddy",
    "Rajesh Nair","Ramya Pillai","Ravi Iyer","Rohit Menon","Sanjay Krishnan",
    "Saravanan Rajan","Sathish Subramaniam","Shruti Murugan","Sindhu Selvam","Sneha Pandian",
    "Suresh Arumugam","Swetha Natarajan","Tamil Venkatesh","Tharun Balasubramanian","Usha Ramasamy",
    "Vaishnavi Gopal","Vijay Sundar","Vikram Anand","Vinay Chandrasekaran","Vishal Raghavan",
    "Yamini Srinivasan","Yuvan Muthukumar","Arun Palaniswamy","Balaji Duraisamy","Chandru Thangavel",
    "Dhanush Kumar","Eswari Sharma","Fathima Patel","Gokul Singh","Hema Reddy",
    "Indira Nair","Jayesh Pillai","Kiran Iyer","Logesh Menon","Madhan Krishnan",
    "Nandhini Rajan","Oviya Subramaniam","Pavithra Murugan","Ragul Selvam","Saranya Pandian",
    "Tamilarasi Arumugam","Uma Natarajan","Venkat Venkatesh","Abinivesh Mayilsamy","Sriram Govindan",
]


def make_reg_no(batch: str, dept_code: str, roll: int) -> str:
    return f"7228{batch}{dept_code}{roll:03d}"


def get_courses_for_sem(dept: str, sem: int) -> list:
    if sem == 1:
        return COURSES[1]["ALL"]
    return COURSES.get(sem, {}).get(dept, [])


def generate():
    regular_rows = []   # goes to Mock_Regular_Details_AM2026.csv
    arrear_rows = []    # goes to Mock_Arrear_Details_AM2026.csv

    sl_reg = 1
    sl_arr = 1

    for dept_info in DEPTS:
        dept = dept_info["name"]
        dept_code = dept_info["code"]

        for batch in dept_info["batches"]:
            reg_sem = BATCH_TO_SEM[batch]
            n_students = dept_info["sizes"][batch]

            # Assign names (cycle through pool)
            for roll in range(1, n_students + 1):
                reg_no = make_reg_no(batch, dept_code, roll)
                name = NAMES[(roll - 1) % len(NAMES)]

                # ── Regular courses for this student ──────────────────────
                courses = get_courses_for_sem(dept, reg_sem)
                for (code, cname) in courses:
                    regular_rows.append({
                        "Sl. No.": sl_reg,
                        "Branch": dept,
                        "Sem": reg_sem,
                        "Code": code,
                        "Register Number": reg_no,
                        "Name": name,
                    })
                    sl_reg += 1

                # ── Arrear assignment ─────────────────────────────────────
                # ~75% students: regular only → no arrear
                # ~20% students: regular + arrear (1–2 arrear courses)
                # ~5%  students: arrear only (skip regular, add arrear)
                rng = random.random()

                if rng < 0.02:
                    # Arrear-only student (~2%)
                    regular_rows = [r for r in regular_rows if r["Register Number"] != reg_no]
                    sl_reg -= len(courses)

                    arr_sem_options = [s for s in ARREAR_POOL.get(dept, {}) if s < reg_sem]
                    # Add Sem 1 arrear option only for Sem 3 and Sem 5 students
                    if reg_sem in (3, 5) and dept in ARREAR_POOL_SEM1:
                        arr_sem_options = [1] + arr_sem_options
                    if arr_sem_options:
                        arr_sem = random.choice(arr_sem_options)
                        pool = ARREAR_POOL_SEM1[dept] if arr_sem == 1 else ARREAR_POOL[dept][arr_sem]
                        n_arr = random.randint(1, min(2, len(pool)))
                        for code in random.sample(pool, n_arr):
                            arrear_rows.append({
                                "Sl. No.": sl_arr,
                                "Branch": dept,
                                "Sem": arr_sem,
                                "Code": code,
                                "Register Number": reg_no,
                                "Name": name,
                            })
                            sl_arr += 1

                elif rng < 0.10:  # ~8% regular + arrear
                    # Regular + arrear student
                    arr_sem_options = [s for s in ARREAR_POOL.get(dept, {}) if s < reg_sem]
                    # Add Sem 1 arrear option only for Sem 3 and Sem 5 students
                    if reg_sem in (3, 5) and dept in ARREAR_POOL_SEM1:
                        arr_sem_options = [1] + arr_sem_options
                    if arr_sem_options:
                        arr_sem = random.choice(arr_sem_options)
                        pool = ARREAR_POOL_SEM1[dept] if arr_sem == 1 else ARREAR_POOL[dept][arr_sem]
                        n_arr = random.randint(1, min(2, len(pool)))
                        for code in random.sample(pool, n_arr):
                            arrear_rows.append({
                                "Sl. No.": sl_arr,
                                "Branch": dept,
                                "Sem": arr_sem,
                                "Code": code,
                                "Register Number": reg_no,
                                "Name": name,
                            })
                            sl_arr += 1
                # else: regular-only (no arrear added)

    return regular_rows, arrear_rows


def write_csv(rows: list, path: str, fields: list):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  Saved {len(rows):,} rows -> {os.path.basename(path)}")


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "..")
    out_dir = os.path.abspath(out_dir)

    print("Generating mock dataset...")
    regular_rows, arrear_rows = generate()

    # Count unique students
    reg_students  = len({r["Register Number"] for r in regular_rows})
    arr_students  = len({r["Register Number"] for r in arrear_rows})
    both_students = len(
        {r["Register Number"] for r in regular_rows} &
        {r["Register Number"] for r in arrear_rows}
    )

    print(f"\n  Regular rows   : {len(regular_rows):,}")
    print(f"  Arrear rows    : {len(arrear_rows):,}")
    print(f"  Regular-only students : {reg_students - both_students:,}")
    print(f"  Arrear-only students  : {arr_students - both_students:,}")
    print(f"  Both (reg+arrear)     : {both_students:,}")
    print(f"  Total unique students : {len({r['Register Number'] for r in regular_rows + arrear_rows}):,}")

    fields = ["Sl. No.", "Branch", "Sem", "Code", "Register Number", "Name"]

    reg_path = os.path.join(out_dir, "Mock_Regular_Details_AM2026.csv")
    arr_path = os.path.join(out_dir, "Mock_Arrear_Details_AM2026.csv")

    print()
    write_csv(regular_rows, reg_path, fields)
    write_csv(arrear_rows,  arr_path, fields)
    print("\nDone.")

    # Print sample
    print("\nSample Regular rows:")
    for r in regular_rows[:4]:
        print(f"  {r['Register Number']}  Sem {r['Sem']}  {r['Code']}  {r['Name']}")
    print("\nSample Arrear rows:")
    for r in arrear_rows[:4]:
        print(f"  {r['Register Number']}  Sem {r['Sem']}  {r['Code']}  {r['Name']}")


if __name__ == "__main__":
    main()
