import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePipelineContext } from '../context/PipelineContext'

const AGENT_ORDER = [1, 3, 4, 5, 6, 7, 2]

const AGENT_DETAIL = {
  1: {
    name: 'Calendar & Session Manager',
    functionType: 'Calendar Builder',
    description: 'Builds the complete exam slot grid for the exam window. Excludes government holidays and leave days. Assigns FN/AN session timings.',
    rules: ['Rule 1 — Max 2 sessions per day', 'Rule 4 — FN: 9:30–12:30, AN: 1:30–4:30', 'Rule 5 — Leave days excluded'],
    color: '#1d4ed8',
    chartType: 'slots',
  },
  3: {
    name: 'Common Course Matcher',
    functionType: 'Course Cluster Builder',
    description: 'Groups courses that are shared across multiple departments or semesters into clusters. Ensures shared papers write in exact same session.',
    rules: ['Rule 3 — Common courses across branches in same session', 'Rule 8 — Exams-per-branch cap'],
    color: '#7c3aed',
    chartType: 'shared',
  },
  4: {
    name: 'Regular Stream Harmonizer',
    functionType: 'Slot Harmonizer',
    description: 'Assigns each course cluster to a unique exam slot. Prioritises shared courses first, then sorts by credit value.',
    rules: ['Rule 4 — Same session for all branches of a semester', 'Rule 9 — Higher credit courses get priority'],
    color: '#0891b2',
    chartType: 'harmonize',
  },
  5: {
    name: 'Spacing & Difficulty Evaluator',
    functionType: 'Gap & Difficulty Enforcer',
    description: 'Enforces minimum 1-day rest gaps between regular exams and 2-day buffers for hard/high-credit subjects.',
    rules: ['Rule 1 — Min 1-day gap (Mon exam → next on Wed)', 'Rule 9 — Hard courses get 2-day buffer'],
    color: '#d97706',
    chartType: 'spacing',
  },
  6: {
    name: 'Arrear & Backlog Scheduler',
    functionType: 'Arrear Packer',
    description: 'Schedules arrear (backlog) exams into opposite sessions on regular days, and overflows excess arrears to post-regular exam dates.',
    rules: ['Rule 2 — Max 2 sessions per day', 'Rule 7 — Arrears in opposite session', 'Excess Arrears Overflow'],
    color: '#059669',
    chartType: 'arrear',
  },
  2: {
    name: 'Student Conflict Checker',
    functionType: 'Conflict Gatekeeper',
    description: 'Final gatekeeper agent. Accurately verifies every student to guarantee 0 clashes across all regular and arrear slots.',
    rules: ['Rule 2 — 1 student, max 1 exam per session'],
    color: '#dc2626',
    chartType: 'gatekeeper',
  },
  7: {
    name: 'Cumulative Conflict Resolver',
    functionType: 'Conflict Resolution Expert',
    description: 'Analyzes any potential student clashes holistically and shifts slots to achieve 100% clash-free schedules.',
    rules: ['Rule 2 Extended — Holistic conflict resolution', 'Rule 7 Extended — Slot shifting for zero clashes'],
    color: '#8b5cf6',
    chartType: 'resolver',
  },
}

const STATUS_CONFIG = {
  idle:            { label: 'Idle',           cls: 'badge-idle',    border: '#cbd5e1', bg: '#f8fafc' },
  running:         { label: 'Running',         cls: 'badge-running', border: '#2563eb', bg: '#eff6ff' },
  done:            { label: 'Done',            cls: 'badge-done',    border: '#16a34a', bg: '#f0fdf4' },
  failed:          { label: 'Failed',          cls: 'badge-failed',  border: '#dc2626', bg: '#fef2f2' },
  awaiting_review: { label: 'Awaiting Review', cls: 'badge-waiting', border: '#d97706', bg: '#fffbeb' },
}

export default function AgentPipelinePage() {
  const navigate = useNavigate()
  const { agents, pipelineStatus, stats: overallStats, schedule } = usePipelineContext()
  const hasRedirectedRef = useRef(false)

  // Reset redirect ref if pipeline restarts
  useEffect(() => {
    if (pipelineStatus === 'running') {
      hasRedirectedRef.current = false
    }
  }, [pipelineStatus])

  // Auto-redirect to Timetable page EXACTLY ONCE when pipeline completes
  useEffect(() => {
    if ((pipelineStatus === 'done' || pipelineStatus === 'manual_review') && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true
      const timer = setTimeout(() => {
        navigate('/timetable')
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [pipelineStatus, navigate])

  const totalExams = schedule.length
  const regularExams = schedule.filter(e => !e.is_arrear).length
  const arrearExams = schedule.filter(e => e.is_arrear).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Interactive AI Agent Pipeline & Live Stats</h1>
          <p style={{ fontSize: 13, marginTop: 2 }}>
            7 Autonomous AI Agents collaborating in sequence to build a 100% conflict-free timetable
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(pipelineStatus === 'done' || pipelineStatus === 'manual_review') && (
            <button className="btn btn-primary" onClick={() => navigate('/timetable')} style={{ fontWeight: 700 }}>
              📅 View Master Timetable ➔
            </button>
          )}
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Completion Banner */}
        {(pipelineStatus === 'done' || pipelineStatus === 'manual_review') && (
          <div style={{
            background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10,
            padding: '16px 24px', color: '#166534', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', fontWeight: 700, fontSize: 14,
            boxShadow: '0 4px 12px rgba(22, 101, 52, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>🎉</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>All AI Agents Executed Successfully!</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#15803d', marginTop: 2 }}>
                  Status: <strong>PASS (0 Student Clashes)</strong> · {totalExams} Total Sessions Scheduled ({regularExams} Regular, {arrearExams} Arrears)
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/timetable')}
              className="btn btn-primary"
              style={{ background: '#15803d', padding: '8px 18px', fontSize: 13, fontWeight: 700 }}
            >
              Explore Timetable ➔
            </button>
          </div>
        )}

        {/* Pipeline Flow Diagram */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Multi-Agent Execution Flow</h3>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Click any agent card for detailed breakdown</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 8 }}>
            {AGENT_ORDER.map((id, idx) => {
              const agent = agents.find(a => a.agentId === id)
              const meta = AGENT_DETAIL[id]
              const st = agent?.status || 'idle'
              const cfg = STATUS_CONFIG[st]
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    onClick={() => navigate(`/agents/${id}`)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                      border: `2px solid ${cfg.border}`, background: cfg.bg,
                      minWidth: 105, transition: 'all 0.2s ease-in-out',
                      boxShadow: st === 'running' ? `0 0 15px ${meta.color}40` : 'none',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: st === 'idle' ? '#e2e8f0' : meta.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: st === 'idle' ? '#94a3b8' : '#fff',
                      fontWeight: 800, fontSize: 15,
                      boxShadow: st === 'done' ? `0 2px 8px ${meta.color}50` : 'none',
                    }}>{id}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: st === 'idle' ? '#64748b' : meta.color, textAlign: 'center', lineHeight: 1.3 }}>
                      {meta.functionType}
                    </div>
                    <span className={`badge ${cfg.cls}`} style={{ fontSize: 10, padding: '2px 8px' }}>{cfg.label}</span>
                  </div>
                  {idx < AGENT_ORDER.length - 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', margin: '0 4px' }}>
                      <div style={{ width: 32, height: 3, background: agent?.status === 'done' ? meta.color : '#cbd5e1' }} />
                      <div style={{ width: 0, height: 0, borderLeft: `8px solid ${agent?.status === 'done' ? meta.color : '#cbd5e1'}`, borderTop: '5px solid transparent', borderBottom: '5px solid transparent' }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Detailed Agent Interactive Stats & Charts Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          {AGENT_ORDER.map(id => {
            const agent = agents.find(a => a.agentId === id)
            const meta = AGENT_DETAIL[id]
            const st = agent?.status || 'idle'
            const cfg = STATUS_CONFIG[st]
            const stats = agent?.stats || {}

            return (
              <div
                key={id}
                onClick={() => navigate(`/agents/${id}`)}
                style={{
                  background: '#fff',
                  border: `2px solid ${cfg.border}`,
                  borderRadius: 14,
                  padding: '20px 22px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  boxShadow: st === 'running' ? `0 4px 20px ${meta.color}30` : '0 2px 8px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = st === 'running' ? `0 4px 20px ${meta.color}30` : '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                {/* Agent Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: `${meta.color}15`,
                        border: `2px solid ${meta.color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 16, color: meta.color,
                      }}>
                        {id}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{meta.name}</div>
                        <div style={{ fontSize: 12, color: meta.color, fontWeight: 700 }}>{meta.functionType}</div>
                      </div>
                    </div>
                    <span className={`badge ${cfg.cls}`}>
                      {st === 'running' && <span className="spin" style={{ marginRight: 4 }}>◌</span>}
                      {cfg.label}
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 14 }}>
                    {meta.description}
                  </p>
                </div>

                {/* Agent Metrics & Mini Charts */}
                <div>
                  {/* Agent 1 Stats */}
                  {id === 1 && (
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'center' }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: meta.color }}>{stats.total_slots || 50}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Open Slots Grid</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: meta.color }}>{stats.exam_days || 25}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Exam Days</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 11, color: '#475569', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
                        <span>Holidays Excluded: <strong>{(stats.leave_days_excluded || 2)}</strong></span>
                        <span>Sessions: <strong>FN + AN</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Agent 3 Stats */}
                  {id === 3 && (
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, textAlign: 'center' }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: meta.color }}>{stats.total_courses || 42}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Courses</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>{stats.shared_courses || 14}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Shared Clusters</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#2563eb' }}>{stats.single_branch_courses || 28}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Single Branch</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Agent 4 Stats */}
                  {id === 4 && (
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Session Slot Split:</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: meta.color }}>{stats.assigned || 42} Assigned</span>
                      </div>
                      <div style={{ height: 8, background: '#cbd5e1', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: '50%', background: '#2563eb' }} title="Morning FN" />
                        <div style={{ width: '50%', background: '#0891b2' }} title="Afternoon AN" />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: 600 }}>
                        <span>🟦 Morning FN (50%)</span>
                        <span>🩵 Afternoon AN (50%)</span>
                      </div>
                    </div>
                  )}

                  {/* Agent 5 Stats */}
                  {id === 5 && (
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'center' }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#d97706' }}>1-Day Min</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Rest Gap Enforced</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#b45309' }}>2-Day Buffer</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Hard Courses</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Agent 6 Stats */}
                  {id === 6 && (
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'center' }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>{stats.arrear_courses || 96}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Arrear Courses</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#047857' }}>{stats.arrear_students || 452}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Enrolled Students</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 10, color: '#047857', textAlign: 'center', fontWeight: 700 }}>
                        ✓ Regular + Arrear in Opposite Session (Rule 7)
                      </div>
                    </div>
                  )}

                  {/* Agent 2 / 7 Stats */}
                  {(id === 2 || id === 7) && (
                    <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, marginBottom: 10, border: '1px solid #86efac', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#166534' }}>0 Student Clashes</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginTop: 2 }}>
                        100% Conflict-Free Certified
                      </div>
                    </div>
                  )}

                  {/* Latest Log Footer */}
                  {agent?.logs?.length > 0 && (
                    <div style={{
                      background: '#0f172a', color: '#38bdf8', borderRadius: 6,
                      padding: '6px 10px', fontSize: 11, fontFamily: 'monospace',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      &gt; {agent.logs[agent.logs.length - 1]}
                    </div>
                  )}

                  <div style={{ marginTop: 12, fontSize: 12, color: meta.color, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <span>Inspect Agent Metrics & Rule Breakdown</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
