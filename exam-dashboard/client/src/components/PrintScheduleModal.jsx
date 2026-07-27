import { useState } from 'react'
import logoEshwar from '../assets/logo_eshwar.png'

const DEPT_NAMES = {
  CSE: 'B.E. – Computer Science and Engineering',
  ECE: 'B.E. – Electronics and Communication Engineering',
  EEE: 'B.E. – Electrical and Electronics Engineering',
  MECH: 'B.E. – Mechanical Engineering',
  IT: 'B.Tech. – Information Technology',
  AIML: 'B.E. – Computer Science and Engineering (AI-ML)',
  AIDS: 'B.Tech. – Artificial Intelligence and Data Science',
  CYSE: 'B.E. – Computer Science and Engineering (Cyber Security)',
  CCE: 'B.E. – Computer and Communication Engineering',
  CSBS: 'B.Tech. – Computer Science and Business Systems',
  VLSI: 'B.E. – Electronics Engineering (VLSI Design & Technology)',
}

const ROMAN_NUMS = {
  1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII'
}

function formatDateDot(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`
  }
  return dateStr
}

export default function PrintScheduleModal({ schedule, isOpen, onClose }) {
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [regulation, setRegulation] = useState('Regulations – 2023')
  const [examSession, setExamSession] = useState('B.E. / B.Tech. – Degree Examinations – April / May – 2026')
  const [statusTag, setStatusTag] = useState('REVISED')
  const [issueDate, setIssueDate] = useState('9th April 2026')

  if (!isOpen) return null

  // Extract all departments from schedule
  const availableDepts = [...new Set(schedule.flatMap(e => e.branches || ['CSE']))].sort()

  const deptsToRender = selectedDept === 'ALL' ? availableDepts : [selectedDept]

  const handlePrint = () => {
    window.print()
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Control Top Bar - Hidden during printing */}
      <div className="no-print" style={{
        background: '#0f172a', color: '#fff', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #334155', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#60a5fa' }}>
            <span>🖨️</span> Official Schedule Print Preview
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#94a3b8' }}>Department:</label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              style={{ background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: 4, padding: '4px 10px', fontSize: 13 }}
            >
              <option value="ALL">All Departments (Multi-page Schedule)</option>
              {availableDepts.map(d => (
                <option key={d} value={d}>{d} - {DEPT_NAMES[d] || d}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#94a3b8' }}>Status:</label>
            <select
              value={statusTag}
              onChange={e => setStatusTag(e.target.value)}
              style={{ background: '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: 4, padding: '4px 10px', fontSize: 13 }}
            >
              <option value="REVISED">REVISED</option>
              <option value="OFFICIAL">OFFICIAL</option>
              <option value="FINAL">FINAL</option>
              <option value="DRAFT">DRAFT</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handlePrint}
            style={{
              background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6,
              padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(37,99,235,0.4)'
            }}
          >
            <span>🖨️</span> Print / Save as PDF
          </button>
          <button
            onClick={onClose}
            style={{
              background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: 6,
              padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer'
            }}
          >
            ✖ Close
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '30px 20px', background: '#334155' }}>
        <div className="print-schedule-container" style={{ margin: '0 auto', maxWidth: '900px' }}>
          
          {deptsToRender.map((deptCode, pageIdx) => {
            // Filter schedule for this department
            const deptExams = schedule.filter(e => (e.branches || []).includes(deptCode))
              .sort((a, b) => (a.semester - b.semester) || (a.date > b.date ? 1 : -1))

            const fullDeptTitle = DEPT_NAMES[deptCode] || `B.E. / B.Tech. – ${deptCode}`

            return (
              <div
                key={deptCode}
                className="official-schedule-page"
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  fontFamily: '"Calibri", "Segoe UI", "Arial", sans-serif',
                  padding: '36px 48px',
                  marginBottom: '40px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  borderRadius: '2px',
                  position: 'relative',
                  pageBreakAfter: 'always',
                  breakAfter: 'page'
                }}
              >
                {/* Top Corner Identifier */}
                <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#000', marginBottom: '8px' }}>
                  Schedule – I
                </div>

                {/* College Official Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 100px', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                  {/* Left Official Logo */}
                  <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={logoEshwar}
                      alt="Sri Eshwar College of Engineering Logo"
                      style={{ maxHeight: '85px', maxWidth: '110px', objectFit: 'contain' }}
                    />
                  </div>

                  {/* Center Address Text */}
                  <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '23px', fontWeight: '900', color: '#000', margin: '0 0 2px 0', letterSpacing: '0.2px', fontFamily: 'Times New Roman, serif' }}>
                      Sri Eshwar College of Engineering
                    </h1>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#111', marginBottom: '2px' }}>
                      (An Autonomous Institution)
                    </div>
                    <div style={{ fontSize: '11px', color: '#222', lineHeight: '1.3' }}>
                      Approved by AICTE, New Delhi and Affiliated to Anna University, Chennai<br />
                      Kondampatti (Post), Kinathukadavu (Tk), Coimbatore – 641 202
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#000', marginTop: '6px', fontFamily: 'Times New Roman, serif' }}>
                      Office of the Controller of Examinations
                    </div>
                  </div>

                  {/* Right Badges */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ border: '1.5px solid #000', padding: '2px 4px', borderRadius: '3px', textAlign: 'center', width: '90px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '900', color: '#000' }}>NAAC</div>
                      <div style={{ fontSize: '7px', fontWeight: 'bold' }}>Accredited with 'A' Grade</div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <div style={{ border: '1px solid #000', padding: '1px 3px', fontSize: '9px', fontWeight: 'bold' }}>NBA</div>
                      <div style={{ border: '1px solid #000', padding: '1px 3px', fontSize: '9px', fontWeight: 'bold' }}>nirf</div>
                    </div>
                  </div>
                </div>

                {/* Banner Box */}
                <div style={{
                  border: '2px solid #000',
                  borderRadius: '16px',
                  padding: '8px 16px',
                  textAlign: 'center',
                  marginBottom: '16px',
                  background: '#ffffff'
                }}>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#000', textTransform: 'none' }}>
                    Autonomous Semester End Examinations Schedule
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000', marginTop: '2px' }}>
                    {examSession}
                  </div>
                </div>

                {/* Department Header & Status Tag */}
                <div style={{ position: 'relative', textAlign: 'center', marginBottom: '14px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000' }}>
                    {regulation}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#000', marginTop: '2px' }}>
                    {fullDeptTitle}
                  </div>
                  {statusTag && (
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: '0px',
                      border: '2px solid #000',
                      borderRadius: '12px',
                      padding: '4px 14px',
                      fontSize: '12px',
                      fontWeight: '900',
                      letterSpacing: '1px'
                    }}>
                      {statusTag}
                    </div>
                  )}
                </div>

                {/* Schedule Table */}
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  marginBottom: '20px',
                  border: '1.5px solid #000'
                }}>
                  <thead>
                    <tr style={{ background: '#d1d5db', color: '#000' }}>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', width: '50px', fontWeight: 'bold' }}>Sl. No.</th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', width: '70px', fontWeight: 'bold' }}>Semester</th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', width: '95px', fontWeight: 'bold' }}>Course Code</th>
                      <th style={{ border: '1px solid #000', padding: '6px 12px', textAlign: 'left', fontWeight: 'bold' }}>Course Title</th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', width: '90px', fontWeight: 'bold' }}>Exam Date</th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', width: '65px', fontWeight: 'bold' }}>Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptExams.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ border: '1px solid #000', padding: '16px', textAlign: 'center', color: '#666' }}>
                          No scheduled examinations found for this department.
                        </td>
                      </tr>
                    ) : (
                      deptExams.map((exam, idx) => (
                        <tr key={idx} style={{ background: '#fff' }}>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center', color: '#000' }}>
                            {idx + 1}.
                          </td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center', color: '#000', fontWeight: '500' }}>
                            {ROMAN_NUMS[exam.semester] || exam.semester}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '12px' }}>
                            {exam.course_code}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '5px 12px', color: '#000', fontWeight: '500' }}>
                            {exam.course_name}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center', color: '#000', fontWeight: '500' }}>
                            {formatDateDot(exam.date)}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center', fontWeight: 'bold', color: '#000' }}>
                            {exam.session}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Controller Signature & Stamp Area */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', marginBottom: '16px' }}>
                  <div style={{ textAlign: 'center', position: 'relative', paddingRight: '20px' }}>
                    {/* Simulated Signature */}
                    <div style={{
                      fontFamily: '"Brush Script MT", "Caveat", cursive',
                      fontSize: '22px',
                      color: '#047857',
                      fontWeight: 'bold',
                      transform: 'rotate(-4deg)',
                      marginBottom: '-4px'
                    }}>
                      R. An 9/4/26
                    </div>
                    {/* Official Stamp Box */}
                    <div style={{
                      color: '#6d28d9',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      lineHeight: '1.2',
                      textAlign: 'center'
                    }}>
                      <div>Controller of Examinations</div>
                      <div>Sri Eshwar College of Engineering (Autonomous)</div>
                      <div>Kinathukadavu, Coimbatore – 641 202</div>
                    </div>
                  </div>
                </div>

                {/* Footer Section */}
                <div style={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'flex-end',
                  borderTop: '1px solid #000',
                  paddingTop: '8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#000'
                }}>
                  <div>{issueDate}</div>
                  <div style={{ textAlign: 'center', lineHeight: '1.3' }}>
                    <div>FN: 9.30 am – 12.30 pm &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; AN: 1.30 pm – 4.30 pm</div>
                    <div style={{ fontSize: '9px', fontWeight: 'normal', color: '#333' }}>
                      SECE/CoE/TH EXAMS/005/Rev. 0.0/08.04.2023
                    </div>
                  </div>
                  <div>Page {pageIdx + 1} of {deptsToRender.length}</div>
                </div>
              </div>
            )
          })}

        </div>
      </div>

      {/* Global CSS for Print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-schedule-container, .print-schedule-container * {
            visibility: visible !important;
          }
          .print-schedule-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .official-schedule-page {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 20mm 15mm !important;
            width: 100% !important;
            max-width: 100% !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  )
}
