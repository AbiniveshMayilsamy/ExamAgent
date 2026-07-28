import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { runClientSidePipeline } from '../utils/clientSideSolver'
import { parseExcelFileInBrowser } from '../utils/excelParser'

export const AGENT_IDS = [1, 3, 4, 5, 6, 7, 2]

export function initAgents() {
  return [
    {
      id: 1,
      name: 'Calendar & Session Manager',
      functionType: 'Calendar Builder',
      status: 'pending',
      summary: 'Awaiting pipeline trigger',
      stats: null,
      rules: 'Rules 1, 8 — max 2 sessions/day, leave days exclusion',
    },
    {
      id: 3,
      name: 'Common Course Matcher',
      functionType: 'Course Cluster Builder',
      status: 'pending',
      summary: 'Awaiting pipeline trigger',
      stats: null,
      rules: 'Rules 3, 5 — common course clustering & alignment',
    },
    {
      id: 4,
      name: 'Regular Stream Harmonizer',
      functionType: 'Slot Harmonizer',
      status: 'pending',
      summary: 'Awaiting pipeline trigger',
      stats: null,
      rules: 'Rule 4 — regular course slot assignment',
    },
    {
      id: 5,
      name: 'Spacing & Difficulty Evaluator',
      functionType: 'Gap & Difficulty Enforcer',
      status: 'pending',
      summary: 'Awaiting pipeline trigger',
      stats: null,
      rules: 'Rules 1, 6, 9 — min 1-day gap, hard course 2-day buffer post gap',
    },
    {
      id: 6,
      name: 'Arrear & Backlog Scheduler',
      functionType: 'Arrear Packer',
      status: 'pending',
      summary: 'Awaiting pipeline trigger',
      stats: null,
      rules: 'Rule 7 — opposite session arrear placement',
    },
    {
      id: 7,
      name: 'Cumulative Conflict Resolver',
      functionType: 'Conflict Resolution Expert',
      status: 'pending',
      summary: 'Awaiting pipeline trigger',
      stats: null,
      rules: 'Rule 2 — zero student clashes',
    },
    {
      id: 2,
      name: 'Student Conflict Checker',
      functionType: 'Conflict Gatekeeper',
      status: 'pending',
      summary: 'Awaiting pipeline trigger',
      stats: null,
      rules: 'Rule 2 — zero student clashes',
    },
  ]
}

export function usePipeline(socket) {
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

  const currentFormDataRef = useRef(null)

  const updateAgent = useCallback((agentId, updates) => {
    setAgents(prev => prev.map(a => (a.id === agentId ? { ...a, ...updates } : a)))
  }, [])

  const runBrowserFallback = useCallback(async (formData) => {
    const semType = formData.get('semType') || 'odd'
    const isOdd = semType === 'odd'

    const yearSemMap = {
      '1': isOdd ? 1 : 2,
      '2': isOdd ? 3 : 4,
      '3': isOdd ? 5 : 6,
      '4': isOdd ? 7 : 8,
    }

    const enrolments = []

    for (const yStr of ['1', '2', '3', '4']) {
      const file = formData.get(`year_${yStr}`)
      if (file && file instanceof File) {
        const parsed = await parseExcelFileInBrowser(file, yearSemMap[yStr], false)
        enrolments.push(...parsed)
      }
    }

    const arrFile = formData.get('arrear_file')
    if (arrFile && arrFile instanceof File) {
      const parsedArr = await parseExcelFileInBrowser(arrFile, 1, true)
      enrolments.push(...parsedArr)
    }

    let startDates = {}
    try {
      startDates = JSON.parse(formData.get('startDates') || '{}')
    } catch {
      startDates = {}
    }

    let leaveDays = []
    try {
      leaveDays = JSON.parse(formData.get('leaveDays') || '[]')
    } catch {
      leaveDays = []
    }

    const startDate = Object.values(startDates)[0] || '2026-11-02'
    const endDate = '2026-12-15'

    await runClientSidePipeline(
      {
        enrolments,
        startDate,
        endDate,
        leaveDays,
      },
      (id, func, rules) => updateAgent(id, { status: 'running', functionType: func, rules }),
      (id, msg) => setAuditLog(prev => [...prev, `[Agent ${id}] ${msg}`]),
      (id, summary) => updateAgent(id, { status: 'done', summary }),
      (res) => {
        setPipelineStatus('done')
        setSchedule(res.schedule || [])
        setConflicts(res.conflicts || [])
        setDeptRollRanges(res.deptRollRanges || {})
        setStudents(res.students || [])
        setStats({
          totalExams: res.totalExams || (res.schedule || []).length,
          totalArrears: res.totalArrears || 0,
          conflictsFound: (res.conflicts || []).length,
        })
        if (res.aiSummary) setAiSuggestions(res.aiSummary)
      }
    )
  }, [updateAgent])

  useEffect(() => {
    if (!socket || !runId) return

    socket.emit('join_run', runId)

    const logHandler = ({ agentId, message }) => {
      if (message) {
        setAuditLog(prev => [...prev, `[Agent ${agentId}] ${message}`])
      }
    }

    const handlers = {
      agent_start: ({ agentId, agentName, functionType, rules }) => {
        updateAgent(agentId, {
          status: 'running',
          name: agentName || undefined,
          functionType: functionType || undefined,
          rules: rules || undefined,
        })
      },
      agent_done: ({ agentId, summary, stats }) => {
        updateAgent(agentId, { status: 'done', summary, stats })
      },
      pipeline_done: (data) => {
        setPipelineStatus(data.status === 'PASS' ? 'done' : 'failed')
        setSchedule(data.schedule || [])
        setConflicts(data.conflicts || [])
        setDeptRollRanges(data.deptRollRanges || {})
        setStudents(data.students || [])
        setStats({
          totalExams: data.totalExams || 0,
          totalArrears: data.totalArrears || 0,
          conflictsFound: (data.conflicts || []).length,
        })
        if (data.aiSummary) setAiSuggestions(data.aiSummary)
        setAuditLog(prev => [...prev, `Pipeline finished with status: ${data.status}`])
      },
      pipeline_fail: async (data) => {
        console.warn('Backend python failed:', data.error)
        setAuditLog(prev => [...prev, `Backend process error: ${data.error}. Executing browser fallback engine...`])
        if (currentFormDataRef.current) {
          await runBrowserFallback(currentFormDataRef.current)
        }
      }
    }

    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn))
    socket.on('agent_log', logHandler)

    return () => {
      Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn))
      socket.off('agent_log', logHandler)
    }
  }, [socket, runId, updateAgent, runBrowserFallback])

  const trigger = useCallback(async (formData) => {
    currentFormDataRef.current = formData
    setAgents(initAgents())
    setPipelineStatus('running')
    setSchedule([])
    setConflicts([])
    setAuditLog([])
    setAiSuggestions('')
    setStats({ totalExams: 0, totalArrears: 0, conflictsFound: 0 })
    setDeptRollRanges({})

    // Static GitHub Pages host check
    const isStaticHost = window.location.hostname.includes('github.io')
    if (isStaticHost) {
      setAuditLog(['Running in Browser Client-Side Mode for static deployment...'])
      await runBrowserFallback(formData)
      return 'static_browser_run'
    }

    try {
      const { data } = await axios.post('/api/pipeline/trigger', formData)
      setRunId(data.runId)
      return data.runId
    } catch (err) {
      console.warn('Backend trigger error. Switching to browser fallback engine...', err)
      setAuditLog(['Backend unavailable or returned error. Switching to browser solver...'])
      await runBrowserFallback(formData)
      return 'static_browser_run'
    }
  }, [updateAgent, runBrowserFallback])

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
