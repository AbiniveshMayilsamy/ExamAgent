import { useState } from 'react'
import { usePipelineContext } from '../context/PipelineContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const SESSION_TIMINGS = { FN: '9:30 AM – 12:30 PM', AN: '1:30 PM – 4:30 PM' }

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const dayName = DAY_NAMES[d.getDay()]
  const day = d.getDate()
  const month = d.getMonth() + 1
  return `${dayName} - ${day}/${month}/${d.getFullYear()}`
}

function getMonthYear(dateStr) {
  const d = new Date(dateStr)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default function TimetablePage() {
  const { schedule, conflicts, deptRollRanges, stats, agents } = usePipelineContext()
  const [expandedDay, setExpandedDay] = useState(null)
  const [viewMode, setViewMode] = useState('timeline') // 'timeline' or 'table'

  // Group exams by date
  const examsByDate = {}
  schedule.forEach(e => {
    if (!examsByDate[e.date]) examsByDate[e.date] = []
    examsByDate[e.date].push(e)
  })

  // Sort dates
  const sortedDates = Object.keys(examsByDate).sort()

  // Monthly stats
  const monthlyStats = {}
  sortedDates.forEach(date => {
    const monthKey = getMonthYear(date)
    if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { count: 0, regular: 0, arrear: 0 }
    const dayExams = examsByDate[date]
    monthlyStats[monthKey].count += dayExams.length
    dayExams.forEach(e => {
      if (e.is_arrear) monthlyStats[monthKey].arrear++
      else monthlyStats[monthKey].regular++
    })
  })

  const exportCSV = () => {
    const headers = ['Date', 'Session', 'Time', 'Course Code', 'Course Name', 'Semester', 'Year', 'Branches', 'Type']
    const rows = schedule.sort((a, b) => a.date > b.date ? 1 : -1).map(e => [
      e.date, e.session, SESSION_TIMINGS[e.session], e.course_code, e.course_name,
      e.semester, e.year, (e.branches || []).join('; '), e.is_arrear ? 'Arrear' : 'Regular',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'exam_timetable.csv'
    a.click()
  }

  if (schedule.length === 0) {
    return (
      <div>
        <div className="page-header"><h1>Timetable</h1></div>
        <div className="page-body">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16, color: '#e2e8f0' }}>📅</div>
            <h2 style={{ color: '#94a3b8', marginBottom: 8 }}>No timetable generated yet</h2>
            <p style={{ color: '#94a3b8' }}>Create a schedule from the New Schedule page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Exam Timetable</h1>
          <p style={{ fontSize: 13, marginTop: 2 }}>
            {stats.totalExams} exams · {stats.totalArrears} arrears · {sortedDates.length} exam days
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Monthly Overview */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>📊 Exams per Month</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(monthlyStats).map(([month, data]) => (
              <div key={month} style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                padding: '12px 16px', minWidth: 140,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{month}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                  <div><span style={{ color: '#1d4ed8', fontWeight: 800 }}>{data.regular}</span> <span style={{ color: '#64748b' }}>regular</span></div>
                  <div><span style={{ color: '#f59e0b', fontWeight: 800 }}>{data.arrear}</span> <span style={{ color: '#64748b' }}>arrear</span></div>
                </div>
                <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800, color: '#1d4ed8' }}>{data.count} exams</div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline View */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>📅 Daily Exam Schedule</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                ['timeline', 'Timeline'],
                ['table', 'All Exams']
              ].map(([mode, label]) => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: viewMode === mode ? '#1d4ed8' : '#f1f5f9',
                  color: viewMode === mode ? '#fff' : '#64748b',
                  fontWeight: 600, fontSize: 12,
                }}>{label}</button>
              ))}
            </div>
          </div>

          {viewMode === 'timeline' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sortedDates.map(date => {
                const dayExams = examsByDate[date]
                const isExpanded = expandedDay === date
                const totalStudents = dayExams.reduce((sum, e) => sum + (e.studentCount || 60), 0)

                // Count students per branch for this day
                const branchCounts = {}
                dayExams.forEach(e => {
                  (e.branches || []).forEach(b => {
                    branchCounts[b] = (branchCounts[b] || 0) + (e.studentCount || 60)
                  })
                })

                return (
                  <div key={date} style={{
                    border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden',
                    background: isExpanded ? '#f8fafc' : '#fff',
                  }}>
                    {/* Day Header - Clickable */}
                    <div onClick={() => setExpandedDay(isExpanded ? null : date)} style={{
                      padding: '14px 18px', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'space-between',
                      background: isExpanded ? '#eff6ff' : '#fff',
                      borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 8,
                          background: '#1d4ed8', color: '#fff',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, lineHeight: 1.2,
                        }}>
                          <div>{new Date(date).getDate()}</div>
                          <div>{MONTHS[new Date(date).getMonth()].slice(0, 3)}</div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                            {formatDate(date)}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {dayExams.length} exams · ~{totalStudents} students writing
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Session badges */}
                        {dayExams.filter(e => e.session === 'FN').length > 0 && (
                          <span className="badge badge-blue">FN: {dayExams.filter(e => e.session === 'FN').length}</span>
                        )}
                        {dayExams.filter(e => e.session === 'AN').length > 0 && (
                          <span className="badge badge-yellow">AN: {dayExams.filter(e => e.session === 'AN').length}</span>
                        )}
                        <span style={{ color: '#94a3b8', fontSize: 18 }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Expanded: Exam details */}
                    {isExpanded && (
                      <div style={{ padding: '16px 18px', background: '#f8fafc' }}>
                        {/* Branch breakdown */}
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                            Students by Department
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {Object.entries(branchCounts).sort((a, b) => b[1] - a[1]).map(([branch, count]) => (
                              <div key={branch} style={{
                                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
                                padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8,
                              }}>
                                <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 12 }}>{branch}</span>
                                <span style={{ color: '#64748b', fontSize: 12 }}>{count} students</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Exam list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {dayExams.map((e, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                              padding: '10px 14px',
                            }}>
                              <span className={`badge ${e.session === 'FN' ? 'badge-blue' : 'badge-yellow'}`}>
                                {e.session}
                              </span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8', minWidth: 80 }}>
                                {e.course_code}
                              </span>
                              <span style={{ flex: 1, color: '#334155', fontSize: 13 }}>{e.course_name}</span>
                              <span style={{ fontSize: 12, color: '#64748b' }}>{e.semester}</span>
                              <span className={`badge ${e.is_arrear ? 'badge-yellow' : 'badge-blue'}`}>
                                {e.is_arrear ? 'Arrear' : 'Regular'}
                              </span>
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>{e.studentCount || 60} students</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            // Flat table view
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Session</th>
                    <th>Course</th>
                    <th>Course Name</th>
                    <th>Sem</th>
                    <th>Depts</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.sort((a, b) => a.date > b.date ? 1 : -1).map((e, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatDate(e.date)}</td>
                      <td><span className={`badge ${e.session === 'FN' ? 'badge-blue' : 'badge-yellow'}`}>{e.session}</span></td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8' }}>{e.course_code}</td>
                      <td>{e.course_name}</td>
                      <td style={{ textAlign: 'center' }}>Sem {e.semester}</td>
                      <td style={{ fontSize: 12 }}>{(e.branches || []).join(', ')}</td>
                      <td><span className={`badge ${e.is_arrear ? 'badge-yellow' : 'badge-blue'}`}>{e.is_arrear ? 'Arrear' : 'Regular'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="card" style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
            <h3 style={{ color: '#dc2626' }}>⚠️ Unresolved Conflicts ({conflicts.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              {conflicts.slice(0, 5).map((c, i) => (
                <div key={i} style={{ padding: '8px 12px', background: '#fff', borderRadius: 6, fontSize: 13 }}>
                  <strong>{c.reg_no}</strong>: {c.course1} vs {c.course2} on {c.date} {c.session}
                </div>
              ))}
              {conflicts.length > 5 && <div style={{ color: '#64748b', fontSize: 12 }}>...and {conflicts.length - 5} more</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}