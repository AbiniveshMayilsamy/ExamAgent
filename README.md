# Agentverse - Multi-Agent AI Exam Scheduling System 🎓

An automated, rule-compliant, multi-agent AI exam timetable generation system for college exam cells. Built using a 7-Agent modular architecture, deterministic rule solver engines, Ollama Local LLM & Groq AI auditing, and an interactive real-time web dashboard.

---

## 🤖 System Architecture & 7 AI Agents

The system translates manual college exam cell procedures into **7 specialized, cooperating AI agents** governed by a central orchestrator hub:

| Agent | Name | Rules Enforced | Key Responsibilities |
|---|---|---|---|
| **Agent 1** | Calendar & Session Manager | Rule 1 (Max 2 sessions/day), Rule 8 (Leave days) | Builds the master slot grid (`FN` Forenoon & `AN` Afternoon), excluding holidays/leaves. |
| **Agent 3** | Common Course Matcher | Rule 3 (Cross-branch common courses), Rule 5 (Odd/Even cross-branch courses) | Clusters subjects shared across branches/semesters so they share identical exam slots. |
| **Agent 4** | Regular Stream Harmonizer | Rule 4 (Same-session semester exams across branches) | Maps regular semester subject clusters onto available slots using Year-Alternating Day Parity. |
| **Agent 5** | Spacing & Difficulty Evaluator | Rule 6 (Min 1-day study gap), Rule 9 (2-day gap before hard subjects) | Audits and inserts mandatory study rest days per branch/semester based on difficulty. |
| **Agent 6** | Arrear & Backlog Scheduler | Rule 7 (Arrears in secondary session) | Slots backlog/arrear exams into 3-tier preferred sessions without student clashes. |
| **Agent 2** | Student Conflict Checker | Rule 2 (Max 1 exam/student per session) | **The Gatekeeper**: Validates every student Registration Number to guarantee 0 exam collisions. |
| **Agent 7** | Cumulative Conflict Resolver | Rule 2 (Zero student clashes) | **Auto-Resolver**: Resolves multi-course clashes holistically by shifting slots. |

---

## 🗓️ Year-Alternating Exam Schedule Model

The engine implements a **Year-Alternating FN/AN Schedule** that ensures every student batch gets a mandatory study gap while fully utilizing every calendar day:

| Calendar Day | Session | Regular Exam Stream | Who is ON LEAVE? |
| :--- | :--- | :--- | :--- |
| **Day 1 (Mon)** | **FN (Morning)** | **2nd Year (Sem 3)** — All 10 Depts + Matching Arrears | 3rd & 4th Year **ON LEAVE** |
| **Day 1 (Mon)** | **AN (Afternoon)** | Excess / Non-sharing Arrears | 3rd & 4th Year **ON LEAVE** |
| **Day 2 (Tue)** | **FN (Morning)** | **3rd Year (Sem 5)** — All 10 Depts + Matching Arrears | 2nd Year **ON LEAVE** |
| **Day 2 (Tue)** | **AN (Afternoon)** | **4th Year (Sem 7)** — Regular Exams + Arrears | 2nd Year **ON LEAVE** |
| **Day 3 (Wed)** | **FN (Morning)** | **2nd Year (Sem 3)** — Exam #2 (All 10 Depts) | 3rd & 4th Year **ON LEAVE** |
| **Day 3 (Wed)** | **AN (Afternoon)** | Excess / Non-sharing Arrears | 3rd & 4th Year **ON LEAVE** |
| **Day 4 (Thu)** | **FN (Morning)** | **3rd Year (Sem 5)** — Exam #2 (All 10 Depts) | 2nd Year **ON LEAVE** |
| **Day 4 (Thu)** | **AN (Afternoon)** | **4th Year (Sem 7)** — Exam #2 + Arrears | 2nd Year **ON LEAVE** |

### Key Scheduling Guarantees:
- **1-Day Study Gap Guaranteed**: 2nd Year rests on Days 2, 4, 6... while 3rd & 4th Year rest on Days 1, 3, 5...
- **All Departments Synchronized**: On 2nd Year Days, all 10 departments write their Sem 3 exam together in `FN`. On 3rd Year Days, all 10 departments write their Sem 5 exam together in `FN`.
- **Fastest Conclusion**: All regular exams complete compactly in ~10 days without dragging out into mid-December.

---

## 🔄 Workflow Orchestration

```
┌─────────────────────────────────────────┐
│ Input Data: Name, Reg_No, Course, Sem   │
└────────────────────┬────────────────────┘
                     │
        ┌────────────▼────────────┐
        │  Agent 1: Calendar Grid │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │  Agent 3: Matcher       │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │  Agent 4: Harmonizer    │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │  Agent 5: Spacing       │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │  Agent 6: Arrears       │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │  Agent 7 & Agent 2      │ ── (Failure? Feedback loop to Agent 7 Auto-Resolver)
        └────────────┬────────────┘
                     │
           [ Zero Conflicts ✅ ]
                     │
        ┌────────────▼────────────┐
        │ Publish Schedule Grid   │
        └─────────────────────────┘
```

---

## 🚀 Features

- **Multi-Agent Orchestration**: 7 cooperating modules working via deterministic constraint engines and AI LLM auditing (**Ollama local `llama3` / `llama3.1`** & **Groq API**).
- **100% Collision-Free Guarantee**: Agent 2 & Agent 7 mathematically verify 0 double-bookings across all student registration numbers.
- **Universal Course Ingestion**: Pure-python zero-dependency Excel parser (`data_loader.py`) supporting 12-digit Anna University / Eshwar register numbers (`REG_DEPT_MAP`), Lateral Entry (LE) filtering, and dynamic Open Elective (`U23O...`) semester extraction.
- **Real-Time Web Dashboard**: Built with React, Node.js/Express CLI bridge, WebSocket progress streaming, interactive grid view, hall ticket modal, and Excel/CSV download.

---

## 📁 Repository Structure

```
Agentverse - V2/
├── README.md                      # Primary documentation
├── requirements.txt               # Python dependencies
├── start.bat                      # 1-Click Windows launcher script
├── exam-cell-agent/               # Python 7-Agent Core
│   ├── hub.py                     # Central orchestrator hub
│   ├── agent1_calendar.py         # Calendar & Session Manager
│   ├── agent2_conflict.py         # Student Conflict Checker
│   ├── agent3_matcher.py          # Common Course Matcher
│   ├── agent4_harmonizer.py       # Regular Stream Harmonizer
│   ├── agent5_spacing.py          # Spacing & Difficulty Evaluator
│   ├── agent6_arrear.py           # Arrear & Backlog Scheduler
│   ├── agent7_resolver.py         # Cumulative Conflict Resolver
│   ├── data_loader.py             # Multi-year Excel/CSV ingestion engine
│   ├── groq_service.py            # Ollama (Local) & Groq AI difficulty tagging & AI summary
│   ├── config.py                  # Shared rules & session patterns
│   └── tests/                     # Automated pytest suite
│       └── test_agents.py
└── exam-dashboard/                # Full-Stack Web Application
    ├── client/                    # React frontend (Vite/Tailwind)
    ├── server/                    # Node.js Express backend server
    └── python-bridge/             # Node-to-Python CLI bridge execution
```

---

## 🛠️ Getting Started Locally

### Prerequisites
- **Python 3.10+**
- **Node.js 20+ & npm**

### 1. One-Click Launch (Windows)
Double-click `start.bat` or run in terminal:
```cmd
.\start.bat
```
This automatically starts the backend server on port `5000` and the React frontend on `http://localhost:3000`.

### 2. Manual Setup & Test Execution

#### Python Agent Core:
```bash
cd exam-cell-agent
pip install -r requirements.txt
python -m pytest tests/ -v
```

#### Web Dashboard:
```bash
cd exam-dashboard
npm install
cd server && npm install
cd ../client && npm install
cd ..
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
#   E x a m A g e n t  
 