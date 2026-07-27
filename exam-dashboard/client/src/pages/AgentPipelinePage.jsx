import { useNavigate } from 'react-router-dom'
import { usePipelineContext } from '../context/PipelineContext'

const AGENT_ORDER = [1, 3, 4, 5, 6, 7, 2]

const AGENT_DETAIL = {
  1: {
    name: 'Calendar & Session Manager',
    functionType: 'Calendar Builder',
    description: 'Builds the exam slot grid for the entire exam window. Excludes government holidays and leave days. Assigns FN/AN timings and maps each slot to the year-wise session pattern.',
    rules: ['Rule 1 — Max 2 sessions per day', 'Rule 4 — FN: 9:30–12:30, AN: 1:30–4:30', 'Rule 5 — Leave days excluded', 'Rule 10 — Year-wise session pattern'],
    color: '#1d4ed8',
    inputs: 'Start date, End date, Leave days, Year-session pattern',
    outputs: 'List of open exam slots with date, session, time, preferred years',
  },
  3: {
    name: 'Common Course Matcher',
    functionType: 'Course Cluster Builder',
    description: 'Groups courses that are shared across multiple departments or semesters into clusters. Shared courses must be scheduled in the same session for all branches simultaneously.',
    rules: ['Rule 3 — Common courses across branches in same session', 'Rule 5 — Cross-parity semester handling', 'Rule 8 — Exams-per-branch cap', 'Rule 11 — Max accommodation in single session'],
    color: '#7c3aed',
    inputs: 'Student enrolment data, Exams-per-branch limits',
    outputs: 'Course clusters with branch lists, credit values, shared flags',
  },
  4: {
    name: 'Regular Stream Harmonizer',
    functionType: 'Slot Harmonizer',
    description: 'Assigns each course cluster to a unique exam slot. Prioritises shared courses first, then sorts by credit value. Ensures no two courses share the same slot.',
    rules: ['Rule 4 — Same session for all branches of a semester', 'Rule 9 — Higher credit courses get priority', 'Rule 10 — Year-wise session preference', 'Rule 11 — Shared courses maximally accommodated'],
    color: '#0891b2',
    inputs: 'Open slots, Course clusters, Year-session pattern, Dept roll ranges',
    outputs: 'Draft schedule with date, session, time, roll ranges per course',
  },
  5: {
    name: 'Spacing & Difficulty Evaluator',
    functionType: 'Gap & Difficulty Enforcer',
    description: 'Enforces minimum gaps between consecutive exams for each branch and year. Hard courses and high-credit courses get extra preparation time.',
    rules: ['Rule 1 — Min 1-day gap (Mon exam → next on Wed)', 'Rule 9 — Hard/4+ credit courses get 2-day buffer'],
    color: '#d97706',
    inputs: 'Draft schedule, Course difficulty map',
    outputs: 'Re-spaced schedule with enforced gaps',
  },
  6: {
    name: 'Arrear & Backlog Scheduler',
    functionType: 'Arrear Packer',
    description: 'Schedules arrear (backlog) exams for students who have failed previous semesters. Packs 2 arrear exams per day with no gap requirement. Fits arrears into the year-wise session pattern.',
    rules: ['Rule 2 — 2 arrear exams per day, consecutive days allowed', 'Rule 7 — Arrears in opposite session of regular exam days', 'Rule 10/13 — Arrears fit year-wise session pattern'],
    color: '#059669',
    inputs: 'Spaced regular schedule, Arrear enrolments, Open slots',
    outputs: 'Complete schedule including arrear slots',
  },
  2: {
    name: 'Student Conflict Checker',
    functionType: 'Conflict Gatekeeper',
    description: 'Final validation agent. Checks every student to ensure no two of their exams are scheduled in the same session. Retries up to 15 times by re-routing to spacing or arrear agents.',
    rules: ['Rule 2 — 1 student, max 1 exam per session'],
    color: '#dc2626',
    inputs: 'Complete schedule, All enrolment data',
    outputs: 'PASS or FAIL with conflict list',
  },
  7: {
    name: 'Cumulative Conflict Resolver',
    functionType: 'Conflict Resolution Expert',
    description: 'When multiple conflicts persist after Agent 2 retries, Agent 7 analyzes ALL conflicts holistically. Moves courses to free slots or swaps FN/AN sessions to resolve multiple clashes at once.',
    rules: ['Rule 2 Extended — Resolves multiple conflicting exams', 'Rule 7 Extended — Finds alternative slots for arrears without new conflicts'],
    color: '#8b5cf6',
    inputs: 'Conflict list, Full schedule, Available slot list',
    outputs: 'Resolved schedule with minimized conflicts, Manual suggestions for remaining',
  },
}

const STATUS_CONFIG = {
  idle:            { label: 'Idle',           cls: 'badge-idle',    border: '#e2e8f0', bg: '#f8fafc' },
  running:         { label: 'Running',         cls: 'badge-running', border: '#1d4ed8', bg: '#eff6ff' },
  done:            { label: 'Done',            cls: 'badge-done',    border: '#16a34a', bg: '#f0fdf4' },
  failed:          { label: 'Failed',          cls: 'badge-failed',  border: '#dc2626', bg: '#fef2f2' },
  awaiting_review: { label: 'Awaiting Review', cls: 'badge-waiting', border: '#d97706', bg: '#fffbeb' },
}

export default function AgentPipelinePage() {
  const navigate = useNavigate()
  const { agents } = usePipelineContext()

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Agent Pipeline</h1>
          <p style={{ fontSize: 13, marginTop: 2 }}>7 AI agents work in sequence to build a conflict-free timetable</p>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Pipeline flow diagram */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Pipeline Flow</h3>
          <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
            {AGENT_ORDER.map((id, idx) => {
              const agent = agents.find(a => a.agentId === id)
              const meta = AGENT_DETAIL[id]
              const st = agent?.status || 'idle'
              const cfg = STATUS_CONFIG[st]
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
                  <div onClick={() => navigate(`/agents/${id}`)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${cfg.border}`, background: cfg.bg,
                    minWidth: 90, transition: 'all 0.15s',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: st === 'idle' ? '#e2e8f0' : meta.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: st === 'idle' ? '#94a3b8' : '#fff',
                      fontWeight: 800, fontSize: 14,
                      animation: st === 'running' ? 'pulse-ring 1.8s infinite' : 'none',
                    }}>{id}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: st === 'idle' ? '#94a3b8' : meta.color, textAlign: 'center', lineHeight: 1.3 }}>
                      {meta.functionType}
                    </div>
                    <span className={`badge ${cfg.cls}`} style={{ fontSize: 9 }}>{cfg.label}</span>
                  </div>
                  {idx < AGENT_ORDER.length - 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <div style={{ width: 28, height: 2, background: agent?.status === 'done' ? meta.color : '#e2e8f0' }} />
                      <div style={{ width: 0, height: 0, borderLeft: `6px solid ${agent?.status === 'done' ? meta.color : '#e2e8f0'}`, borderTop: '4px solid transparent', borderBottom: '4px solid transparent' }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Agent cards grid */}
        <div className="grid-auto">
          {AGENT_ORDER.map(id => {
            const agent = agents.find(a => a.agentId === id)
            const meta = AGENT_DETAIL[id]
            const st = agent?.status || 'idle'
            const cfg = STATUS_CONFIG[st]
            const statEntries = Object.entries(agent?.stats || {}).filter(([k]) =>
              ['total_slots','exam_days','total_courses','shared_courses','assigned','unassigned','exams_moved','arrear_slots_assigned','arrear_students','students_checked','conflicts_found'].includes(k)
            )

            return (
              <div key={id} onClick={() => navigate(`/agents/${id}`)} style={{
                background: '#fff', border: `2px solid ${cfg.border}`,
                borderRadius: 12, padding: '18px 20px',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: st === 'running' ? `0 0 0 3px ${meta.color}20` : 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.08)`}
              onMouseLeave={e => e.currentTarget.style.boxShadow = st === 'running' ? `0 0 0 3px ${meta.color}20` : 'none'}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: st === 'idle' ? '#f1f5f9' : `${meta.color}15`,
                      border: `2px solid ${st === 'idle' ? '#e2e8f0' : meta.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 15, color: st === 'idle' ? '#94a3b8' : meta.color,
                    }}>{id}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{meta.name}</div>
                      <div style={{ fontSize: 11, color: meta.color, fontWeight: 600 }}>{meta.functionType}</div>
                    </div>
                  </div>
                  <span className={`badge ${cfg.cls}`}>
                    {st === 'running' && <span className="spin" style={{ marginRight: 3 }}>◌</span>}
                    {cfg.label}
                  </span>
                </div>

                {/* Description */}
                <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 10 }}>
                  {meta.description.slice(0, 100)}...
                </p>

                {/* Stats mini-grid */}
                {statEntries.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                    {statEntries.slice(0, 3).map(([k, v]) => (
                      <div key={k} style={{ background: '#f8fafc', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: meta.color }}>{v}</div>
                        <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                          {k.replace(/_/g, ' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Awaiting review banner */}
                {st === 'awaiting_review' && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                    Waiting for your review — click to open
                  </div>
                )}

                {/* Latest log */}
                {agent?.logs?.length > 0 && (
                  <div style={{ background: '#f8fafc', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginTop: 6 }}>
                    {agent.logs[agent.logs.length - 1]}
                  </div>
                )}

                <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Click to view full details
                  <span style={{ marginLeft: 'auto', color: meta.color }}>→</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
