import { useState } from 'react'
import logoEshwar from '../assets/logo_eshwar.png'
import { extractSemFromCourseCode } from '../utils/excelParser'

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
              padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer'
            }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Main Document Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#334155' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {studentList.map((std, studentIdx) => {
            const studentExams = getStudentExams ? getStudentExams(std) : []
            const fullDept = DEPT_NAMES[std.branch] || std.branch

            return (
              <div
                key={std.reg_no || studentIdx}
                className="printable-hallticket"
                style={{
                  background: '#fff',
                  color: '#000',
                  padding: '24px 32px',
                  borderRadius: '4px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                  fontFamily: '"Times New Roman", Times, serif',
                  position: 'relative',
                  pageBreakAfter: 'always',
                  breakAfter: 'page',
                  minHeight: '1050px',
                  boxSizing: 'border-box'
                }}
              >
                {/* Header Section */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '10px' }}>
                  <img src={logoEshwar} alt="Sri Eshwar Logo" style={{ height: '55px', width: 'auto' }} />
                  <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Sri Eshwar College of Engineering
                    </div>
                    <div style={{ fontSize: '11px', fontStyle: 'italic', margin: '2px 0' }}>
                      (An Autonomous Institution)
                    </div>
                    <div style={{ fontSize: '10px' }}>
                      Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: '500' }}>
                      Kondampatti (Post), Kinathukadavu (Tk), Coimbatore – 641 202
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '3px' }}>
                      Office of the Controller of Examinations
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ border: '1px solid #000', padding: '2px 4px', fontSize: '8px', fontWeight: 'bold', textAlign: 'center', width: '85px' }}>
                      NAAC 'A' Grade Accredited
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
                      width: '100px', height: '115px', border: '1px solid #000',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: '#f1f5f9', fontSize: '9px', textAlign: 'center', padding: '4px',
                      color: '#475569'
                    }}>
                      <span style={{ fontSize: '20px', marginBottom: '2px' }}>👤</span>
                      AFFIX RECENT PASSPORT PHOTO
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '10px', fontStyle: 'italic', color: '#333' }}>
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
                        studentExams.map((exam, idx) => {
                          const resolvedSem = exam.semester || extractSemFromCourseCode(exam.course_code)
                          const romanSem = ROMAN_NUMS[resolvedSem] || ROMAN_NUMS[extractSemFromCourseCode(exam.course_code)] || 'I'

                          return (
                            <tr key={idx}>
                              <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{idx + 1}</td>
                              <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>
                                {romanSem}
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
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '35px', paddingTop: '10px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #000', width: '160px', paddingTop: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                      Candidate Signature
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #000', width: '160px', paddingTop: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                      Controller of Examinations
                    </div>
                  </div>
                </div>

                {/* Page Number Footer */}
                <div style={{ textAlign: 'center', fontSize: '9px', color: '#64748b', marginTop: '16px', borderTop: '1px dashed #ccc', paddingTop: '6px' }}>
                  OFFICIAL EXAM CELL COPY · PAGE {studentIdx + 1} OF {studentList.length}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
