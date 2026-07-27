const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const { getDbReady } = require('../dbState')
const memoryStore = require('../models/memoryStore')
const Run = require('../models/Run')
const { emitToRun } = require('../socket/handlers')

const AGENT_ORDER = [1, 3, 4, 5, 6, 2]

const AGENT_NAMES = {
  1: 'Calendar & Session Manager',
  2: 'Student Conflict Checker',
  3: 'Common Course Matcher',
  4: 'Regular Stream Harmonizer',
  5: 'Spacing & Difficulty Evaluator',
  6: 'Arrear & Backlog Scheduler',
}

function initAgents() {
  return AGENT_ORDER.map((id) => ({
    agentId: id,
    agentName: AGENT_NAMES[id],
    status: 'idle',
    logs: [],
    summary: '',
    llmExplanation: '',
    stats: {},
    output: null,
  }))
}

// Map: runId -> python child process (for sending stdin signals)
const activeProcesses = new Map()

function getStore() {
  return getDbReady() ? Run : memoryStore
}

async function triggerPipeline(req, res) {
  const store = getStore()
  const { startDate, endDate } = req.body
  const leaveDays = JSON.parse(req.body.leaveDays || '[]')
  const difficultyMap = JSON.parse(req.body.difficultyMap || '{}')
  const yearSessionPattern = JSON.parse(req.body.yearSessionPattern || '{}')
  const examsPerBranch = JSON.parse(req.body.examsPerBranch || '{}')
  const humanIntervention = req.body.humanIntervention === 'true' || req.body.humanIntervention === true
  const file = req.file

  if (!file || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing file, startDate, or endDate' })
  }

  const run = await store.create({
    inputFile: file.originalname,
    startDate, endDate, leaveDays, difficultyMap,
    yearSessionPattern, examsPerBranch, humanIntervention,
    agents: initAgents(),
    status: 'running',
  })

  res.json({ runId: run._id })

  const bridgePath = path.join(__dirname, '../../python-bridge/run_agents.py')
  const agentsPath = path.resolve(__dirname, '../../../exam-cell-agent')

  const pyArgs = [
    bridgePath,
    '--csv', file.path,
    '--start', startDate,
    '--end', endDate,
    '--leaves', JSON.stringify(leaveDays),
    '--difficulty', JSON.stringify(difficultyMap),
    '--year-session-pattern', JSON.stringify(yearSessionPattern),
    '--exams-per-branch', JSON.stringify(examsPerBranch),
  ]
  if (humanIntervention) pyArgs.push('--human-intervention')

  const py = spawn(
    process.env.PYTHON_PATH || 'python3',
    pyArgs,
    {
      env: { ...process.env, AGENTS_PATH: agentsPath,
             OLLAMA_URL: process.env.OLLAMA_URL, OLLAMA_MODEL: process.env.OLLAMA_MODEL },
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  )

  activeProcesses.set(run._id.toString(), py)

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
    const store = getStore()
    if (code !== 0) {
      await store.findByIdAndUpdate(run._id, { status: 'failed', finishedAt: new Date() })
      emitToRun(req.io, run._id.toString(), 'pipeline_fail', { error: `Python exited with code ${code}` })
    }
    fs.unlink(file.path, () => {})
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

async function handleEvent(io, runId, evt, py) {
  const store = getStore()
  emitToRun(io, runId, evt.event, evt)

  const agentId = evt.agentId
  const idx = AGENT_ORDER.indexOf(agentId)

  // Memory store update helpers
  const updateField = async (path, value) => {
    if (!getDbReady()) {
      const run = store.runs.get(`mem_${runId}`)
      if (!run) return
      const parts = path.split('.')
      let obj = run
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = {}
        obj = obj[parts[i]]
      }
      obj[parts[parts.length - 1]] = value
      return
    }
    await Run.findByIdAndUpdate(runId, { $set: { [path]: value } })
  }

  const pushToField = async (path, value) => {
    if (!getDbReady()) {
      const run = store.runs.get(`mem_${runId}`)
      if (!run) return
      const parts = path.split('.')
      let obj = run
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = []
        obj = obj[parts[i]]
      }
      const field = parts[parts.length - 1]
      if (!obj[field]) obj[field] = []
      obj[field].push(value)
      return
    }
    await Run.findByIdAndUpdate(runId, { $push: { [path]: value } })
  }

  switch (evt.event) {
    case 'agent_start':
      await updateField(`agents.${idx}.status`, 'running')
      await updateField(`agents.${idx}.startedAt`, new Date())
      break

    case 'agent_log':
      await pushToField(`agents.${idx}.logs`, evt.message)
      break

    case 'agent_done':
      await updateField(`agents.${idx}.status`, 'done')
      await updateField(`agents.${idx}.summary`, evt.summary)
      await updateField(`agents.${idx}.llmExplanation`, evt.llmExplanation)
      await updateField(`agents.${idx}.stats`, evt.stats || {})
      await updateField(`agents.${idx}.finishedAt`, new Date())
      break

    case 'agent_awaiting_review':
      await updateField(`agents.${idx}.status`, 'awaiting_review')
      await updateField(`agents.${idx}.output`, evt.output)
      await updateField(`agents.${idx}.stats`, evt.stats || {})
      break

    case 'agent_fail':
      await updateField(`agents.${idx}.status`, 'failed')
      break

    case 'ai_suggestion':
      await updateField('aiSuggestions', evt.text)
      break

    case 'pipeline_done':
      await updateField('status', evt.status === 'PASS' ? 'done' : 'manual_review')
      await updateField('finishedAt', new Date())
      await updateField('schedule', evt.schedule)
      await updateField('auditLog', evt.auditLog)
      await updateField('conflicts', evt.conflicts)
      await updateField('agentStats', evt.agentStats)
      await updateField('deptRollRanges', evt.deptRollRanges)
      await updateField('totalExams', evt.totalExams)
      await updateField('totalArrears', evt.totalArrears)
      await updateField('conflictsFound', (evt.conflicts || []).length)
      break

    case 'pipeline_fail':
      await updateField('status', 'failed')
      await updateField('finishedAt', new Date())
      break
  }
}

module.exports = { triggerPipeline, resumeAgent }