import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePipelineContext } from '../context/PipelineContext'
import axios from 'axios'

const AGENT_DETAIL = {
  1: {
    name: 'Calendar & Session Manager',
    functionType: 'Calendar Builder',
    description: 'Builds the complete exam slot grid for the exam window. Every working day gets two slots — Forenoon (FN) and Afternoon (AN). Government holidays and leave days are excluded. Each slot is tagged with the preferred year group based on the year-session pattern you configured.',
    rules: [
      { rule: 'Rule 1', text: 'Maximum 2 exam sessions per day (FN + AN)' },
      { rule: 'Rule 4', text: 'FN session: 9:30 AM – 12:30 PM · AN session: 1:30 PM – 4:30 PM' },
      { rule: 'Rule 5', text: 'Government holidays and leave days are excluded from the slot grid' },
      { rule: 'Rule 10', text: 'Each slot is tagged with preferred year groups based on your session pattern' },
    ],
    inputs: ['Exam start date', 'Exam end date', 'List of leave/holiday dates', 'Year-session pattern (which year writes in which session)'],
    outputs: ['Open slot list with date, session, time, and preferred year groups'],
    color: '#1d4ed8',
    statLabels: { total_slots: 'Total Slots', exam_days: 'Exam Days', leave_days_excluded: 'Holidays Excluded', total_days: 'Calendar Days' },
  },
  3: {
    name: 'Common Course Matcher',
    functionType: 'Course Cluster Builder',
    description: 'Scans all student enrolment records and groups courses that are shared across multiple departments. A shared course (e.g. Engineering Mathematics taken by both CSE and ECE) must be scheduled in the same session so all students can write it together. Also applies the exams-per-branch cap you set.',
    rules: [
      { rule: 'Rule 3', text: 'Courses shared across branches must be scheduled in the same session' },
      { rule: 'Rule 5', text: 'Handles courses that span both odd and even semesters across branches' },
      { rule: 'Rule 8', text: 'Respects the maximum exams per branch limit you configured' },
      { rule: 'Rule 11', text: 'Maximises accommodation of shared courses in a single session' },
    ],
    inputs: ['Student enrolment data (all rows)', 'Exams-per-branch limits'],
    outputs: ['Course clusters with branch lists, semester lists, credit values, student counts, shared flag'],
    color: '#7c3aed',
    statLabels: { total_courses: 'Total Courses', shared_courses: 'Shared Courses', single_branch_courses: 'Single-Branch', branches_seen: 'Departments' },
  },
  4: {
    name: 'Regular Stream Harmonizer',
    functionType: 'Slot Harmonizer',
    description: 'Assigns each course cluster to a unique exam slot. Shared courses are assigned first to ensure they get the best slots. Within each year group, the preferred session (FN or AN) from your year-session pattern is respected. No two courses ever share the same slot.',
    rules: [
      { rule: 'Rule 4', text: 'All branches of the same semester write in the same session' },
      { rule: 'Rule 9', text: 'Higher credit courses are assigned slots first (priority scheduling)' },
      { rule: 'Rule 10', text: 'Year-wise session preference is respected when assigning slots' },
      { rule: 'Rule 11', text: 'Shared courses are assigned before single-branch courses' },
    ],
    inputs: ['Open slot list from Agent 1', 'Course clusters from Agent 3', 'Year-session pattern', 'Department roll ranges'],
    outputs: ['Draft schedule: each course with date, session, time, semester, year, branches, roll ranges'],
    color: '#0891b2',
    statLabels: { assigned: 'Courses Assigned', unassigned: 'Unassigned', shared_assigned: 'Shared Assigned', slots_used: 'Slots Used' },
  },
  5: {
    name: 'Spacing & Difficulty Evaluator',
    functionType: 'Gap & Difficulty Enforcer',
    description: 'Enforces minimum gaps between consecutive exams for each department and year group. If two exams for the same students are on adjacent days, the later one is pushed forward. Hard courses and courses with 4+ credits automatically get extra preparation time.',
    rules: [
      { rule: 'Rule 1', text: 'Minimum 1-day gap between regular exams (Monday exam → next on Wednesday)' },
      { rule: 'Rule 9', text: 'Hard courses and 4+ credit courses get a 2-day buffer (3 calendar days gap)' },
    ],
    inputs: ['Draft schedule from Agent 4', 'Course difficulty map (easy/medium/hard)'],
    outputs: ['Re-spaced schedule with all gap rules enforced'],
    color: '#d97706',
    statLabels: { exams_moved: 'Exams Rescheduled', hard_courses_repositioned: 'Hard Courses Moved', total_exam_days: 'Total Exam Days' },
  },
  6: {
    name: 'Arrear & Backlog Scheduler',
    functionType: 'Arrear Packer',
    description: 'Schedules arrear (backlog) exams for students who are repeating failed courses. Arrear exams are packed 2 per day (FN + AN) on consecutive days — no gap is required between arrear exam days. Arrears are placed in the opposite session of regular exams on the same day where possible.',
    rules: [
      { rule: 'Rule 2', text: '2 arrear exams per day allowed, consecutive days with no gap required' },
      { rule: 'Rule 7', text: 'Arrear exams prefer the opposite session of regular exams on the same day' },
      { rule: 'Rule 10/13', text: 'Arrear exams also follow the year-wise session pattern' },
    ],
    inputs: ['Spaced regular schedule from Agent 5', 'Arrear student enrolments', 'Open slot list'],
    outputs: ['Complete schedule including all arrear exam slots'],
    color: '#059669',
    statLabels: { arrear_courses: 'Arrear Courses', arrear_slots_assigned: 'Slots Assigned', arrear_students: 'Students with Arrears', days_used: 'Days Used' },
  },
  2: {
    name: 'Student Conflict Checker',
    functionType: 'Conflict Gatekeeper',
    description: 'The final validation agent. Checks every single student to ensure no two of their exams are scheduled in the same session on the same day. If conflicts are found, it routes back to Agent 5 or Agent 6 to fix them and retries up to 15 times automatically.',
    rules: [
      { rule: 'Rule 2', text: 'One student can have at most 1 exam per session (FN or AN)' },
    ],
    inputs: ['Complete schedule (regular + arrear)', 'All student enrolment data'],
    outputs: ['PASS (zero conflicts) or FAIL with detailed conflict list'],
    color: '#dc2626',
    statLabels: { students_checked: 'Students Checked', conflicts_found: 'Conflicts Found', clean_students: 'Clean Students' },
  },
  7: {
    name: 'Cumulative Conflict Resolver',
    functionType: 'Conflict Resolution Expert',
    description: 'When multiple conflicts persist after Agent 2 retries, Agent 7 analyzes ALL conflicts holistically. It moves courses to free slots or swaps FN/AN sessions to resolve multiple clashes at once. This is the final safety net before requiring manual review.',
    rules: [
      { rule: 'Rule 2 Extended', text: 'Resolves multiple conflicting exams that individual agent retries could not fix' },
      { rule: 'Rule 7 Extended', text: 'Finds alternative slots for backlog exams without creating new conflicts' },
    ],
    inputs: ['Conflict list from Agent 2', 'Full schedule', 'Available slot list'],
    outputs: ['Resolved schedule with conflicts minimized', 'Manual suggestions for remaining conflicts'],
    color: '#8b5cf6',
    statLabels: { resolved: 'Conflicts Resolved', unresolved: 'Unresolved', resolution_attempts: 'Attempts Made' },
  },
}

const STATUS_CONFIG = {
  idle:            { label: 'Idle',           color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
  running:         { label: 'Running',         color: '#1d4ed8', bg: '#eff6ff', border: '#1d4ed8' },
  done:            { label: 'Complete',        color: '#16a34a', bg: '#f0fdf4', border: '#16a34a' },
  failed:          { label: 'Failed',          color: '#dc2626', bg: '#fef2f2', border: '#dc2626' },
  awaiting_review: { label: 'Awaiting Review', color: '#d97706', bg: '#fffbeb', border: '#d97706' },
}

export default function AgentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { agents, runId } = usePipelineContext()
  const logRef = useRef(null)

  const agentId = parseInt(id)
  const agent = agents.find(a => a.agentId === agentId)
  const meta = AGENT_DETAIL[agentId]

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [agent?.logs])

  if (!meta) return <div className="page-body"><div className="alert alert-error">Agent not found.</div></div>

  const st = agent?.status || 'idle'
  const cfg = STATUS_CONFIG[st]
  const statEntries = Object.entries(agent?.stats || {}).filter(([k]) => meta.statLabels[k])

  const handleResume = async (useOverride, overrideData) => {
    try {
      await axios.post('/api/pipeline/resume', {
        runId, agentId,
        override: useOverride ? overrideData : null,
      })
    } catch (e) {
      console.error('Resume failed', e)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }}
            onClick={() => navigate('/agents')}>
            ← Back
          </button>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>
              <span
                style={{ cursor: 'pointer', color: '#1d4ed8' }}
                onClick={() => navigate('/agents')}
              >
                Agent Pipeline
              </span>
              {' '}›{' '}
              <span style={{ color: '#0f172a' }}>Agent {agentId} — {meta.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${meta.color}15`, border: `2px solid ${meta.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 16, color: meta.color,
              }}>{agentId}</div>
              <div>
                <h1 style={{ fontSize: 20 }}>Agent {agentId} — {meta.name}</h1>
                <p style={{ fontSize: 12, marginTop: 1 }}>{meta.functionType}</p>
              </div>
            </div>
          </div>
        </div>
        <div style={{
          padding: '8px 16px', borderRadius: 8,
          background: cfg.bg, border: `1.5px solid ${cfg.border}`,
          color: cfg.color, fontWeight: 700, fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {st === 'running' && <span className="spin">◌</span>}
          {cfg.label}
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Awaiting review banner */}
        {st === 'awaiting_review' && (
          <ReviewPanel agent={agent} agentId={agentId} onResume={handleResume} />
        )}

        {/* Stats */}
        {statEntries.length > 0 && (
          <div>
            <div className="section-title">Agent Statistics</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {statEntries.map(([k, v]) => (
                <div key={k} className="stat-tile" style={{ minWidth: 140, borderTop: `3px solid ${meta.color}` }}>
                  <div className="stat-value" style={{ color: meta.color, fontSize: 26 }}>{v}</div>
                  <div className="stat-label">{meta.statLabels[k]}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Description & Rules */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h3 style={{ marginBottom: 10 }}>What This Agent Does</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7 }}>{meta.description}</p>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Rules Enforced</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {meta.rules.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ background: meta.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: 1 }}>
                      {r.rule}
                    </span>
                    <span style={{ fontSize: 13, color: '#334155' }}>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Inputs & Outputs</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Inputs</div>
                  {meta.inputs.map((inp, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ color: '#1d4ed8', fontWeight: 700, marginTop: 1 }}>→</span>
                      <span style={{ fontSize: 13, color: '#334155' }}>{inp}</span>
                    </div>
                  ))}
                </div>
                <div className="divider" />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Outputs</div>
                  {meta.outputs.map((out, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ color: '#16a34a', fontWeight: 700, marginTop: 1 }}>←</span>
                      <span style={{ fontSize: 13, color: '#334155' }}>{out}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live logs & LLM */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h3>Live Activity Log</h3>
                {st === 'running' && (
                  <span className="badge badge-running"><span className="spin">◌</span> Live</span>
                )}
              </div>
              <div ref={logRef} className="log-box" style={{ height: 200 }}>
                {!agent?.logs?.length
                  ? <span style={{ color: '#475569' }}>Waiting for agent to start...</span>
                  : agent.logs.map((l, i) => <div key={i} style={{ marginBottom: 2 }}>› {l}</div>)
                }
              </div>
            </div>

            {agent?.summary && (
              <div className="card">
                <h3 style={{ marginBottom: 8 }}>Summary</h3>
                <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{agent.summary}</p>
              </div>
            )}

            {agent?.llmExplanation && (
              <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, background: '#1d4ed8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>AI</div>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#1e40af' }}>Ollama Explanation</span>
                </div>
                <p style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.7 }}>{agent.llmExplanation}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewPanel({ agent, agentId, onResume }) {
  const outputStr = JSON.stringify(agent?.output || [], null, 2)

  return (
    <div style={{ background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, background: '#f59e0b', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>!</div>
        <div>
          <h3 style={{ color: '#92400e' }}>Human Review Required</h3>
          <p style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>
            Agent {agentId} has completed and is waiting for your approval before the next agent runs.
          </p>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 6 }}>
          Agent Output Preview ({Array.isArray(agent?.output) ? agent.output.length : 0} items)
        </div>
        <div className="log-box" style={{ height: 120, background: '#1c1400', color: '#fbbf24' }}>
          {outputStr.slice(0, 800)}{outputStr.length > 800 ? '\n...(truncated)' : ''}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-success btn-lg" style={{ flex: 1 }}
          onClick={() => onResume(false, null)}>
          Accept & Continue to Next Agent
        </button>
        <button className="btn btn-warning" style={{ flex: 1 }}
          onClick={() => {
            const override = prompt('Paste modified JSON output (or leave blank to accept as-is):')
            if (override === null) return
            if (override.trim()) {
              try { onResume(true, JSON.parse(override)) }
              catch { alert('Invalid JSON. Please check your input.') }
            } else {
              onResume(false, null)
            }
          }}>
          Modify Output & Continue
        </button>
      </div>
    </div>
  )
}
