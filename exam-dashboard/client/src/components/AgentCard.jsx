import { useRef, useEffect, useState } from 'react'
import axios from 'axios'

const STATUS_STYLES = {
  idle:             { bg: '#1e293b', border: '#334155', badge: '#475569',  label: 'IDLE' },
  running:          { bg: '#0f2a1a', border: '#16a34a', badge: '#16a34a',  label: 'RUNNING' },
  done:             { bg: '#0f1f2e', border: '#2563eb', badge: '#2563eb',  label: 'DONE' },
  failed:           { bg: '#2a0f0f', border: '#dc2626', badge: '#dc2626',  label: 'FAILED' },
  awaiting_review:  { bg: '#2a1f0f', border: '#f59e0b', badge: '#f59e0b',  label: 'AWAITING REVIEW' },
}

const STAT_LABELS = {
  // Agent 1
  total_slots: 'Total Slots', exam_days: 'Exam Days', leave_days_excluded: 'Leave Days',
  // Agent 3
  total_courses: 'Courses', shared_courses: 'Shared', single_branch_courses: 'Single-Branch',
  // Agent 4
  assigned: 'Assigned', unassigned: 'Unassigned', shared_assigned: 'Shared Assigned',
  // Agent 5
  exams_moved: 'Exams Moved', hard_courses_repositioned: 'Hard Repositioned', total_exam_days: 'Exam Days',
  // Agent 6
  arrear_courses: 'Arrear Courses', arrear_slots_assigned: 'Slots Assigned', arrear_students: 'Students',
  // Agent 2
  students_checked: 'Students Checked', conflicts_found: 'Conflicts', clean_students: 'Clean Students',
}

export default function AgentCard({ agent, runId }) {
  const { agentId, agentName, rules, functionType, icon, status, logs, summary, llmExplanation, stats, output } = agent
  const logRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [overrideText, setOverrideText] = useState('')
  const [overrideError, setOverrideError] = useState('')
  const style = STATUS_STYLES[status] || STATUS_STYLES.idle

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  useEffect(() => {
    if (status === 'running') setExpanded(true)
    if (status === 'awaiting_review') {
      setExpanded(true)
      setOverrideText(JSON.stringify(output, null, 2))
    }
  }, [status, output])

  const handleResume = async (useOverride) => {
    setOverrideError('')
    let override = null
    if (useOverride) {
      try { override = JSON.parse(overrideText) }
      catch { setOverrideError('Invalid JSON — fix before submitting.'); return }
    }
    try {
      await axios.post('/api/pipeline/resume', { runId, agentId, override })
    } catch (e) {
      setOverrideError(e.response?.data?.error || 'Resume failed.')
    }
  }

  const statEntries = Object.entries(stats || {}).filter(([k]) => STAT_LABELS[k])

  return (
    <div style={{
      background: style.bg, border: `1.5px solid ${style.border}`, borderRadius: 12,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'border-color 0.3s, background 0.3s',
      boxShadow: status === 'running' ? `0 0 16px ${style.border}44` :
                 status === 'awaiting_review' ? `0 0 20px ${style.border}66` : 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>Agent {agentId}</div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>{agentName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <span style={{
            background: style.badge, color: '#fff', fontSize: 10, fontWeight: 700,
            padding: '2px 8px', borderRadius: 20, letterSpacing: 1,
          }}>
            {status === 'running' && <span style={{ marginRight: 4 }}>⟳</span>}
            {status === 'awaiting_review' && <span style={{ marginRight: 4 }}>✋</span>}
            {style.label}
          </span>
          {functionType && (
            <span style={{ color: '#f59e0b', fontSize: 10, fontWeight: 600 }}>{functionType}</span>
          )}
          <span style={{ color: '#64748b', fontSize: 10 }}>{rules}</span>
        </div>
      </div>

      {/* Stats board */}
      {statEntries.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
          background: '#0f172a', borderRadius: 8, padding: '8px 10px',
        }}>
          {statEntries.map(([k, v]) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div style={{
                color: k === 'conflicts_found' && v > 0 ? '#f87171' :
                       k === 'unassigned' && v > 0 ? '#fbbf24' : '#60a5fa',
                fontSize: 16, fontWeight: 800,
              }}>{typeof v === 'number' ? v : '—'}</div>
              <div style={{ color: '#475569', fontSize: 9, lineHeight: 1.2 }}>{STAT_LABELS[k]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Live log box */}
      {(logs.length > 0 || status === 'running') && (
        <div ref={logRef} onClick={() => setExpanded(e => !e)}
          style={{
            background: '#0f172a', borderRadius: 6, padding: '8px 10px',
            maxHeight: expanded ? 120 : 48, overflowY: 'auto',
            fontSize: 11, color: '#7dd3fc', fontFamily: 'monospace',
            transition: 'max-height 0.3s', cursor: 'pointer',
          }}
          title="Click to expand/collapse"
        >
          {logs.length === 0
            ? <span style={{ color: '#475569' }}>Waiting...</span>
            : logs.map((l, i) => <div key={i}>› {l}</div>)
          }
        </div>
      )}

      {/* Summary */}
      {summary && <div style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 1.5 }}>{summary}</div>}

      {/* LLM Explanation */}
      {llmExplanation && (
        <div style={{
          background: '#1e1b4b', border: '1px solid #4338ca',
          borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#a5b4fc', lineHeight: 1.6,
        }}>
          <span style={{ color: '#818cf8', fontWeight: 700, marginRight: 4 }}>🤖 AI:</span>
          {llmExplanation}
        </div>
      )}

      {/* Human Intervention Panel */}
      {status === 'awaiting_review' && (
        <div style={{
          background: '#1c1400', border: '1px solid #f59e0b',
          borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ color: '#fbbf24', fontSize: 12, fontWeight: 700 }}>
            ✋ Agent {agentId} paused — review or override output before continuing
          </div>
          <textarea
            value={overrideText}
            onChange={e => setOverrideText(e.target.value)}
            rows={6}
            style={{
              background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
              color: '#f1f5f9', fontSize: 11, fontFamily: 'monospace',
              padding: '8px', width: '100%', boxSizing: 'border-box', resize: 'vertical',
            }}
          />
          {overrideError && <div style={{ color: '#f87171', fontSize: 11 }}>{overrideError}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handleResume(false)} style={{
              flex: 1, background: '#16a34a', color: '#fff', border: 'none',
              borderRadius: 6, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
              ✅ Accept & Continue
            </button>
            <button onClick={() => handleResume(true)} style={{
              flex: 1, background: '#b45309', color: '#fff', border: 'none',
              borderRadius: 6, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
              ✏️ Override & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
