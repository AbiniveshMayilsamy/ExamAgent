import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePipelineContext } from '../context/PipelineContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import SDIHeroLanding from '../components/SDIHeroLanding'

const AGENT_ORDER = [1, 3, 4, 5, 6, 2]
const AGENT_META = {
  1: { name: 'Calendar Builder',     short: 'Calendar',  color: '#1d4ed8' },
  3: { name: 'Course Matcher',       short: 'Matcher',   color: '#7c3aed' },
  4: { name: 'Slot Harmonizer',      short: 'Harmonizer',color: '#0891b2' },
  5: { name: 'Gap Enforcer',         short: 'Spacing',   color: '#d97706' },
  6: { name: 'Arrear Packer',        short: 'Arrears',   color: '#059669' },
  2: { name: 'Conflict Checker',     short: 'Validator', color: '#dc2626' },
}

const STATUS_BADGE = {
  idle:            <span className="badge badge-idle">Idle</span>,
  running:         <span className="badge badge-running"><span className="spin">◌</span> Running</span>,
  done:            <span className="badge badge-done">Done</span>,
  failed:          <span className="badge badge-failed">Failed</span>,
  awaiting_review: <span className="badge badge-waiting">Awaiting Review</span>,
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('hero') // 'hero' (SDI Presence look) or 'operational'
  const { agents, pipelineStatus, stats, schedule, deptRollRanges } = usePipelineContext()

  const doneAgents = agents.filter(a => a.status === 'done').length
  const progress = Math.round((doneAgents / 6) * 100)

  // Chart data: exams per branch
  const branchData = Object.entries(deptRollRanges).map(([branch]) => ({
    branch,
    exams: schedule.filter(e => !e.is_arrear && (e.branches || []).includes(branch)).length,
    arrears: schedule.filter(e => e.is_arrear && (e.branches || []).includes(branch)).length,
  })).filter(d => d.exams > 0)

  const statusBanner = {
    running:       { cls: 'alert alert-info',    text: 'Pipeline is running — agents are processing your data. This may take a few minutes.' },
    done:          { cls: 'alert alert-success',  text: 'Timetable generated successfully with zero conflicts. Go to Timetable to view and export.' },
    failed:        { cls: 'alert alert-error',    text: 'Pipeline encountered an error. Check the Agent Pipeline page for details.' },
    manual_review: { cls: 'alert alert-warning',  text: 'Some conflicts could not be auto-resolved. Manual review is required on the Timetable page.' },
  }[pipelineStatus]

  if (viewMode === 'hero') {
    return (
      <div>
        <div style={{
          background: '#020813',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '8px 24px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#65acff', letterSpacing: 1 }}>
              VIEW MODE:
            </span>
            <button className="badge badge-blue" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setViewMode('hero')}>
              SDI Presence Hero View
            </button>
            <button className="badge badge-idle" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setViewMode('operational')}>
              Operational Dashboard View
            </button>
          </div>
          <button className="sdi-btn-gradient" style={{ padding: '6px 16px', fontSize: 12 }} onClick={() => navigate('/schedule')}>
            + New Schedule
          </button>
        </div>
        <SDIHeroLanding onSwitchToDashboard={() => setViewMode('operational')} />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <button className="badge badge-idle" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setViewMode('hero')}>
              ← SDI Hero Landing
            </button>
            <button className="badge badge-blue" style={{ cursor: 'pointer', border: 'none' }}>
              Operational Dashboard
            </button>
          </div>
          <h1>Dashboard</h1>
          <p style={{ fontSize: 13, marginTop: 2 }}>Overview of your exam scheduling pipeline</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/schedule')}>
          + New Schedule
        </button>
      </div>



      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Status banner */}
        {statusBanner && (
          <div className={statusBanner.cls}>{statusBanner.text}</div>
        )}

        {/* Stat tiles */}
        <div className="grid-4">
          {[
            { label: 'Regular Exams',  value: stats.totalExams,     sub: 'Scheduled',       color: '#1d4ed8' },
            { label: 'Arrear Exams',   value: stats.totalArrears,   sub: 'Backlog slots',   color: '#7c3aed' },
            { label: 'Conflicts',      value: stats.conflictsFound, sub: stats.conflictsFound ? 'Need review' : 'All clear', color: stats.conflictsFound ? '#dc2626' : '#16a34a' },
            { label: 'Departments',    value: Object.keys(deptRollRanges).length, sub: 'Branches covered', color: '#0891b2' },
          ].map(s => (
            <div className="stat-tile" key={s.label} style={{ borderTop: `3px solid ${s.color}` }}>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Pipeline flow */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>Agent Pipeline</h3>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={() => navigate('/agents')}>
                View Details
              </button>
            </div>

            {/* Progress */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{doneAgents} of 6 agents complete</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Agent flow */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              {AGENT_ORDER.map((id, idx) => {
                const agent = agents.find(a => a.agentId === id)
                const meta = AGENT_META[id]
                const st = agent?.status || 'idle'
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      onClick={() => navigate(`/agents/${id}`)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                        border: `2px solid ${st === 'done' ? meta.color : st === 'running' ? meta.color : '#e2e8f0'}`,
                        background: st === 'done' ? `${meta.color}10` : st === 'running' ? `${meta.color}08` : '#f8fafc',
                        minWidth: 72, transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: st === 'done' ? meta.color : st === 'running' ? meta.color : '#e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: st === 'idle' ? '#94a3b8' : '#fff',
                        fontSize: 12, fontWeight: 800,
                        animation: st === 'running' ? 'pulse-ring 1.8s infinite' : 'none',
                      }}>{id}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: st === 'done' ? meta.color : '#64748b', textAlign: 'center' }}>
                        {meta.short}
                      </div>
                    </div>
                    {idx < AGENT_ORDER.length - 1 && (
                      <div style={{
                        width: 20, height: 2,
                        background: agents.find(a => a.agentId === id)?.status === 'done' ? meta.color : '#e2e8f0',
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Branch chart */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Exams by Department</h3>
            {branchData.length === 0 ? (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
                Run a schedule to see department breakdown
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={branchData} barSize={18}>
                  <XAxis dataKey="branch" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="exams" name="Regular" radius={[4, 4, 0, 0]}>
                    {branchData.map((_, i) => <Cell key={i} fill="#1d4ed8" />)}
                  </Bar>
                  <Bar dataKey="arrears" name="Arrears" radius={[4, 4, 0, 0]}>
                    {branchData.map((_, i) => <Cell key={i} fill="#fbbf24" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Quick Actions</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/schedule')}>
              + Create New Schedule
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/agents')}>
              View Agent Pipeline
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/timetable')}>
              View Timetable
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/history')}>
              Run History
            </button>
          </div>
        </div>

        {/* Recent run summary */}
        {schedule.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3>Latest Schedule Preview</h3>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={() => navigate('/timetable')}>
                Full Timetable
              </button>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1.5px solid #e2e8f0' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Session</th><th>Time</th><th>Course</th><th>Departments</th><th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.slice(0, 8).map((e, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{e.date}</td>
                      <td>
                        <span className={`badge ${e.session === 'FN' ? 'badge-blue' : 'badge-yellow'}`}>
                          {e.session}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{e.time}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8' }}>{e.course_code}</span>
                        <span style={{ color: '#64748b', marginLeft: 8, fontSize: 12 }}>{e.course_name}</span>
                      </td>
                      <td style={{ fontSize: 12 }}>{(e.branches || []).join(', ')}</td>
                      <td>
                        <span className={`badge ${e.is_arrear ? 'badge-yellow' : 'badge-blue'}`}>
                          {e.is_arrear ? 'Arrear' : 'Regular'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
