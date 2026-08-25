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
  const patternType = req.body.patternType || 'alternating'
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
  const store = getStore()

  const run = await store.create({
    inputFile: primaryFileName,
    startDate: startDates,
    endDate: 'Auto-calculated',
    leaveDays,
    semType,
    patternType,
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
    '--pattern-type', patternType,
    '--start-dates', typeof startDates === 'string' ? startDates : JSON.stringify(startDates),
    '--leaves', JSON.stringify(leaveDays),
  ]

  if (uploadedFilesMap.regular_file) pyArgs.push('--regular-file', uploadedFilesMap.regular_file)
  if (uploadedFilesMap.regular) pyArgs.push('--regular-file', uploadedFilesMap.regular)
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

  let stderrBuffer = ''
  py.stderr.on('data', (data) => {
    const errStr = data.toString()
    stderrBuffer += errStr
    console.error('[Python stderr]', errStr)
  })

  py.on('close', async (code) => {
    activeProcesses.delete(run._id.toString())
    const store = getStore()
    if (code !== 0) {
      const errMsg = stderrBuffer.trim() || `Python exited with code ${code}`
      await store.findByIdAndUpdate(run._id, { status: 'failed', finishedAt: new Date(), error: errMsg })
      emitToRun(req.io, run._id.toString(), 'pipeline_fail', { error: errMsg, code })
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

async function handleEvent(io, runId, evt, py) {
  const store = getStore()
  emitToRun(io, runId, evt.event, evt)

  const agentId = evt.agentId
  const idx = AGENT_ORDER.indexOf(agentId)

  // Memory store update helpers
  const updateField = async (path, value) => {
    if (!getDbReady()) {
      const key = runId.startsWith('mem_') ? runId : `mem_${runId}`
      const run = store.runs.get(key)
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

  if (evt.event === 'agent_start') {
    await updateField(`agents.${idx}.status`, 'running')
  } else if (evt.event === 'agent_log') {
    if (!getDbReady()) {
      const key = runId.startsWith('mem_') ? runId : `mem_${runId}`
      const run = store.runs.get(key)
      if (run && run.agents && run.agents[idx]) run.agents[idx].logs.push(evt.message)
    } else {
      await Run.findByIdAndUpdate(runId, { $push: { [`agents.${idx}.logs`]: evt.message } })
    }
  } else if (evt.event === 'agent_done') {
    await updateField(`agents.${idx}.status`, 'done')
    await updateField(`agents.${idx}.summary`, evt.summary)
    await updateField(`agents.${idx}.llmExplanation`, evt.llmExplanation)
    await updateField(`agents.${idx}.stats`, evt.stats)
    await updateField(`agents.${idx}.output`, evt.output)
  } else if (evt.event === 'agent_awaiting_review') {
    await updateField(`agents.${idx}.status`, 'awaiting_review')
    await updateField(`agents.${idx}.output`, evt.output)
  } else if (evt.event === 'pipeline_done') {
    await updateField('status', 'completed')
    await updateField('schedule', evt.schedule)
    await updateField('auditLog', evt.auditLog)
    await updateField('conflicts', evt.conflicts)
    await updateField('agentStats', evt.agentStats)
    await updateField('deptRollRanges', evt.deptRollRanges)
    if (evt.totalExams !== undefined) await updateField('totalExams', evt.totalExams)
    if (evt.totalArrears !== undefined) await updateField('totalArrears', evt.totalArrears)
    if (evt.students !== undefined) await updateField('students', evt.students)
    if (evt.aiSummary !== undefined) await updateField('aiSummary', evt.aiSummary)
    if (evt.startDate !== undefined) await updateField('startDate', evt.startDate)
    if (evt.endDate !== undefined) await updateField('endDate', evt.endDate)
    await updateField('finishedAt', new Date())
  } else if (evt.event === 'pipeline_fail') {
    await updateField('status', 'failed')
    await updateField('finishedAt', new Date())
  }
}

module.exports = {
  triggerPipeline,
  resumeAgent,
}