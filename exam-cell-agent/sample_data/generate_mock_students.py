"""
generate_mock_students.py
Generates a realistic mock student CSV for the exam cell system.

Departments & roll prefixes:
  CSE  → CS   (e.g. 24CS001)
  IT   → IT   (e.g. 24IT001)
  CSBS → CB   (e.g. 24CB001)
  AIML → AM   (e.g. 24AM001)
  ECE  → EC   (e.g. 24EC001)
  EEE  → EE   (e.g. 24EE001)
  MECH → ME   (e.g. 24ME001)
  CIVIL→ CV   (e.g. 24CV001)

Semesters: 1 to 8 (4 years × 2 sems)
Sections per class: 1–3 (randomised per dept/year)
Students per section: 70–75
~10% students have 1 arrear (a course from a previous semester)
"""

import csv
import random
import os

random.seed(42)

YEAR = 24  # batch year prefix

DEPARTMENTS = [
    {"name": "CSE",   "code": "CS", "semesters": [1,2,3,4,5,6,7,8]},
    {"name": "AIML",  "code": "AM", "semesters": [1,2,3,4,5,6,7,8]},
    {"name": "CCE",   "code": "CC", "semesters": [1,2,3,4,5,6,7,8]},
    {"name": "CYSE",  "code": "CY", "semesters": [1,2,3,4,5,6,7,8]},
    {"name": "MECH",  "code": "ME", "semesters": [1,2,3,4,5,6,7,8]},
    {"name": "ECE",   "code": "EC", "semesters": [1,2,3,4,5,6,7,8]},
    {"name": "VLSI",  "code": "VL", "semesters": [1,2,3,4,5,6,7,8]},
    {"name": "EEE",   "code": "EE", "semesters": [1,2,3,4,5,6,7,8]},
    {"name": "AIDS",  "code": "AD", "semesters": [1,2,3,4,5,6,7,8]},
    {"name": "CSBS",  "code": "CB", "semesters": [1,2,3,4,5,6,7,8]},
    {"name": "IT",    "code": "IT", "semesters": [1,2,3,4,5,6,7,8]},
    {"name": "S&H",   "code": "SH", "semesters": [1,2,3,4]},
]

# Courses per department per semester
COURSES = {
    "CSE": {
        1: [("MA101","Engineering Mathematics I","medium"),("PH101","Engineering Physics","easy"),("CS101","Problem Solving & C","hard"),("EN101","English Communication","easy"),("CS102","Digital Fundamentals","medium")],
        2: [("MA102","Engineering Mathematics II","medium"),("CS201","Data Structures","hard"),("CS202","Object Oriented Programming","hard"),("EC201","Electronic Circuits","medium"),("EN102","Technical Writing","easy")],
        3: [("MA301","Discrete Mathematics","hard"),("CS301","Design & Analysis of Algorithms","hard"),("CS302","Database Management Systems","medium"),("CS303","Computer Organization","medium"),("CS304","Operating Systems","hard")],
        4: [("CS401","Computer Networks","hard"),("CS402","Software Engineering","medium"),("CS403","Theory of Computation","hard"),("CS404","Microprocessors","medium"),("MA401","Probability & Statistics","medium")],
        5: [("CS501","Compiler Design","hard"),("CS502","Artificial Intelligence","hard"),("CS503","Web Technologies","medium"),("CS504","Information Security","medium"),("CS505","Mobile Computing","easy")],
        6: [("CS601","Machine Learning","hard"),("CS602","Cloud Computing","medium"),("CS603","Big Data Analytics","hard"),("CS604","Internet of Things","medium"),("CS605","Distributed Systems","hard")],
        7: [("CS701","Deep Learning","hard"),("CS702","Natural Language Processing","hard"),("CS703","Blockchain Technology","medium"),("CS704","Project Phase I","easy")],
        8: [("CS801","Project Phase II","easy"),("CS802","Professional Ethics","easy"),("CS803","Elective I","medium")],
    },
    "IT": {
        1: [("MA101","Engineering Mathematics I","medium"),("PH101","Engineering Physics","easy"),("IT101","Fundamentals of IT","medium"),("EN101","English Communication","easy"),("IT102","Digital Logic","medium")],
        2: [("MA102","Engineering Mathematics II","medium"),("IT201","Data Structures","hard"),("IT202","Java Programming","hard"),("IT203","Computer Architecture","medium"),("EN102","Technical Writing","easy")],
        3: [("MA301","Discrete Mathematics","hard"),("IT301","Algorithms","hard"),("IT302","Database Systems","medium"),("IT303","Operating Systems","hard"),("IT304","Computer Networks","hard")],
        4: [("IT401","Software Engineering","medium"),("IT402","Web Development","medium"),("IT403","Network Security","hard"),("IT404","Mobile App Development","medium"),("MA401","Probability & Statistics","medium")],
        5: [("IT501","Cloud Infrastructure","medium"),("IT502","Data Mining","hard"),("IT503","DevOps","medium"),("IT504","UI/UX Design","easy"),("IT505","Cyber Security","hard")],
        6: [("IT601","Machine Learning","hard"),("IT602","Big Data","hard"),("IT603","Microservices","medium"),("IT604","AR/VR Technologies","medium"),("IT605","IT Project Management","easy")],
        7: [("IT701","AI Applications","hard"),("IT702","Blockchain","medium"),("IT703","Elective I","medium"),("IT704","Project Phase I","easy")],
        8: [("IT801","Project Phase II","easy"),("IT802","Professional Ethics","easy"),("IT803","Elective II","medium")],
    },
    "CSBS": {
        1: [("MA101","Engineering Mathematics I","medium"),("PH101","Engineering Physics","easy"),("CB101","Intro to Business Systems","easy"),("EN101","English Communication","easy"),("CB102","Programming Fundamentals","medium")],
        2: [("MA102","Engineering Mathematics II","medium"),("CB201","Data Structures","hard"),("CB202","Business Analytics","medium"),("CB203","Statistics for Business","medium"),("EN102","Technical Writing","easy")],
        3: [("MA301","Discrete Mathematics","hard"),("CB301","Algorithms","hard"),("CB302","Database for Business","medium"),("CB303","ERP Systems","medium"),("CB304","Operating Systems","hard")],
        4: [("CB401","Business Intelligence","hard"),("CB402","Supply Chain Management","medium"),("CB403","Network Security","hard"),("CB404","E-Commerce","medium"),("MA401","Probability & Statistics","medium")],
        5: [("CB501","Machine Learning for Business","hard"),("CB502","Data Warehousing","hard"),("CB503","Digital Marketing","easy"),("CB504","Financial Technology","medium"),("CB505","Cloud for Business","medium")],
        6: [("CB601","AI in Business","hard"),("CB602","Business Process Automation","medium"),("CB603","Predictive Analytics","hard"),("CB604","IT Governance","easy"),("CB605","Elective I","medium")],
        7: [("CB701","Deep Learning Applications","hard"),("CB702","Strategic IT Management","medium"),("CB703","Elective II","medium"),("CB704","Project Phase I","easy")],
        8: [("CB801","Project Phase II","easy"),("CB802","Professional Ethics","easy"),("CB803","Elective III","medium")],
    },
    "AIML": {
        1: [("MA101","Engineering Mathematics I","medium"),("PH101","Engineering Physics","easy"),("AM101","Intro to AI & ML","medium"),("EN101","English Communication","easy"),("AM102","Python Programming","medium")],
        2: [("MA102","Engineering Mathematics II","medium"),("AM201","Data Structures","hard"),("AM202","Linear Algebra for ML","hard"),("AM203","Statistics & Probability","medium"),("EN102","Technical Writing","easy")],
        3: [("MA301","Discrete Mathematics","hard"),("AM301","Machine Learning Fundamentals","hard"),("AM302","Database Systems","medium"),("AM303","Computer Vision Basics","hard"),("AM304","Operating Systems","hard")],
        4: [("AM401","Deep Learning","hard"),("AM402","Natural Language Processing","hard"),("AM403","Reinforcement Learning","hard"),("AM404","Big Data Technologies","hard"),("MA401","Probability & Statistics","medium")],
        5: [("AM501","Advanced Deep Learning","hard"),("AM502","AI Ethics","easy"),("AM503","Generative AI","hard"),("AM504","MLOps","medium"),("AM505","Computer Networks","medium")],
        6: [("AM601","Large Language Models","hard"),("AM602","AI in Healthcare","medium"),("AM603","Autonomous Systems","hard"),("AM604","Edge AI","medium"),("AM605","Elective I","medium")],
        7: [("AM701","Research Methodology","medium"),("AM702","AI Product Development","medium"),("AM703","Elective II","medium"),("AM704","Project Phase I","easy")],
        8: [("AM801","Project Phase II","easy"),("AM802","Professional Ethics","easy"),("AM803","Elective III","medium")],
    },
    "ECE": {
        1: [("MA101","Engineering Mathematics I","medium"),("PH101","Engineering Physics","easy"),("EC101","Basic Electronics","medium"),("EN101","English Communication","easy"),("EC102","Circuit Theory","hard")],
        2: [("MA102","Engineering Mathematics II","medium"),("EC201","Electronic Devices","hard"),("EC202","Signals & Systems","hard"),("EC203","Network Analysis","hard"),("EN102","Technical Writing","easy")],
        3: [("MA301","Discrete Mathematics","hard"),("EC301","Digital Electronics","hard"),("EC302","Analog Circuits","hard"),("EC303","Electromagnetic Theory","hard"),("EC304","Microprocessors","medium")],
        4: [("EC401","Communication Systems","hard"),("EC402","VLSI Design","hard"),("EC403","Control Systems","hard"),("EC404","Antenna Theory","medium"),("MA401","Probability & Statistics","medium")],
        5: [("EC501","Digital Signal Processing","hard"),("EC502","Wireless Communication","hard"),("EC503","Embedded Systems","medium"),("EC504","Optical Communication","medium"),("EC505","Microwave Engineering","hard")],
        6: [("EC601","IoT Systems","medium"),("EC602","5G Technologies","hard"),("EC603","FPGA Design","hard"),("EC604","Radar Systems","hard"),("EC605","Elective I","medium")],
        7: [("EC701","Advanced Communication","hard"),("EC702","Satellite Communication","medium"),("EC703","Elective II","medium"),("EC704","Project Phase I","easy")],
        8: [("EC801","Project Phase II","easy"),("EC802","Professional Ethics","easy"),("EC803","Elective III","medium")],
    },
    "EEE": {
        1: [("MA101","Engineering Mathematics I","medium"),("PH101","Engineering Physics","easy"),("EE101","Basic Electrical Engineering","medium"),("EN101","English Communication","easy"),("EE102","Circuit Analysis","hard")],
        2: [("MA102","Engineering Mathematics II","medium"),("EE201","Electrical Machines I","hard"),("EE202","Network Theory","hard"),("EE203","Electronic Devices","medium"),("EN102","Technical Writing","easy")],
        3: [("MA301","Discrete Mathematics","hard"),("EE301","Electrical Machines II","hard"),("EE302","Power Systems I","hard"),("EE303","Control Systems","hard"),("EE304","Measurements","medium")],
        4: [("EE401","Power Systems II","hard"),("EE402","Power Electronics","hard"),("EE403","Microprocessors","medium"),("EE404","High Voltage Engineering","hard"),("MA401","Probability & Statistics","medium")],
        5: [("EE501","Electric Drives","hard"),("EE502","Renewable Energy","medium"),("EE503","Digital Signal Processing","hard"),("EE504","Smart Grid","medium"),("EE505","Switchgear & Protection","hard")],
        6: [("EE601","FACTS Devices","hard"),("EE602","Energy Audit","medium"),("EE603","PLC & SCADA","medium"),("EE604","Elective I","medium"),("EE605","Power Quality","hard")],
        7: [("EE701","Advanced Power Systems","hard"),("EE702","Electric Vehicles","medium"),("EE703","Elective II","medium"),("EE704","Project Phase I","easy")],
        8: [("EE801","Project Phase II","easy"),("EE802","Professional Ethics","easy"),("EE803","Elective III","medium")],
    },
    "MECH": {
        1: [("MA101","Engineering Mathematics I","medium"),("PH101","Engineering Physics","easy"),("ME101","Engineering Graphics","medium"),("EN101","English Communication","easy"),("ME102","Workshop Practice","easy")],
        2: [("MA102","Engineering Mathematics II","medium"),("ME201","Engineering Mechanics","hard"),("ME202","Thermodynamics","hard"),("ME203","Material Science","medium"),("EN102","Technical Writing","easy")],
        3: [("MA301","Discrete Mathematics","hard"),("ME301","Fluid Mechanics","hard"),("ME302","Manufacturing Processes","medium"),("ME303","Strength of Materials","hard"),("ME304","Kinematics of Machinery","hard")],
        4: [("ME401","Heat Transfer","hard"),("ME402","Machine Design","hard"),("ME403","Dynamics of Machinery","hard"),("ME404","Metrology","medium"),("MA401","Probability & Statistics","medium")],
        5: [("ME501","CAD/CAM","medium"),("ME502","Refrigeration & AC","medium"),("ME503","Finite Element Analysis","hard"),("ME504","Industrial Engineering","medium"),("ME505","Robotics","hard")],
        6: [("ME601","Automobile Engineering","medium"),("ME602","Mechatronics","hard"),("ME603","Operations Research","hard"),("ME604","Elective I","medium"),("ME605","Non-Destructive Testing","medium")],
        7: [("ME701","Advanced Manufacturing","hard"),("ME702","Product Design","medium"),("ME703","Elective II","medium"),("ME704","Project Phase I","easy")],
        8: [("ME801","Project Phase II","easy"),("ME802","Professional Ethics","easy"),("ME803","Elective III","medium")],
    },
    "CIVIL": {
        1: [("MA101","Engineering Mathematics I","medium"),("PH101","Engineering Physics","easy"),("CV101","Engineering Drawing","medium"),("EN101","English Communication","easy"),("CV102","Building Materials","easy")],
        2: [("MA102","Engineering Mathematics II","medium"),("CV201","Surveying","medium"),("CV202","Mechanics of Solids","hard"),("CV203","Fluid Mechanics I","hard"),("EN102","Technical Writing","easy")],
        3: [("MA301","Discrete Mathematics","hard"),("CV301","Structural Analysis I","hard"),("CV302","Fluid Mechanics II","hard"),("CV303","Soil Mechanics","hard"),("CV304","Concrete Technology","medium")],
        4: [("CV401","Structural Analysis II","hard"),("CV402","Foundation Engineering","hard"),("CV403","Transportation Engineering","medium"),("CV404","Environmental Engineering","medium"),("MA401","Probability & Statistics","medium")],
        5: [("CV501","Design of RC Structures","hard"),("CV502","Water Resources Engineering","hard"),("CV503","Construction Management","medium"),("CV504","Remote Sensing & GIS","medium"),("CV505","Earthquake Engineering","hard")],
        6: [("CV601","Design of Steel Structures","hard"),("CV602","Urban Planning","medium"),("CV603","Pavement Design","medium"),("CV604","Elective I","medium"),("CV605","Quantity Surveying","easy")],
        7: [("CV701","Advanced Structural Design","hard"),("CV702","Smart Infrastructure","medium"),("CV703","Elective II","medium"),("CV704","Project Phase I","easy")],
        8: [("CV801","Project Phase II","easy"),("CV802","Professional Ethics","easy"),("CV803","Elective III","medium")],
    },
}

# Sections per dept per year (1–3)
SECTIONS = {
    "CSE":   {1:3, 2:3, 3:2, 4:2, 5:2, 6:1, 7:1, 8:1},
    "IT":    {1:2, 2:2, 3:2, 4:1, 5:1, 6:1, 7:1, 8:1},
    "CSBS":  {1:2, 2:2, 3:1, 4:1, 5:1, 6:1, 7:1, 8:1},
    "AIML":  {1:2, 2:2, 3:2, 4:1, 5:1, 6:1, 7:1, 8:1},
    "ECE":   {1:3, 2:3, 3:2, 4:2, 5:1, 6:1, 7:1, 8:1},
    "EEE":   {1:2, 2:2, 3:1, 4:1, 5:1, 6:1, 7:1, 8:1},
    "MECH":  {1:3, 2:3, 3:2, 4:2, 5:1, 6:1, 7:1, 8:1},
    "CIVIL": {1:2, 2:2, 3:1, 4:1, 5:1, 6:1, 7:1, 8:1},
}

FIRST_NAMES = [
    "Aarav","Aditya","Akash","Ananya","Anjali","Arjun","Aryan","Bhavya","Deepak","Deepika",
    "Divya","Ganesh","Harini","Harish","Ishaan","Ishita","Karthik","Kavya","Keerthana","Kishore",
    "Krithika","Kumar","Lakshmi","Lavanya","Manoj","Meena","Mohan","Nandini","Naveen","Nithya",
    "Pooja","Pradeep","Pranav","Priya","Rahul","Raja","Rajesh","Ramya","Ravi","Rohit",
    "Sanjay","Saravanan","Sathish","Shruti","Sindhu","Sneha","Suresh","Swetha","Tamil","Tharun",
    "Usha","Vaishnavi","Vijay","Vikram","Vinay","Vishal","Yamini","Yuvan","Zara","Arun",
    "Balaji","Chandru","Dhanush","Eswari","Fathima","Gokul","Hema","Indira","Jayesh","Kiran",
    "Logesh","Madhan","Nandhini","Oviya","Pavithra","Ragul","Saranya","Tamilarasi","Uma","Venkat",
]

LAST_NAMES = [
    "Kumar","Sharma","Patel","Singh","Reddy","Nair","Pillai","Iyer","Menon","Krishnan",
    "Rajan","Subramaniam","Murugan","Selvam","Pandian","Arumugam","Natarajan","Venkatesh","Balasubramanian","Ramasamy",
    "Gopal","Sundar","Anand","Chandrasekaran","Raghavan","Srinivasan","Muthukumar","Palaniswamy","Duraisamy","Thangavel",
]

def make_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def make_roll(dept_code, year, section_idx, student_idx):
    # Format: 24CS033  (year + dept_code + 3-digit number)
    # Section A: 001-075, B: 076-150, C: 151-225
    base = section_idx * 75 + student_idx + 1
    return f"{year}{dept_code}{base:03d}"

def generate():
    rows = []
    arrear_rows = []

    for dept in DEPARTMENTS:
        dname = dept["name"]
        dcode = dept["code"]
        courses_map = COURSES[dname]
        sections_map = SECTIONS[dname]

        for sem in dept["semesters"]:
            # Derive year from semester (sem 1-2 = year 1, etc.)
            acad_year = (sem + 1) // 2
            num_sections = sections_map.get(acad_year, 1)
            courses = courses_map.get(sem, [])

            for sec_idx in range(num_sections):
                section_label = chr(65 + sec_idx)  # A, B, C
                num_students = random.randint(70, 75)

                for stu_idx in range(num_students):
                    roll = make_roll(dcode, YEAR, sec_idx, stu_idx)
                    name = make_name()

                    for (code, cname, diff) in courses:
                        rows.append({
                            "name": name,
                            "reg_no": roll,
                            "course_code": code,
                            "course_name": cname,
                            "semester": sem,
                            "branch": dname,
                            "section": section_label,
                            "difficulty": diff,
                        })

                    # ~10% chance of 1 arrear from previous semester
                    if sem > 1 and random.random() < 0.10:
                        prev_sem = sem - 1
                        prev_courses = courses_map.get(prev_sem, [])
                        if prev_courses:
                            arrear_course = random.choice(prev_courses)
                            arrear_rows.append({
                                "name": name,
                                "reg_no": roll,
                                "course_code": arrear_course[0],
                                "course_name": arrear_course[1],
                                "semester": prev_sem,
                                "branch": dname,
                                "section": section_label,
                                "difficulty": arrear_course[2],
                            })

    all_rows = rows + arrear_rows
    print(f"Total rows: {len(all_rows):,}  (regular: {len(rows):,}, arrears: {len(arrear_rows):,})")
    return all_rows

def main():
    out_path = os.path.join(os.path.dirname(__file__), "mock_students.csv")
    data = generate()

    fieldnames = ["name","reg_no","course_code","course_name","semester","branch","section","difficulty"]
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)

    print(f"✅ Saved to: {out_path}")

    # Print sample
    print("\nSample rows:")
    for row in data[:5]:
        print(f"  {row['reg_no']}  {row['name']:<28}  Sem {row['semester']}  {row['course_code']}  {row['course_name']}")

if __name__ == "__main__":
    main()
