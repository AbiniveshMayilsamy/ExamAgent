import { useState } from 'react'
import PrintScheduleModal from './PrintScheduleModal'

const SESSION_TIMINGS = { FN: '9:30 AM – 12:30 PM', AN: '1:30 PM – 4:30 PM' }

export default function ScheduleTable({ schedule, conflicts, deptRollRanges = {} }) {
  const [filter, setFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [view, setView] = useState('table') // 'table' | 'dept'
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  const allBranches = [...new Set(schedule.flatMap(e => e.branches || []))].sort()

  const filtered = schedule.filter(e => {
    const typeOk = filter === 'all' || (filter === 'regular' ? !e.is_arrear : e.is_arrear)
    const deptOk = deptFilter === 'all' || (e.branches || []).includes(deptFilter)
    return typeOk && deptOk
  })

  const sorted = [...filtered].sort((a, b) => a.date > b.date ? 1 : a.date < b.date ? -1 : 0)

  const thStyle = {
    padding: '10px 12px', textAlign: 'left', color: '#64748b',
    fontSize: 11, fontWeight: 700, letterSpacing: 1,
    borderBottom: '1px solid #1e293b', textTransform: 'uppercase', whiteSpace: 'nowrap',
  }
  const tdStyle = { padding: '9px 12px', fontSize: 12, color: '#cbd5e1', borderBottom: '1px solid #1e293b' }

  // Dept-wise grouped view
  const deptView = () => {
    const byBranch = {}
    for (const e of sorted) {
      for (const b of (e.branches || [])) {
        if (!byBranch[b]) byBranch[b] = []
        byBranch[b].push(e)
      }
    }
    return Object.entries(byBranch).sort(([a], [b]) => a.localeCompare(b)).map(([branch, exams]) => {
      const semRanges = deptRollRanges[branch] || {}
      return (
        <div key={branch} style={{ marginBottom: 24 }}>
          <div style={{
            background: '#1e293b', borderRadius: '8px 8px 0 0',
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ color: '#60a5fa', fontWeight: 800, fontSize: 14 }}>{branch}</span>
            <span style={{ color: '#475569', fontSize: 11 }}>
              {Object.entries(semRanges).map(([sem, rr]) => `Sem ${sem}: ${rr}`).join(' · ')}
            </span>
            <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 11 }}>{exams.length} exams</span>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid #1e293b', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#0f172a' }}>
              <thead>
                <tr>
                  {['Date', 'Session', 'Time', 'Course', 'Sem', 'Credits', 'Type'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exams.map((e, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#0f172a' : '#111827' }}>
                    <td style={tdStyle}>{e.date}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: e.session === 'FN' ? '#1e3a5f' : '#2d1b4e',
                        color: e.session === 'FN' ? '#7dd3fc' : '#c4b5fd',
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                      }}>{e.session}</span>
                    </td>
                    <td style={{ ...tdStyle, color: '#94a3b8', fontSize: 11 }}>
                      {SESSION_TIMINGS[e.session]}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'monospace', color: '#7dd3fc' }}>{e.course_code}</span>
                      <span style={{ color: '#64748b', marginLeft: 6 }}>{e.course_name}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{e.semester}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: e.credits >= 4 ? '#f87171' : '#94a3b8' }}>
                      {e.credits || 3}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        background: e.is_arrear ? '#2d1b4e' : '#0f2a1a',
                        color: e.is_arrear ? '#c4b5fd' : '#4ade80',
                        padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      }}>{e.is_arrear ? 'Arrear' : 'Regular'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    })
  }

  return (
    <div>
      <PrintScheduleModal
        schedule={schedule}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'Regular Exams', value: schedule.filter(e => !e.is_arrear).length, color: '#2563eb' },
          { label: 'Arrear Exams', value: schedule.filter(e => e.is_arrear).length, color: '#7c3aed' },
          { label: 'Conflicts', value: conflicts.length, color: conflicts.length ? '#dc2626' : '#16a34a' },
          { label: 'Branches', value: allBranches.length, color: '#0891b2' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#1e293b', borderRadius: 8, padding: '8px 16px',
            borderLeft: `3px solid ${s.color}`,
          }}>
            <div style={{ color: s.color, fontSize: 20, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: '#64748b', fontSize: 11 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* View toggle */}
        {['table', 'dept'].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            background: view === v ? '#0891b2' : '#1e293b',
            color: view === v ? '#fff' : '#64748b',
            border: 'none', borderRadius: 6, padding: '5px 14px',
            fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>
            {v === 'table' ? '📋 Table' : '🏫 Dept-wise'}
          </button>
        ))}

        <div style={{ width: 1, height: 24, background: '#334155' }} />

        {/* Type filter */}
        {['all', 'regular', 'arrear'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? '#2563eb' : '#1e293b',
            color: filter === f ? '#fff' : '#64748b',
            border: 'none', borderRadius: 6, padding: '5px 14px',
            fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}

        {/* Dept filter */}
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{
          background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
          color: '#f1f5f9', padding: '5px 10px', fontSize: 12, cursor: 'pointer',
        }}>
          <option value="all">All Branches</option>
          {allBranches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <button
          onClick={() => setIsPrintModalOpen(true)}
          style={{
            marginLeft: 'auto',
            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>🖨️</span> Print Schedule
        </button>
      </div>

      {/* Content */}
      {view === 'dept' ? (
        <div>{deptView()}</div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #1e293b' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#0f172a' }}>
            <thead>
              <tr>
                {['Date', 'Session', 'Time', 'Course Code', 'Course Name', 'Sem', 'Yr', 'Branches', 'Roll Ranges', 'Credits', 'Type'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0
                ? <tr><td colSpan={11} style={{ ...tdStyle, textAlign: 'center', color: '#475569' }}>No exams</td></tr>
                : sorted.map((e, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#0f172a' : '#111827' }}>
                    <td style={tdStyle}>{e.date}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: e.session === 'FN' ? '#1e3a5f' : '#2d1b4e',
                        color: e.session === 'FN' ? '#7dd3fc' : '#c4b5fd',
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                      }}>{e.session}</span>
                    </td>
                    <td style={{ ...tdStyle, color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {SESSION_TIMINGS[e.session]}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#7dd3fc' }}>{e.course_code}</td>
                    <td style={tdStyle}>{e.course_name}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{e.semester}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8' }}>{e.year || '—'}</td>
                    <td style={tdStyle}>{(e.branches || []).join(', ')}</td>
                    <td style={{ ...tdStyle, fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
                      {e.roll_ranges && Object.entries(e.roll_ranges).map(([b, rr]) => (
                        <div key={b}><span style={{ color: '#60a5fa' }}>{b}:</span> {rr}</div>
                      ))}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: (e.credits || 3) >= 4 ? '#f87171' : '#94a3b8' }}>
                      {e.credits || 3}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        background: e.is_arrear ? '#2d1b4e' : '#0f2a1a',
                        color: e.is_arrear ? '#c4b5fd' : '#4ade80',
                        padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      }}>{e.is_arrear ? 'Arrear' : 'Regular'}</span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: '#f87171', fontWeight: 700, marginBottom: 8 }}>⚠️ Unresolved Conflicts</div>
          {conflicts.map((c, i) => (
            <div key={i} style={{
              background: '#2a0f0f', border: '1px solid #dc2626',
              borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#fca5a5', marginBottom: 6,
            }}>
              {c.reg_no}: <strong>{c.course_a}</strong> vs <strong>{c.course_b}</strong> — {c.date} {c.session}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
