import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePipelineContext } from '../context/PipelineContext'
import PrintScheduleModal from '../components/PrintScheduleModal'
import * as XLSX from 'xlsx'

const SESSION_TIMINGS = { FN: '9:30 AM – 12:30 PM', AN: '1:30 PM – 4:30 PM' }

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const ALL_DEPTS = ['CSE', 'ECE', 'EEE', 'MECH', 'IT', 'AIDS', 'AIML', 'CCE', 'CYSE', 'CSBS']

const DEPT_COLORS = {
  CSE:  { border: '#93c5fd', bg: '#dbeafe', text: '#1e3a8a', badge: '#1e40af', hexBg: '#dbeafe', hexBadge: '#1e40af' },
  ECE:  { border: '#6ee7b7', bg: '#d1fae5', text: '#065f46', badge: '#047857', hexBg: '#d1fae5', hexBadge: '#047857' },
  EEE:  { border: '#fdba74', bg: '#ffedd5', text: '#9a3412', badge: '#c2410c', hexBg: '#ffedd5', hexBadge: '#c2410c' },
  MECH: { border: '#d8b4fe', bg: '#f3e8ff', text: '#581c87', badge: '#6b21a8', hexBg: '#f3e8ff', hexBadge: '#6b21a8' },
  IT:   { border: '#7dd3fc', bg: '#e0e7fe', text: '#0369a1', badge: '#0284c7', hexBg: '#e0e7fe', hexBadge: '#0284c7' },
  AIDS: { border: '#5eead4', bg: '#ccfbf1', text: '#115e59', badge: '#0f766e', hexBg: '#ccfbf1', hexBadge: '#0f766e' },
  AIML: { border: '#a5b4fc', bg: '#e0e7ff', text: '#3730a3', badge: '#4338ca', hexBg: '#e0e7ff', hexBadge: '#4338ca' },
  CCE:  { border: '#fca5a5', bg: '#fee2e2', text: '#991b1b', badge: '#b91c1c', hexBg: '#fee2e2', hexBadge: '#b91c1c' },
  CYSE: { border: '#bef264', bg: '#ecfccb', text: '#3f6212', badge: '#4d7c0f', hexBg: '#ecfccb', hexBadge: '#4d7c0f' },
  CSBS: { border: '#fbcfe8', bg: '#fce7f3', text: '#9d174d', badge: '#be185d', hexBg: '#fce7f3', hexBadge: '#be185d' },
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const dayName = DAY_NAMES[d.getDay()]
  const day = d.getDate()
  const month = d.getMonth() + 1
  return `${dayName} - ${day}/${month}/${d.getFullYear()}`
}

function formatDateDot(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`
  return dateStr
}

function getMonthYear(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'Scheduled Period'
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default function TimetablePage() {
  const pipeline = usePipelineContext() || {}
  const { schedule = [], conflicts = [], deptRollRanges = {}, stats = {}, students = [] } = pipeline
  
  const [expandedDay, setExpandedDay] = useState(null)
  const [viewMode, setViewMode] = useState('matrix') // 'matrix', 'timeline', 'table'
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [deptFilter, setDeptFilter] = useState('ALL')

  const safeSchedule = useMemo(() => (Array.isArray(schedule) ? schedule : []), [schedule])

  // Group exams by date
  const examsByDate = useMemo(() => {
    const map = {}
    safeSchedule.forEach(e => {
      if (e && e.date) {
        if (!map[e.date]) map[e.date] = []
        map[e.date].push(e)
      }
    })
    return map
  }, [safeSchedule])

  const sortedDates = useMemo(() => Object.keys(examsByDate).sort(), [examsByDate])

  // Build Consolidated Master Matrix Grid (Date x Session x Dept)
  const matrixGrid = useMemo(() => {
    const rows = []
    sortedDates.forEach(dateStr => {
      const d = new Date(dateStr)
      const dayShort = !isNaN(d.getTime()) ? DAY_NAMES[d.getDay()].slice(0, 3) : ''
      const dateFormatted = formatDateDot(dateStr)

      ;['FN', 'AN'].forEach(sess => {
        const rowExams = (examsByDate[dateStr] || []).filter(e => e.session === sess)
        if (rowExams.length === 0) return

        const deptMap = {}
        ALL_DEPTS.forEach(dept => {
          const matched = rowExams.filter(e => (e.branches || []).includes(dept))
          deptMap[dept] = matched
        })

        rows.push({
          date: dateStr,
          dateFormatted,
          dayShort,
          session: sess,
          deptMap,
          totalExamsToday: rowExams.length
        })
      })
    })
    return rows
  }, [sortedDates, examsByDate])

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const map = {}
    sortedDates.forEach(date => {
      const monthKey = getMonthYear(date)
      if (!map[monthKey]) map[monthKey] = { count: 0, regular: 0, arrear: 0 }
      const dayExams = examsByDate[date] || []
      map[monthKey].count += dayExams.length
      dayExams.forEach(e => {
        if (e.is_arrear) map[monthKey].arrear++
        else map[monthKey].regular++
      })
    })
    return map
  }, [sortedDates, examsByDate])

  // Color-coded Master Excel Export (.xls HTML Spreadsheet Blob compatible with Excel, Google Sheets, LibreOffice)
  const exportConsolidatedExcel = () => {
    const activeDepts = deptFilter === 'ALL' ? ALL_DEPTS : [deptFilter]

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Master Schedule</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; }
          .title-main { font-size: 16px; font-weight: bold; text-align: center; background-color: #0f172a; color: #ffffff; padding: 12px; }
          .title-sub { font-size: 13px; font-weight: bold; text-align: center; background-color: #1e293b; color: #cbd5e1; padding: 6px; }
          th { font-size: 12px; font-weight: bold; text-align: center; vertical-align: middle; padding: 8px; border: 1px solid #334155; }
          td { font-size: 11px; text-align: center; vertical-align: top; padding: 6px; border: 1px solid #cbd5e1; }
          .col-date { font-weight: bold; background-color: #f8fafc; color: #0f172a; }
          .col-day { font-weight: bold; background-color: #f1f5f9; color: #475569; }
          .ses-fn { background-color: #dbeafe; color: #1e40af; font-weight: bold; }
          .ses-an { background-color: #fef3c7; color: #b45309; font-weight: bold; }
          .cell-arrear { background-color: #fef3c7; color: #78350f; font-weight: bold; border: 1.5px solid #f59e0b; }
          .cell-shared { background-color: #e0f2fe; color: #0369a1; font-weight: bold; border: 1.5px solid #38bdf8; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="${activeDepts.length + 3}" class="title-main">SRI ESHWAR COLLEGE OF ENGINEERING (AUTONOMOUS)</td></tr>
          <tr><td colspan="${activeDepts.length + 3}" class="title-sub">AUTONOMOUS SEMESTER END EXAMINATION MASTER SCHEDULE — APRIL / MAY 2026</td></tr>
          <tr><td colspan="${activeDepts.length + 3}" style="background-color:#ffffff; height:10px;"></td></tr>
          <tr style="background-color:#0f172a; color:#ffffff;">
            <th style="background-color:#0f172a; color:#ffffff;">Date</th>
            <th style="background-color:#0f172a; color:#ffffff;">Day</th>
            <th style="background-color:#0f172a; color:#ffffff;">Ses</th>
    `

    activeDepts.forEach(d => {
      const c = DEPT_COLORS[d]
      tableHtml += `<th style="background-color:${c.hexBadge}; color:#ffffff; font-weight:bold; font-size:13px; min-width:130px;">${d}</th>`
    })

    tableHtml += `</tr>`

    matrixGrid.forEach(row => {
      tableHtml += `<tr>`
      tableHtml += `<td class="col-date">${row.dateFormatted}</td>`
      tableHtml += `<td class="col-day">${row.dayShort}</td>`
      tableHtml += `<td class="${row.session === 'FN' ? 'ses-fn' : 'ses-an'}">${row.session}</td>`

      activeDepts.forEach(dept => {
        const exams = row.deptMap[dept] || []
        const c = DEPT_COLORS[dept]

        if (exams.length === 0) {
          tableHtml += `<td style="color:#cbd5e1;">—</td>`
        } else {
          let cellHtml = `<td style="background-color:${c.hexBg}; color:${c.text}; font-weight:600; text-align:left;">`
          exams.forEach((e, idx) => {
            const isArrear = e.is_arrear
            const isShared = e.is_shared
            const bg = isArrear ? '#fef3c7' : isShared ? '#e0f2fe' : c.hexBg
            const border = isArrear ? '#f59e0b' : isShared ? '#38bdf8' : c.border
            const txt = isArrear ? '#78350f' : isShared ? '#0369a1' : c.text

            cellHtml += `
              <div style="background-color:${bg}; border:1px solid ${border}; color:${txt}; padding:4px 6px; margin-bottom:4px; border-radius:4px;">
                <div style="font-family:monospace; font-weight:bold; font-size:11px;">
                  ${e.course_code} ${isArrear ? '<span style="color:#b45309;">[ARREAR]</span>' : `<span style="color:${c.hexBadge};">[SEM ${e.semester}]</span>`}
                </div>
                <div style="font-size:10px; color:#334155;">${e.course_name}</div>
                ${isShared ? `<div style="font-size:9px; color:#0284c7; font-weight:bold;">🩵 Shared (${e.branches?.length} Depts)</div>` : ''}
              </div>
            `
          })
          cellHtml += `</td>`
          tableHtml += cellHtml
        }
      })

      tableHtml += `</tr>`
    })

    tableHtml += `</table></body></html>`

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'Color_Coded_Consolidated_Master_Schedule.xls'
    a.click()
  }

  const exportCSV = () => {
    const headers = ['Date', 'Session', 'Time', 'Course Code', 'Course Name', 'Semester', 'Year', 'Branches', 'Type']
    const rows = [...safeSchedule].sort((a, b) => a.date > b.date ? 1 : -1).map(e => [
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

  if (safeSchedule.length === 0) {
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

  const activeDepts = deptFilter === 'ALL' ? ALL_DEPTS : [deptFilter]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Master Exam Timetable & Visualizer</h1>
          <p style={{ fontSize: 13, marginTop: 2 }}>
            {stats.totalExams || safeSchedule.filter(e => !e.is_arrear).length} regular courses · {stats.totalArrears || safeSchedule.filter(e => e.is_arrear).length} arrear courses · {sortedDates.length} exam days
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={exportConsolidatedExcel} style={{ background: '#047857', color: '#fff', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🎨</span> Export Color-Coded Master Excel (.xls)
          </button>
          <button className="btn btn-secondary" onClick={exportCSV}>
            📥 CSV Export
          </button>
          <button className="btn btn-secondary" onClick={() => setIsPrintModalOpen(true)}>
            🖨️ Print Schedule
          </button>
          <Link to="/students" className="btn btn-primary">
            🎟️ Student Hall Tickets
          </Link>
        </div>
      </div>

      <PrintScheduleModal
        schedule={safeSchedule}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Monthly Overview */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>📊 Exams per Month & Distribution</h3>
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

        {/* View Mode & Filter Header */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Schedule Visualizer</h3>
              
              {/* Department Filter */}
              <select
                className="form-select"
                style={{ fontSize: 12, padding: '6px 12px', width: 'auto' }}
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
              >
                <option value="ALL">All Departments (10 Branches)</option>
                {ALL_DEPTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle Buttons */}
            <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
              {[
                ['matrix', '📊 Master Matrix View'],
                ['timeline', '📅 Daily Timeline'],
                ['table', '📋 All Exams List']
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: viewMode === mode ? '#2563eb' : 'transparent',
                    color: viewMode === mode ? '#ffffff' : '#64748b',
                    fontWeight: 700, fontSize: 12,
                    boxShadow: viewMode === mode ? '0 2px 6px rgba(37,99,235,0.3)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Department Legend Bar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', alignSelf: 'center' }}>DEPT COLOR MAP:</span>
            {ALL_DEPTS.map(d => {
              const c = DEPT_COLORS[d]
              return (
                <span
                  key={d}
                  style={{
                    background: c.bg,
                    color: c.text,
                    border: `1px solid ${c.border}`,
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 700
                  }}
                >
                  {d}
                </span>
              )
            })}
            <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
              ⚡ Arrear Exam
            </span>
            <span style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
              🩵 Shared Multi-Branch
            </span>
          </div>
        </div>

        {/* MODE 1: Consolidated Master Matrix Grid View (Matching 1. Consolidated ESE Excel Layout) */}
        {viewMode === 'matrix' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#ffffff', textAlign: 'center' }}>
                    <th style={{ padding: '10px 12px', border: '1px solid #334155', minWidth: 100 }}>Date</th>
                    <th style={{ padding: '10px 8px', border: '1px solid #334155', minWidth: 50 }}>Day</th>
                    <th style={{ padding: '10px 8px', border: '1px solid #334155', minWidth: 55 }}>Ses</th>
                    {activeDepts.map(dept => {
                      const c = DEPT_COLORS[dept]
                      return (
                        <th
                          key={dept}
                          style={{
                            padding: '10px 14px',
                            border: '1px solid #334155',
                            minWidth: 140,
                            background: c.badge,
                            color: '#ffffff',
                            fontWeight: 800
                          }}
                        >
                          {dept}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {matrixGrid.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      style={{
                        background: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        borderBottom: '1px solid #e2e8f0'
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 800, textAlign: 'center', color: '#1e293b', borderRight: '1px solid #e2e8f0' }}>
                        {row.dateFormatted}
                      </td>
                      <td style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'center', color: '#64748b', borderRight: '1px solid #e2e8f0' }}>
                        {row.dayShort}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: '1.5px solid #cbd5e1' }}>
                        <span style={{
                          background: row.session === 'FN' ? '#dbeafe' : '#fef3c7',
                          color: row.session === 'FN' ? '#1e40af' : '#b45309',
                          fontWeight: 800, padding: '3px 8px', borderRadius: 4, fontSize: 11
                        }}>
                          {row.session}
                        </span>
                      </td>

                      {activeDepts.map(dept => {
                        const exams = row.deptMap[dept] || []
                        const c = DEPT_COLORS[dept]

                        return (
                          <td
                            key={dept}
                            style={{
                              padding: '8px',
                              border: '1px solid #e2e8f0',
                              verticalAlign: 'top',
                              background: exams.length > 0 ? '#ffffff' : 'transparent'
                            }}
                          >
                            {exams.length === 0 ? (
                              <div style={{ color: '#cbd5e1', textAlign: 'center', fontSize: 11 }}>—</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {exams.map((e, eIdx) => {
                                  const isArrear = e.is_arrear
                                  const isShared = e.is_shared

                                  return (
                                    <div
                                      key={eIdx}
                                      style={{
                                        background: isArrear ? '#fef3c7' : isShared ? '#e0f2fe' : c.bg,
                                        border: `1.5px solid ${isArrear ? '#f59e0b' : isShared ? '#38bdf8' : c.border}`,
                                        color: isArrear ? '#78350f' : isShared ? '#0369a1' : c.text,
                                        borderRadius: 6,
                                        padding: '6px 8px',
                                        fontSize: 11,
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12 }}>
                                          {e.course_code}
                                        </span>
                                        <span style={{
                                          fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 3,
                                          background: isArrear ? '#b45309' : c.badge, color: '#ffffff'
                                        }}>
                                          {isArrear ? 'ARREAR' : `SEM ${e.semester}`}
                                        </span>
                                      </div>

                                      <div style={{ fontSize: 10, color: '#475569', marginTop: 3, fontWeight: 500, lineHeight: 1.2 }}>
                                        {e.course_name}
                                      </div>

                                      {isShared && (
                                        <div style={{ fontSize: 9, fontWeight: 700, color: '#0284c7', marginTop: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                                          <span>🩵 Shared ({e.branches?.length} Depts)</span>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODE 2: Timeline View */}
        {viewMode === 'timeline' && (
          <div className="card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sortedDates.map(date => {
                const dayExams = examsByDate[date] || []
                const isExpanded = expandedDay === date
                const totalStudents = dayExams.reduce((sum, e) => sum + (e.studentCount || 60), 0)

                return (
                  <div key={date} style={{
                    border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden',
                    background: isExpanded ? '#f8fafc' : '#fff',
                  }}>
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
                          <div>{!isNaN(new Date(date).getTime()) ? new Date(date).getDate() : '—'}</div>
                          <div>{!isNaN(new Date(date).getTime()) ? MONTHS[new Date(date).getMonth()].slice(0, 3) : ''}</div>
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
                        {dayExams.filter(e => e.session === 'FN').length > 0 && (
                          <span className="badge badge-blue">FN: {dayExams.filter(e => e.session === 'FN').length}</span>
                        )}
                        {dayExams.filter(e => e.session === 'AN').length > 0 && (
                          <span className="badge badge-yellow">AN: {dayExams.filter(e => e.session === 'AN').length}</span>
                        )}
                        <span style={{ color: '#94a3b8', fontSize: 18 }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '16px 18px', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {dayExams.map((e, idx) => (
                            <div key={idx} style={{
                              padding: '12px 14px', borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>
                                  {e.course_code} — {e.course_name}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                  Branches: {(e.branches || []).join(', ')} · Sem {e.semester}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span className={`badge ${e.session === 'FN' ? 'badge-blue' : 'badge-yellow'}`}>
                                  {e.session} ({SESSION_TIMINGS[e.session]})
                                </span>
                                {e.is_arrear && <span className="badge badge-red">Arrear</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* MODE 3: All Exams List Table View */}
        {viewMode === 'table' && (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Session</th>
                  <th>Course Code</th>
                  <th>Course Title</th>
                  <th>Semester</th>
                  <th>Departments</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {[...safeSchedule].sort((a, b) => a.date > b.date ? 1 : -1).map((e, idx) => (
                  <tr key={idx}>
                    <td>{formatDateDot(e.date)}</td>
                    <td><span className={`badge ${e.session === 'FN' ? 'badge-blue' : 'badge-yellow'}`}>{e.session}</span></td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{e.course_code}</td>
                    <td>{e.course_name}</td>
                    <td>Sem {e.semester}</td>
                    <td>{(e.branches || []).join(', ')}</td>
                    <td><span className={`badge ${e.is_arrear ? 'badge-red' : 'badge-green'}`}>{e.is_arrear ? 'ARREAR' : 'REGULAR'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}