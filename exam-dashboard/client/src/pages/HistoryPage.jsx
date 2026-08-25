import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const STATUS_CONFIG = {
  running:       { label: 'Running',       cls: 'badge-running', color: '#1d4ed8' },
  done:          { label: 'Complete',      cls: 'badge-done',    color: '#16a34a' },
  failed:        { label: 'Failed',        cls: 'badge-failed',  color: '#dc2626' },
  manual_review: { label: 'Needs Review',  cls: 'badge-waiting', color: '#d97706' },
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/runs').then(r => { setRuns(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const loadRun = async (id) => {
    const { data } = await axios.get(`/api/runs/${id}`)
    setSelected(data)
  }

  if (loading) return (
    <div>
      <div className="page-header"><h1>Run History</h1></div>
      <div className="page-body"><div style={{ color: '#94a3b8', fontSize: 13 }}>Loading...</div></div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Run History</h1>
          <p style={{ fontSize: 13, marginTop: 2 }}>{runs.length} pipeline runs recorded</p>
        </div>
      </div>

      <div className="page-body">
        {runs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#e2e8f0' }}>◷</div>
            <h2 style={{ color: '#94a3b8', marginBottom: 8 }}>No runs yet</h2>
            <p style={{ color: '#94a3b8', marginBottom: 20 }}>Generate your first timetable to see history here.</p>
            <button className="btn btn-primary" onClick={() => navigate('/schedule')}>Create First Schedule</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selected ? '380px 1fr' : '1fr', gap: 20 }}>
            {/* Run list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="section-title">All Runs</div>
              {runs.map(run => {
                const cfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.failed
                const isSelected = selected?._id === run._id
                // Build a human-readable run label from semType + startDate
                const semLabel = run.semType === 'even' ? 'Even Sem' : 'Odd Sem'
                const dateLabel = run.startDate
                  ? (() => { const d = new Date(run.startDate); return isNaN(d) ? run.startDate : d.toLocaleString('en-IN', { month: 'short', year: 'numeric' }) })()
                  : null
                const runLabel = dateLabel ? `${semLabel} — ${dateLabel}` : semLabel
                return (
                  <div key={run._id} onClick={() => loadRun(run._id)} style={{
                    background: '#fff', border: `1.5px solid ${isSelected ? '#1d4ed8' : '#e2e8f0'}`,
                    borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: isSelected ? '0 0 0 3px #dbeafe' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                        {runLabel}
                      </span>
                      <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                    </div>
                    {run.inputFile && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                        {run.inputFile}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                      {new Date(run.startedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                      <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{run.totalExams ?? 0} exams</span>
                      <span style={{ color: '#7c3aed', fontWeight: 600 }}>{run.totalArrears ?? 0} arrears</span>
                      <span style={{ color: run.conflictsFound ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                        {run.conflictsFound ?? 0} conflicts
                      </span>
                    </div>
                    {run.startDate && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        {run.startDate} → {run.endDate}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Run detail */}
            {selected && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2>Run Details</h2>
                  <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => setSelected(null)}>Close</button>
                </div>

                {/* Summary stats */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Regular Exams', value: selected.totalExams, color: '#1d4ed8' },
                    { label: 'Arrear Exams', value: selected.totalArrears, color: '#7c3aed' },
                    { label: 'Conflicts', value: selected.conflictsFound, color: selected.conflictsFound ? '#dc2626' : '#16a34a' },
                  ].map(s => (
                    <div key={s.label} className="stat-tile" style={{ borderTop: `3px solid ${s.color}`, minWidth: 120 }}>
                      <div className="stat-value" style={{ color: s.color, fontSize: 24 }}>{s.value ?? 0}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Config used */}
                <div className="card">
                  <h3 style={{ marginBottom: 12 }}>Configuration Used</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'File', value: selected.inputFile },
                      { label: 'Period', value: `${selected.startDate} → ${selected.endDate}` },
                      { label: 'Holidays', value: selected.leaveDays?.join(', ') || 'None' },
                      { label: 'Human Review', value: selected.humanIntervention ? 'Enabled' : 'Disabled' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', gap: 12, fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ width: 100, color: '#64748b', fontWeight: 600, flexShrink: 0 }}>{label}</span>
                        <span style={{ color: '#0f172a' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agent results */}
                <div className="card">
                  <h3 style={{ marginBottom: 12 }}>Agent Results</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(selected.agents || []).map(a => {
                      const cfg = STATUS_CONFIG[a.status] || { label: a.status, cls: 'badge-idle', color: '#94a3b8' }
                      return (
                        <div key={a.agentId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#64748b' }}>
                            {a.agentId}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{a.agentName}</div>
                            {a.summary && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{a.summary}</div>}
                          </div>
                          <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Audit log */}
                {selected.auditLog?.length > 0 && (
                  <div className="card">
                    <h3 style={{ marginBottom: 10 }}>Audit Log</h3>
                    <div className="log-box" style={{ height: 200 }}>
                      {selected.auditLog.map((line, i) => (
                        <div key={i} style={{ marginBottom: 3 }}>› {line}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Suggestions */}
                {selected.aiSuggestions && (
                  <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 12, padding: '16px 18px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1e40af', marginBottom: 8 }}>AI Suggestions from this Run</div>
                    <p style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{selected.aiSuggestions}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
