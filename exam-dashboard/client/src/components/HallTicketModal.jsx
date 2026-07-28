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

export default function HallTicketModal({ student, students = [], getStudentExams, isOpen, onClose, branchTitle }) {
  if (!isOpen) return null

  // Determine list of students to render (bulk mode or single student mode)
  const studentList = students.length > 0 ? students : (student ? [student] : [])

  if (studentList.length === 0) return null

  const isBulk = studentList.length > 1

  const handlePrint = () => {
    window.print()
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Top Control Bar - Hidden during printing */}
      <div className="no-print" style={{
        background: '#0f172a', color: '#fff', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #334155', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#60a5fa' }}>
            <span>🎟️</span> {isBulk ? `Bulk Branch Hall Tickets Export (${studentList.length} Students)` : 'Student Hall Ticket Preview'}
          </div>
          <div style={{ fontSize: 13, color: '#cbd5e1' }}>
            {isBulk ? (branchTitle || 'Department Bulk Print') : `${studentList[0]?.name} (${studentList[0]?.reg_no})`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handlePrint}
            style={{
              background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6,
              padding: '8px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(37,99,235,0.4)'
            }}
          >
            <span>🖨️</span> {isBulk ? `Print All ${studentList.length} Hall Tickets (Single PDF)` : 'Print / Save Hall Ticket PDF'}
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

      {/* Main Printable Scrollable Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '30px 20px', background: '#334155' }}>
        <div className="print-hallticket-container" style={{ margin: '0 auto', maxWidth: '850px' }}>
          
          {studentList.map((std, pageIdx) => {
            const studentExams = getStudentExams ? getStudentExams(std) : (std.exams || [])
            const fullDept = DEPT_NAMES[std.branch] || `B.E. / B.Tech. – ${std.branch || 'Engineering'}`

            return (
              <div
                key={std.reg_no || pageIdx}
                className="hallticket-paper"
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  fontFamily: '"Calibri", "Segoe UI", "Arial", sans-serif',
                  padding: '36px 44px',
                  borderRadius: '2px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  position: 'relative',
                  marginBottom: isBulk ? '40px' : '0px',
                  pageBreakAfter: 'always',
                  breakAfter: 'page'
                }}
              >
                {/* Corner Identifier */}
                <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
                  OFFICIAL EXAM CELL COPY · PAGE {pageIdx + 1} OF {studentList.length}
                </div>

                {/* College Official Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 90px', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <img
                      src={logoEshwar}
                      alt="Sri Eshwar Logo"
                      style={{ maxHeight: '85px', maxWidth: '110px', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#000', margin: '0 0 2px 0', fontFamily: 'Times New Roman, serif' }}>
                      Sri Eshwar College of Engineering
                    </h1>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#111', marginBottom: '2px' }}>
                      (An Autonomous Institution)
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#222', lineHeight: '1.3' }}>
                      Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai<br />
                      Kondampatti (Post), Kinathukadavu (Tk), Coimbatore – 641 202
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000', marginTop: '4px', fontFamily: 'Times New Roman, serif' }}>
                      Office of the Controller of Examinations
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ border: '1.5px solid #000', padding: '2px 4px', borderRadius: '3px', textAlign: 'center', width: '85px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '900' }}>NAAC 'A'</div>
                      <div style={{ fontSize: '7px', fontWeight: 'bold' }}>Grade Accredited</div>
                    </div>
                    <div style={{ border: '1px solid #000', padding: '2px 4px', fontSize: '8px', fontWeight: 'bold', textAlign: 'center', width: '85px' }}>
                      April / May 2026
                    </div>
                  </div>
                </div>

                {/* Banner */}
                <div style={{
                  border: '2px solid #000',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  textAlign: 'center',
                  marginBottom: '14px',
                  background: '#f8fafc'
                }}>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#000', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    HALL TICKET / ADMIT CARD
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
                    Autonomous Semester End Examinations – April / May 2026
                  </div>
                </div>

                {/* Student Details Grid & Photo */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 130px',
                  gap: '16px',
                  border: '1.5px solid #000',
                  padding: '12px 16px',
                  marginBottom: '14px',
                  borderRadius: '4px',
                  background: '#fff'
                }}>
                  {/* Student Metadata */}
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '3px 0', fontWeight: 'bold', width: '130px' }}>Register Number:</td>
                        <td style={{ padding: '3px 0', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '14px', color: '#1d4ed8' }}>
                          {std.reg_no}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Candidate Name:</td>
                        <td style={{ padding: '3px 0', fontWeight: 'bold', fontSize: '13px' }}>
                          {std.name && !std.name.startsWith('Student 7228') && !std.name.startsWith('Student 202') ? std.name : '-'}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Degree & Branch:</td>
                        <td style={{ padding: '3px 0' }}>{fullDept}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Semester & Section:</td>
                        <td style={{ padding: '3px 0' }}>Semester {std.semester || 1} (Section {std.section || 'A'})</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Regulations:</td>
                        <td style={{ padding: '3px 0' }}>Regulations – 2023</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Exam Center:</td>
                        <td style={{ padding: '3px 0', fontWeight: '600' }}>Sri Eshwar College of Engineering (Autonomous)</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Photo & Signature Placeholder */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                      width: '110px',
                      height: '120px',
                      border: '1.5px solid #000',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justify: 'center',
                      background: '#f1f5f9',
                      textAlign: 'center',
                      padding: '4px'
                    }}>
                      <div style={{ fontSize: '26px', color: '#64748b' }}>👤</div>
                      <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569', marginTop: '2px' }}>AFFIX RECENT</div>
                      <div style={{ fontSize: '8px', color: '#64748b' }}>PASSPORT PHOTO</div>
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', marginTop: '4px', textAlign: 'center' }}>
                      Candidate Signature
                    </div>
                  </div>
                </div>

                {/* Exam Schedule Table */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Registered Examinations ({studentExams.length} Subjects)
                  </div>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '11.5px',
                    border: '1.5px solid #000'
                  }}>
                    <thead>
                      <tr style={{ background: '#e2e8f0', color: '#000' }}>
                        <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '35px' }}>Sl.</th>
                        <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '45px' }}>Sem</th>
                        <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '80px' }}>Code</th>
                        <th style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'left' }}>Course Title</th>
                        <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '85px' }}>Date</th>
                        <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '130px' }}>Session & Time</th>
                        <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '65px' }}>Type</th>
                        <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '90px' }}>Invigilator Sign</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentExams.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ border: '1px solid #000', padding: '12px', textAlign: 'center', color: '#64748b' }}>
                            No examination entries found for this student.
                          </td>
                        </tr>
                      ) : (
                        studentExams.map((exam, idx) => (
                          <tr key={idx}>
                            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>
                              {ROMAN_NUMS[exam.semester] || exam.semester}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold' }}>
                              {exam.course_code}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '5px 10px', fontWeight: '500' }}>
                              {exam.course_name}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>
                              {formatDateDot(exam.date)}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontSize: '10.5px' }}>
                              <strong>{exam.session}</strong> ({exam.session === 'FN' ? '9.30 AM – 12.30 PM' : '1.30 PM – 4.30 PM'})
                            </td>
                            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold', color: exam.is_arrear ? '#b45309' : '#047857' }}>
                              {exam.is_arrear ? 'ARREAR' : 'REGULAR'}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '5px' }}></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Candidate Instructions */}
                <div style={{
                  border: '1px solid #000',
                  padding: '8px 12px',
                  marginBottom: '16px',
                  fontSize: '9.5px',
                  lineHeight: '1.4',
                  background: '#fafafa'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '2px', textTransform: 'uppercase' }}>Instructions to Candidates:</div>
                  <ol style={{ margin: 0, paddingLeft: '16px' }}>
                    <li>Candidates must present this Hall Ticket along with their official Institute Identity Card to gain entry into the examination hall.</li>
                    <li>Candidates should report to their assigned examination hall 15 minutes before the session commencement time.</li>
                    <li>Mobile phones, smartwatches, programmable calculators, or any unauthorized electronic items are strictly prohibited.</li>
                    <li>The Invigilator must sign in the designated column for each examination session attended by the candidate.</li>
                  </ol>
                </div>

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
                  <div style={{ textAlign: 'center', width: '180px' }}>
                    <div style={{ borderBottom: '1px solid #000', height: '30px' }}></div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>Signature of Candidate</div>
                  </div>

                  <div style={{ textAlign: 'center', position: 'relative' }}>
                    <div style={{
                      fontFamily: '"Brush Script MT", "Caveat", cursive',
                      fontSize: '20px',
                      color: '#047857',
                      fontWeight: 'bold',
                      transform: 'rotate(-4deg)',
                      marginBottom: '-2px'
                    }}>
                      R. An 9/4/26
                    </div>
                    <div style={{ color: '#6d28d9', fontSize: '10.5px', fontWeight: 'bold', lineHeight: '1.2' }}>
                      <div>Controller of Examinations</div>
                      <div>Sri Eshwar College of Engineering (Autonomous)</div>
                      <div>Kinathukadavu, Coimbatore – 641 202</div>
                    </div>
                  </div>
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
          .print-hallticket-container, .print-hallticket-container * {
            visibility: visible !important;
          }
          .print-hallticket-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .hallticket-paper {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 12mm 10mm !important;
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
            margin: 6mm;
          }
        }
      `}</style>
    </div>
  )
}
