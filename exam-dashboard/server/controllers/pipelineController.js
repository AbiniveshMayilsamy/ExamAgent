const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const { getStore } = require('../models/runStore')

// In-memory process registry for human-intervention pauses
const activeProcesses = new Map()

function initAgents() {
  return [
    { id: 1, name: 'Calendar & Session Manager', functionType: 'Calendar Builder', status: 'pending', rules: 'Rules 1, 8 — max 2 sessions/day, leave days exclusion' },
    { id: 3, name: 'Common Course Matcher', functionType: 'Course Cluster Builder', status: 'pending', rules: 'Rules 3, 5 — common course clustering & alignment' },
    { id: 4, name: 'Regular Stream Harmonizer', functionType: 'Slot Harmonizer', status: 'pending', rules: 'Rule 4 — regular course slot assignment' },
    { id: 5, name: 'Spacing & Difficulty Evaluator', functionType: 'Gap & Difficulty Enforcer', status: 'pending', rules: 'Rules 1, 6, 9 — min 1-day gap, hard course 2-day buffer post gap' },
    { id: 6, name: 'Arrear & Backlog Scheduler', functionType: 'Arrear Packer', status: 'pending', rules: 'Rule 7 — opposite session arrear placement' },
    { id: 7, name: 'Cumulative Conflict Resolver', functionType: 'Conflict Resolution Expert', status: 'pending', rules: 'Rule 2 — zero student clashes' },
    { id: 2, name: 'Student Conflict Checker', functionType: 'Conflict Gatekeeper', status: 'pending', rules: 'Rule 2 — zero student clashes' },
  ]
}

function emitToRun(io, runId, event, data) {
  io.to(`run:${runId}`).emit(event, data)
  io.emit(event, { ...data, runId })
}

async function triggerPipeline(req, res) {
  const store = getStore()
  const semType = req.body.semType || 'odd'
  const startDates = req.body.startDates || '{}'
  const leaveDays = JSON.parse(req.body.leaveDays || '[]')
  const useGroqAI = req.body.useGroqAI === 'true' || req.body.useGroqAI === true
  const humanIntervention = req.body.humanIntervention === 'true' || req.body.humanIntervention === true
  
  const files = req.files || []
  if (files.length === 0) {
    return res.status(400).json({ error: 'Please upload at least one exam file.' })
  }

  // Organize uploaded files by field name
  const uploadedFilesMap = {}
  files.forEach(f => {
    uploadedFilesMap[f.fieldname] = f.path
  })

  const primaryFileName = files[0].originalname

  const run = await store.create({
    inputFile: primaryFileName,
    startDate: startDates,
    endDate: 'Auto-calculated',
    leaveDays,
    semType,
    useGroqAI,
    humanIntervention,
    agents: initAgents(),
    status: 'running',
  })

  res.json({ runId: run._id })

  const bridgePath = path.join(__dirname, '../../python-bridge/run_agents.py')
  const agentsPath = path.resolve(__dirname, '../../../exam-cell-agent')

  const pyArgs = [
    bridgePath,
    '--sem-type', semType,
    '--start-dates', typeof startDates === 'string' ? startDates : JSON.stringify(startDates),
    '--leaves', JSON.stringify(leaveDays),
  ]

  if (uploadedFilesMap.year_1) pyArgs.push('--year-1', uploadedFilesMap.year_1)
  if (uploadedFilesMap.year_2) pyArgs.push('--year-2', uploadedFilesMap.year_2)
  if (uploadedFilesMap.year_3) pyArgs.push('--year-3', uploadedFilesMap.year_3)
  if (uploadedFilesMap.year_4) pyArgs.push('--year-4', uploadedFilesMap.year_4)
  if (uploadedFilesMap.arrear_file) pyArgs.push('--arrear-file', uploadedFilesMap.arrear_file)
  if (useGroqAI) pyArgs.push('--use-groq-ai')
  if (humanIntervention) pyArgs.push('--human-intervention')

  const py = spawn(
    process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3'),
    pyArgs,
    {
      env: { ...process.env, AGENTS_PATH: agentsPath,
             OLLAMA_URL: process.env.OLLAMA_URL, OLLAMA_MODEL: process.env.OLLAMA_MODEL },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    }
  )

  activeProcesses.set(run._id.toString(), py)

  py.on('error', async (err) => {
    console.error('[Python spawn error]', err)
    activeProcesses.delete(run._id.toString())
    await store.findByIdAndUpdate(run._id, { status: 'failed', finishedAt: new Date() })
    emitToRun(req.io, run._id.toString(), 'pipeline_fail', { error: `Failed to launch Python engine: ${err.message}` })
  })

  let buffer = ''
  py.stdout.on('data', async (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.trim()) continue
      let evt
      try { evt = JSON.parse(line) } catch { continue }
      await handleEvent(req.io, run._id.toString(), evt, py)
    }
  })

  py.stderr.on('data', (data) => console.error('[Python stderr]', data.toString()))

  py.on('close', async (code) => {
    activeProcesses.delete(run._id.toString())
    if (code !== 0) {
      await store.findByIdAndUpdate(run._id, { status: 'failed', finishedAt: new Date() })
      emitToRun(req.io, run._id.toString(), 'pipeline_fail', { error: `Python exited with code ${code}` })
    }
    // Clean up temp files
    files.forEach(f => fs.unlink(f.path, () => {}))
  })
}

// Human intervention: client sends override for a waiting agent
async function resumeAgent(req, res) {
  const { runId, agentId, override } = req.body
  const py = activeProcesses.get(runId)
  if (!py) return res.status(404).json({ error: 'No active pipeline for this run' })

  const msg = JSON.stringify({ action: 'resume', override: override ?? null }) + '\n'
  py.stdin.write(msg)
  res.json({ ok: true })
}

async function handleEvent(io, runId, evt, pyProcess) {
  const store = getStore()
  const run = await store.findById(runId)
  if (!run) return

  switch (evt.event) {
    case 'agent_start': {
      const updatedAgents = run.agents.map(a =>
        a.id === evt.agentId
          ? { ...a, status: 'running', name: evt.agentName || a.name, functionType: evt.functionType || a.functionType, rules: evt.rules || a.rules }
          : a
      )
      await store.findByIdAndUpdate(runId, { agents: updatedAgents })
      emitToRun(io, runId, 'agent_start', { agentId: evt.agentId, agentName: evt.agentName, functionType: evt.functionType, rules: evt.rules })
      break
    }

    case 'agent_log': {
      emitToRun(io, runId, 'agent_log', { agentId: evt.agentId, message: evt.message })
      break
    }

    case 'agent_done': {
      const updatedAgents = run.agents.map(a =>
        a.id === evt.agentId ? { ...a, status: 'done', summary: evt.summary, stats: evt.stats } : a
      )
      await store.findByIdAndUpdate(runId, { agents: updatedAgents })
      emitToRun(io, runId, 'agent_done', { agentId: evt.agentId, summary: evt.summary, stats: evt.stats })
      break
    }

    case 'agent_wait_human': {
      const updatedAgents = run.agents.map(a =>
        a.id === evt.agentId ? { ...a, status: 'waiting_human', prompt: evt.prompt, choices: evt.choices } : a
      )
      await store.findByIdAndUpdate(runId, { agents: updatedAgents, status: 'waiting_human' })
      emitToRun(io, runId, 'agent_wait_human', { agentId: evt.agentId, prompt: evt.prompt, choices: evt.choices })
      break
    }

    case 'pipeline_done': {
      await store.findByIdAndUpdate(runId, {
        status: evt.status === 'PASS' ? 'done' : 'failed',
        finishedAt: new Date(),
        schedule: evt.schedule,
        conflicts: evt.conflicts,
        auditLog: evt.auditLog,
        aiSummary: evt.aiSummary,
        deptRollRanges: evt.deptRollRanges,
        totalExams: evt.totalExams,
        totalArrears: evt.totalArrears,
        students: evt.students,
        startDate: evt.startDate,
        endDate: evt.endDate,
      })
      emitToRun(io, runId, 'pipeline_done', evt)
      break
    }
  }
}

module.exports = { triggerPipeline, resumeAgent }