# Agentverse - 6-Agent AI Exam Scheduling System 🎓

An automated, rule-compliant, multi-agent AI exam timetable generation system for college exam cells. Built using a 6-Agent modular architecture, deterministic rule solver engines, and a real-time web dashboard.

---

## 🤖 System Architecture & 6 AI Agents

The system translates manual college exam cell rules into **6 specialized, cooperating AI agents** governed by a central orchestrator hub:

| Agent | Name | Rules Enforced | Responsibilities |
|---|---|---|---|
| **Agent 1** | Calendar & Session Manager | Rule 1 (Max 2 sessions/day), Rule 8 (Leave days) | Builds the master slot grid (Forenoon & Afternoon), excluding holidays/leaves. |
| **Agent 3** | Common Course Matcher | Rule 3 (Cross-branch common courses), Rule 5 (Odd/Even cross-branch courses) | Clusters subjects shared across branches/semesters so they share identical exam slots. |
| **Agent 4** | Regular Stream Harmonizer | Rule 4 (Same-session semester exams across branches) | Maps regular semester subject clusters onto available date/session slots. |
| **Agent 5** | Spacing & Difficulty Evaluator | Rule 6 (Min 1-day study gap), Rule 9 (2-day gap before hard subjects) | Audits and inserts mandatory study rest days between exams based on difficulty. |
| **Agent 6** | Arrear & Backlog Scheduler | Rule 7 (Arrears in secondary session) | Slots backlog/arrear exams into alternate sessions of regular exam days without clashes. |
| **Agent 2** | Student Conflict Checker | Rule 2 (Max 1 exam/student per session) | **The Gatekeeper**: Validates every student Registration Number to ensure 0 exam collisions. |

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
        │  Agent 2: Audit Pass    │ ── (Failure? Feedback loop back to Agent 5/6)
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

- **Multi-Agent Orchestration**: 6 independent modules working via deterministic constraint engines and local LLM (Ollama / llama3) auditing.
- **100% Collision-Free Guarantee**: Agent 2 mathematically verifies zero double-bookings for all students across regular and arrear subjects.
- **Real-Time Web Dashboard**: Built with React, Node/Express, WebSocket live progress streaming, interactive timetable viewing, and CSV/Excel export.
- **Realistic Dataset Support**: Tested against 43,000+ student-course enrollment records across 8 engineering departments (CSE, ECE, EEE, MECH, CIVIL, IT, AIML, CSBS).

---

## 🛠️ Getting Started Locally

### Prerequisites
- Python 3.10+
- Node.js 20+ & npm
- MongoDB (optional, for run history)
- Ollama with `llama3` (optional, for natural language explanations)

### 1. Install & Test Python Agents
```bash
cd exam-cell-agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 tests/test_agents.py
```

### 2. Run Dashboard
```bash
cd exam-dashboard
npm run install:all
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 GitHub Pages Deployment

To view static preview or deploy frontend to GitHub Pages:
```bash
cd exam-dashboard/client
npm install gh-pages --save-dev
npm run build
```

---

## 📜 License
MIT License - Created for College Exam Cell Automation.
