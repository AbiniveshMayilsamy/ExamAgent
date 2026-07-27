import { useState, useEffect, useCallback } from 'react'
import { useSocket } from '../context/SocketContext'
import { runClientSidePipeline } from '../utils/clientSideSolver'
import axios from 'axios'

const AGENT_ORDER = [1, 3, 4, 5, 6, 7, 2]

const AGENT_META = {
  1: { name: 'Calendar & Session Manager',    rules: 'Rules 1,8', icon: '📅', functionType: 'Calendar Builder' },
  2: { name: 'Student Conflict Checker',      rules: 'Rule 2',    icon: '🔍', functionType: 'Conflict Gatekeeper' },
  3: { name: 'Common Course Matcher',         rules: 'Rules 3,5', icon: '🔗', functionType: 'Course Cluster Builder' },
  4: { name: 'Regular Stream Harmonizer',     rules: 'Rule 4',    icon: '📐', functionType: 'Slot Harmonizer' },
  5: { name: 'Spacing & Difficulty Evaluator',rules: 'Rules 6,9', icon: '⏱️', functionType: 'Gap & Difficulty Enforcer' },
  6: { name: 'Arrear & Backlog Scheduler',    rules: 'Rule 7',   icon: '📋', functionType: 'Arrear Packer' },
  7: { name: 'Cumulative Conflict Resolver', rules: 'Rule 2,7',  icon: '🔧', functionType: 'Conflict Resolution Expert' },
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
                        totalExams, totalArrears, deptRollRanges: drr }) => {
        setPipelineStatus(status === 'PASS' ? 'done' : 'manual_review')
        setSchedule(s || [])
        setAuditLog(al || [])
        setConflicts(c || [])
        setStats({ totalExams, totalArrears, conflictsFound: (c || []).length })
        setDeptRollRanges(drr || {})
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
      console.warn('Backend server not reachable. Running client-side browser pipeline fallback...', err)
      
      let csvText = '';
      const file = formData.get('file');
      if (file && typeof file.text === 'function') {
        csvText = await file.text();
      }

      const params = {
        csvText,
        startDate: formData.get('startDate') || '2026-11-02',
        endDate: formData.get('endDate') || '2026-11-20',
        leaveDays: JSON.parse(formData.get('leaveDays') || '[]'),
        difficultyMap: JSON.parse(formData.get('difficultyMap') || '{}')
      };

      runClientSidePipeline(
        params,
        (agentId, functionType, rules) => updateAgent(agentId, { status: 'running', logs: [], functionType, rules }),
        (agentId, message) => setAgents(prev => prev.map(a => a.agentId === agentId ? { ...a, logs: [...a.logs, message] } : a)),
        (agentId, summary, llmExplanation) => updateAgent(agentId, { status: 'done', summary, llmExplanation }),
        (result) => {
          setPipelineStatus(result.status === 'PASS' ? 'done' : 'manual_review');
          setSchedule(result.schedule || []);
          setAuditLog(result.auditLog || []);
          setConflicts(result.conflicts || []);
          setAiSuggestions(result.aiSuggestions || '');
          setStats({ totalExams: result.totalExams, totalArrears: result.totalArrears, conflictsFound: result.conflicts.length });
        }
      );
      return 'client-side-run';
    }
  }, [updateAgent])

  return {
    agents, runId, pipelineStatus, schedule, conflicts,
    auditLog, aiSuggestions, stats, deptRollRanges, trigger,
  }
}
