import { useState, useEffect, useCallback } from 'react'
import { useSocket } from '../context/SocketContext'
import axios from 'axios'

const AGENT_ORDER = [1, 3, 4, 5, 6, 2]

const AGENT_META = {
  1: { name: 'Calendar & Session Manager',    rules: 'Rules 1,8', icon: '📅', functionType: 'Calendar Builder' },
  2: { name: 'Student Conflict Checker',      rules: 'Rule 2',    icon: '🔍', functionType: 'Conflict Gatekeeper' },
  3: { name: 'Common Course Matcher',         rules: 'Rules 3,5', icon: '🔗', functionType: 'Course Cluster Builder' },
  4: { name: 'Regular Stream Harmonizer',     rules: 'Rule 4',    icon: '📐', functionType: 'Slot Harmonizer' },
  5: { name: 'Spacing & Difficulty Evaluator',rules: 'Rules 6,9', icon: '⏱️', functionType: 'Gap & Difficulty Enforcer' },
  6: { name: 'Arrear & Backlog Scheduler',    rules: 'Rule 7',   icon: '📋', functionType: 'Arrear Packer' },
}

function initAgents() {
  return AGENT_ORDER.map((id) => ({
    agentId: id,
    agentName: AGENT_META[id].name,
    rules: AGENT_META[id].rules,
    icon: AGENT_META[id].icon,
    functionType: AGENT_META[id].functionType,
    status: 'idle',
    logs: [],
    summary: '',
    llmExplanation: '',
    stats: {},
    output: null,
  }))
}

export function usePipeline() {
  const { socket } = useSocket()
  const [agents, setAgents] = useState(initAgents)
  const [runId, setRunId] = useState(null)
  const [pipelineStatus, setPipelineStatus] = useState('idle')
  const [schedule, setSchedule] = useState([])
  const [conflicts, setConflicts] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [aiSuggestions, setAiSuggestions] = useState('')
  const [stats, setStats] = useState({ totalExams: 0, totalArrears: 0, conflictsFound: 0 })
  const [deptRollRanges, setDeptRollRanges] = useState({})
  const [students, setStudents] = useState([])

  const updateAgent = useCallback((agentId, patch) => {
    setAgents(prev => prev.map(a => a.agentId === agentId ? { ...a, ...patch } : a))
  }, [])

  useEffect(() => {
    if (!socket || !runId) return
    socket.emit('join_run', runId)

    const handlers = {
      agent_start: ({ agentId, functionType, rules }) =>
        updateAgent(agentId, { status: 'running', logs: [], functionType, rules }),

      agent_done: ({ agentId, summary, llmExplanation, stats: s }) =>
        updateAgent(agentId, { status: 'done', summary, llmExplanation, stats: s || {} }),

      agent_fail: ({ agentId, error }) =>
        updateAgent(agentId, { status: 'failed', summary: error }),

      agent_awaiting_review: ({ agentId, output, stats: s }) =>
        updateAgent(agentId, { status: 'awaiting_review', output, stats: s || {} }),

      ai_suggestion: ({ text }) => setAiSuggestions(text),

      pipeline_done: ({ status, schedule: s, auditLog: al, conflicts: c,
                        totalExams, totalArrears, deptRollRanges: drr, students: sts }) => {
        setPipelineStatus(status === 'PASS' ? 'done' : 'manual_review')
        setSchedule(s || [])
        setAuditLog(al || [])
        setConflicts(c || [])
        setStats({ totalExams, totalArrears, conflictsFound: (c || []).length })
        setDeptRollRanges(drr || {})
        if (sts && sts.length > 0) setStudents(sts)
      },

      pipeline_fail: ({ error }) => {
        setPipelineStatus('failed')
        setAuditLog(prev => [...prev, `Pipeline failed: ${error}`])
      },
    }

    const logHandler = ({ agentId, message }) => {
      setAgents(prev => prev.map(a =>
        a.agentId === agentId ? { ...a, logs: [...a.logs, message] } : a
      ))
    }

    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn))
    socket.on('agent_log', logHandler)

    return () => {
      Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn))
      socket.off('agent_log', logHandler)
    }
  }, [socket, runId, updateAgent])

  const trigger = useCallback(async (formData) => {
    setAgents(initAgents())
    setPipelineStatus('running')
    setSchedule([])
    setConflicts([])
    setAuditLog([])
    setAiSuggestions('')
    setStats({ totalExams: 0, totalArrears: 0, conflictsFound: 0 })
    setDeptRollRanges({})

    try {
      const { data } = await axios.post('/api/pipeline/trigger', formData)
      setRunId(data.runId)
      return data.runId
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to connect to backend server.'
      console.error('Pipeline Trigger Error:', errMsg)
      setPipelineStatus('failed')
      setAuditLog([`Trigger Error: ${errMsg}`])
      throw err
    }
  }, [updateAgent])

  return {
    agents,
    runId,
    pipelineStatus,
    schedule,
    conflicts,
    auditLog,
    aiSuggestions,
    stats,
    deptRollRanges,
    students,
    trigger,
    updateAgent,
  }
}
