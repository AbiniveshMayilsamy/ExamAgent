const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
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

async function triggerPipeline(req, res) {
  const { startDate, endDate } = req.body
  const leaveDays       = JSON.parse(req.body.leaveDays       || '[]')
  const difficultyMap   = JSON.parse(req.body.difficultyMap   || '{}')
  const yearSessionPattern = JSON.parse(req.body.yearSessionPattern || '{}')
  const examsPerBranch  = JSON.parse(req.body.examsPerBranch  || '{}')
  const humanIntervention = req.body.humanIntervention === 'true' || req.body.humanIntervention === true
  const file = req.file

  if (!file || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing file, startDate, or endDate' })
  }

  const run = await Run.create({
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
    if (code !== 0) {
      await Run.findByIdAndUpdate(run._id, { status: 'failed', finishedAt: new Date() })
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
  emitToRun(io, runId, evt.event, evt)

  switch (evt.event) {
    case 'agent_start':
      await Run.findByIdAndUpdate(runId, {
        $set: {
          [`agents.${agentIndex(evt.agentId)}.status`]: 'running',
          [`agents.${agentIndex(evt.agentId)}.startedAt`]: new Date(),
        },
      })
      break

    case 'agent_log':
      await Run.findByIdAndUpdate(runId, {
        $push: { [`agents.${agentIndex(evt.agentId)}.logs`]: evt.message },
      })
      break

    case 'agent_done':
      await Run.findByIdAndUpdate(runId, {
        $set: {
          [`agents.${agentIndex(evt.agentId)}.status`]: 'done',
          [`agents.${agentIndex(evt.agentId)}.summary`]: evt.summary,
          [`agents.${agentIndex(evt.agentId)}.llmExplanation`]: evt.llmExplanation,
          [`agents.${agentIndex(evt.agentId)}.stats`]: evt.stats || {},
          [`agents.${agentIndex(evt.agentId)}.finishedAt`]: new Date(),
        },
      })
      break

    case 'agent_awaiting_review':
      await Run.findByIdAndUpdate(runId, {
        $set: {
          [`agents.${agentIndex(evt.agentId)}.status`]: 'awaiting_review',
          [`agents.${agentIndex(evt.agentId)}.output`]: evt.output,
          [`agents.${agentIndex(evt.agentId)}.stats`]: evt.stats || {},
        },
      })
      break

    case 'agent_fail':
      await Run.findByIdAndUpdate(runId, {
        $set: { [`agents.${agentIndex(evt.agentId)}.status`]: 'failed' },
      })
      break

    case 'ai_suggestion':
      await Run.findByIdAndUpdate(runId, { aiSuggestions: evt.text })
      break

    case 'pipeline_done':
      await Run.findByIdAndUpdate(runId, {
        status: evt.status === 'PASS' ? 'done' : 'manual_review',
        finishedAt: new Date(),
        schedule: evt.schedule,
        auditLog: evt.auditLog,
        conflicts: evt.conflicts,
        agentStats: evt.agentStats,
        deptRollRanges: evt.deptRollRanges,
        totalExams: evt.totalExams,
        totalArrears: evt.totalArrears,
        conflictsFound: (evt.conflicts || []).length,
      })
      break

    case 'pipeline_fail':
      await Run.findByIdAndUpdate(runId, { status: 'failed', finishedAt: new Date() })
      break
  }
}

function agentIndex(agentId) {
  return AGENT_ORDER.indexOf(agentId)
}

module.exports = { triggerPipeline, resumeAgent }
