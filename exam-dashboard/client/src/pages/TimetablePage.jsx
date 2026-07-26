import { useState } from 'react'
import { usePipelineContext } from '../context/PipelineContext'

const SESSION_TIMINGS = { FN: '9:30 AM – 12:30 PM', AN: '1:30 PM – 4:30 PM' }

export default function TimetablePage() {
  const { schedule, conflicts, deptRollRanges, stats } = usePipelineContext()
  const [view, setView] = useState('dept')
  const [typeFilter, setTypeFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [search, setSearch] = useState('')

  const allBranches = [...new Set(schedule.flatMap(e => e.branches || []))].sort()

  const filtered = schedule.filter(e => {
    const typeOk = typeFilter === 'all' || (typeFilter === 'regular' ? !e.is_arrear : e.is_arrear)
    const deptOk = branchFilter === 'all' || (e.branches || []).includes(branchFilter)
    const searchOk = !search || e.course_code?.toLowerCase().includes(search.toLowerCase()) || e.course_name?.toLowerCase().includes(search.toLowerCase())
    return typeOk && deptOk && searchOk
  })

  const sorted = [...filtered].sort((a, b) => a.date > b.date ? 1 : a.date < b.date ? -1 : 0)

  const exportCSV = () => {
    const headers = ['Date', 'Session', 'Time', 'Course Code', 'Course Name', 'Semester', 'Year', 'Branches', 'Type', 'Credits']
    const rows = sorted.map(e => [
      e.date, e.session, SESSION_TIMINGS[e.session], e.course_code, e.course_name,
      e.semester, e.year, (e.branches || []).join('; '), e.is_arrear ? 'Arrear' : 'Regular', e.credits || 3,
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'exam_timetable.csv'; a.click()
  }

  if (schedule.length === 0) {
    return (
      <div>
        <div className="page-header"><h1>Timetable</h1></div>
        <div className="page-body">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#e2e8f0' }}>▦</div>
            <h2 style={{ color: '#94a3b8', marginBottom: 8 }}>No timetable yet</h2>
            <p style={{ color: '#94a3b8' }}>Generate a schedule first from the New Schedule page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Timetable</h1>
          <p style={{ fontSize: 13, marginTop: 2 }}>
            {stats.totalExams} regular exams · {stats.totalArrears} arrear exams · {allBranches.length} departments
          </p>
        </div>
        <button className="btn btn-primary" onClick={exportCSV}>Export CSV</button>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Conflicts alert */}
        {conflicts.length > 0 && (
          <div className="alert alert-warning">
            {conflicts.length} unresolved conflict{conflicts.length > 1 ? 's' : ''} found. These students have two exams in the same session.
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Regular Exams', value: schedule.filter(e => !e.is_arrear).length, color: '#1d4ed8' },
            { label: 'Arrear Exams', value: schedule.filter(e => e.is_arrear).length, color: '#7c3aed' },
            { label: 'FN Sessions', value: schedule.filter(e => e.session === 'FN').length, color: '#0891b2' },
            { label: 'AN Sessions', value: schedule.filter(e => e.session === 'AN').length, color: '#d97706' },
            { label: 'Conflicts', value: conflicts.length, color: conflicts.length ? '#dc2626' : '#16a34a' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', border: `1.5px solid #e2e8f0`, borderRadius: 10,
              padding: '12px 18px', borderTop: `3px solid ${s.color}`,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2 }}>
            {[['dept', 'Dept-wise'], ['table', 'All Exams']].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: view === v ? '#fff' : 'transparent',
                color: view === v ? '#1d4ed8' : '#64748b',
                fontWeight: view === v ? 700 : 500, fontSize: 12,
                boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}>{l}</button>
            ))}
          </div>

          <div style={{ width: 1, height: 28, background: '#e2e8f0' }} />

          {/* Type filter */}
          {['all', 'regular', 'arrear'].map(f => (
            <button key={f} onClick={() => setTypeFilter(f)} style={{
              padding: '6px 14px', borderRadius: 6, border: `1.5px solid ${typeFilter === f ? '#1d4ed8' : '#e2e8f0'}`,
              background: typeFilter === f ? '#eff6ff' : '#fff',
              color: typeFilter === f ? '#1d4ed8' : '#64748b',
              fontWeight: typeFilter === f ? 700 : 500, fontSize: 12, cursor: 'pointer',
            }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}

          {/* Branch filter */}
          <select className="form-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
            style={{ width: 160 }}>
            <option value="all">All Departments</option>
            {allBranches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          {/* Search */}
          <input className="form-input" placeholder="Search course code or name..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 220 }} />

          <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>
            {sorted.length} exams shown
          </span>
        </div>

        {/* Dept-wise view */}
        {view === 'dept' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {allBranches.filter(b => branchFilter === 'all' || b === branchFilter).map(branch => {
              const branchExams = sorted.filter(e => (e.branches || []).includes(branch))
              if (branchExams.length === 0) return null
              const semRanges = deptRollRanges[branch] || {}
              const regular = branchExams.filter(e => !e.is_arrear)
              const arrears = branchExams.filter(e => e.is_arrear)

              return (
                <div key={branch} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Dept header */}
                  <div style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 40, height: 40, background: '#1d4ed8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>
                      {branch}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{branch} Department</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {Object.entries(semRanges).map(([sem, rr]) => (
                          <span key={sem} style={{ marginRight: 12 }}>
                            <span style={{ fontWeight: 600 }}>Sem {sem}:</span> {rr}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span className="badge badge-blue">{regular.length} Regular</span>
                      {arrears.length > 0 && <span className="badge badge-yellow">{arrears.length} Arrear</span>}
                    </div>
                  </div>

                  {/* Exams table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Session</th>
                          <th>Time</th>
                          <th>Course Code</th>
                          <th>Course Name</th>
                          <th>Semester</th>
                          <th>Credits</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {branchExams.map((e, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{e.date}</td>
                            <td>
                              <span className={`badge ${e.session === 'FN' ? 'badge-blue' : 'badge-yellow'}`}>
                                {e.session}
                              </span>
                            </td>
                            <td style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>
                              {SESSION_TIMINGS[e.session]}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8' }}>{e.course_code}</td>
                            <td>{e.course_name}</td>
                            <td style={{ textAlign: 'center' }}>Sem {e.semester}</td>
                            <td style={{ textAlign: 'center', color: (e.credits || 3) >= 4 ? '#dc2626' : '#64748b', fontWeight: (e.credits || 3) >= 4 ? 700 : 400 }}>
                              {e.credits || 3}
                            </td>
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
              )
            })}
          </div>
        )}

        {/* Flat table view */}
        {view === 'table' && (
          <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Session</th>
                    <th>Time</th>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Sem</th>
                    <th>Year</th>
                    <th>Departments</th>
                    <th>Roll Ranges</th>
                    <th>Credits</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr><td colSpan={11} style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>No exams match your filters</td></tr>
                  ) : sorted.map((e, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{e.date}</td>
                      <td><span className={`badge ${e.session === 'FN' ? 'badge-blue' : 'badge-yellow'}`}>{e.session}</span></td>
                      <td style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>{SESSION_TIMINGS[e.session]}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8' }}>{e.course_code}</td>
                      <td>{e.course_name}</td>
                      <td style={{ textAlign: 'center' }}>{e.semester}</td>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>Yr {e.year}</td>
                      <td style={{ fontSize: 12 }}>{(e.branches || []).join(', ')}</td>
                      <td style={{ fontSize: 11, color: '#64748b' }}>
                        {e.roll_ranges && Object.entries(e.roll_ranges).map(([b, rr]) => (
                          <div key={b}><span style={{ fontWeight: 600, color: '#1d4ed8' }}>{b}:</span> {rr}</div>
                        ))}
                      </td>
                      <td style={{ textAlign: 'center', color: (e.credits || 3) >= 4 ? '#dc2626' : '#64748b', fontWeight: (e.credits || 3) >= 4 ? 700 : 400 }}>
                        {e.credits || 3}
                      </td>
                      <td><span className={`badge ${e.is_arrear ? 'badge-yellow' : 'badge-blue'}`}>{e.is_arrear ? 'Arrear' : 'Regular'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Conflicts section */}
        {conflicts.length > 0 && (
          <div className="card">
            <h3 style={{ color: '#dc2626', marginBottom: 12 }}>Unresolved Conflicts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {conflicts.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#dc2626', fontSize: 12 }}>{c.reg_no}</span>
                  <span style={{ color: '#334155', fontSize: 13 }}>
                    has both <strong>{c.course_a}</strong> and <strong>{c.course_b}</strong> on {c.date} {c.session}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
