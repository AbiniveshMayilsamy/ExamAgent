# Exam Cell AI Hub — MERN Dashboard

Real-time dashboard that triggers the 6-agent Python pipeline, streams live agent logs via WebSocket, and shows LLM explanations from Ollama (free, local).

## Stack
- **MongoDB** — stores run history
- **Express + Node.js** — API server, spawns Python bridge
- **React** — dashboard UI with 6 agent grid cards
- **Socket.io** — real-time agent log streaming
- **Ollama (llama3)** — free local LLM for agent explanations + AI suggestions
- **Python agents** — the 6-agent scheduling pipeline

## Prerequisites

1. **Node.js 18+** — https://nodejs.org
2. **MongoDB** running locally:
   ```bash
   sudo apt install mongodb -y
   sudo systemctl start mongodb
   ```
3. **Ollama** installed and llama3 pulled:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull llama3
   ```
4. **Python venv** with agents installed (from exam-cell-agent/):
   ```bash
   cd ../exam-cell-agent
   python3 -m venv venv
   source venv/bin/activate
   pip install pandas openpyxl requests
   ```

## Setup & Run

```bash
# From exam-dashboard/
npm run install:all      # installs server + client deps

# Terminal 1 — backend
npm run server

# Terminal 2 — frontend
npm run client
```

Or run both together:
```bash
npm run dev
```

Open http://localhost:3000

## How it works

1. Upload student CSV → set exam dates → click Generate
2. Node spawns the Python bridge which runs agents 1→3→4→5→6→2
3. Each agent emits JSON events → Node broadcasts via Socket.io → React updates live
4. Ollama explains each agent's decision in plain English
5. After pipeline completes, Ollama generates 3 improvement suggestions
6. Full run saved to MongoDB for history

## Project structure

```
exam-dashboard/
├── server/
│   ├── index.js                  # Express + Socket.io entry
│   ├── models/Run.js             # MongoDB run schema
│   ├── controllers/pipelineController.js
│   ├── routes/pipeline.js
│   ├── routes/runs.js
│   └── socket/handlers.js
├── client/
│   ├── public/index.html
│   └── src/
│       ├── App.js
│       ├── context/SocketContext.jsx
│       ├── hooks/usePipeline.js
│       ├── pages/Dashboard.jsx
│       └── components/
│           ├── AgentCard.jsx
│           ├── TriggerForm.jsx
│           ├── ScheduleTable.jsx
│           ├── AISuggestions.jsx
│           └── RunHistory.jsx
└── python-bridge/
    └── run_agents.py             # Spawned by Node, streams JSON events
```
