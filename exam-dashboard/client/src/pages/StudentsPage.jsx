import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePipelineContext } from '../context/PipelineContext'
import HallTicketModal from '../components/HallTicketModal'

const ALL_BRANCHES = ['CSE', 'AIML', 'CCE', 'CYSE', 'MECH', 'ECE', 'VLSI', 'EEE', 'AIDS', 'CSBS', 'IT']

const BRANCH_TITLES = {
  CSE: 'Computer Science & Engineering',
  ECE: 'Electronics & Communication Engineering',
  EEE: 'Electrical & Electronics Engineering',
  MECH: 'Mechanical Engineering',
  IT: 'Information Technology',
  AIML: 'CSE (AI & Machine Learning)',
  AIDS: 'AI & Data Science',
  CYSE: 'CSE (Cyber Security)',
  CCE: 'Computer & Communication Engineering',
  CSBS: 'Computer Science & Business Systems',
  VLSI: 'Electronics Engineering (VLSI)',
}

const hasRealName = (name) =>
  name && !name.startsWith('Student ') && name.trim() !== ''

export default function StudentsPage() {
  const navigate = useNavigate()
  const { schedule, students: pipelineStudents } = usePipelineContext()

  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('ALL')
  const [selectedSem, setSelectedSem] = useState('ALL')
  const [selectedType, setSelectedType] = useState('ALL')

  // Selected student for detail drawer or single hall ticket modal
  const [activeStudent, setActiveStudent] = useState(null)
  const [isHallTicketOpen, setIsHallTicketOpen] = useState(false)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)

  // Bulk branch printing state
  const [bulkPrintStudents, setBulkPrintStudents] = useState([])
  const [bulkBranchTitle, setBulkBranchTitle] = useState('')
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false)

  // Use real students from pipeline if available, else empty
  const allStudents = useMemo(() => {
    if (pipelineStudents && pipelineStudents.length > 0) {
      return pipelineStudents.map((s, i) => ({
        id: i + 1,
        reg_no: s.reg_no,
        name: s.name,
        branch: s.branch,
        semester: s.semester,
        section: 'A',
        year: Math.ceil(s.semester / 2),
      }))
    }
    return []
  }, [pipelineStudents])

  // Resolve student exams strictly from active schedule
  const getStudentExams = (student) => {
    if (!student || schedule.length === 0) return []

    const studentRegNo = student.reg_no
    const studentBranch = student.branch
    const studentSem = student.semester

    const matchedExams = schedule.filter(e => {
      // For Regular Exams: match branch and semester
      if (!e.is_arrear) {
        return (e.branches || []).includes(studentBranch) && e.semester === studentSem
      }
      
      // For Arrear Exams: match ONLY if student_reg_nos explicitly includes student.reg_no
      if (e.student_reg_nos && Array.isArray(e.student_reg_nos)) {
        return e.student_reg_nos.includes(studentRegNo)
      }
      
      // Fallback if student_reg_nos is not present
      return (e.branches || []).includes(studentBranch) && e.semester === studentSem
    })

    let filtered = matchedExams
    if (selectedType === 'REGULAR') filtered = matchedExams.filter(e => !e.is_arrear)
    if (selectedType === 'ARREAR') filtered = matchedExams.filter(e => e.is_arrear)

    return filtered.sort((a, b) => (a.date > b.date ? 1 : -1))
  }

  // Filter students based on search controls
  const filteredStudents = useMemo(() => {
    return allStudents.filter(s => {
      const query = search.trim().toLowerCase()
      const matchesSearch = !query ||
        s.name.toLowerCase().includes(query) ||
        s.reg_no.toLowerCase().includes(query) ||
        s.branch.toLowerCase().includes(query)

      const matchesBranch = selectedBranch === 'ALL' || s.branch === selectedBranch
      const matchesSem = selectedSem === 'ALL' || s.semester === parseInt(selectedSem, 10)

      return matchesSearch && matchesBranch && matchesSem
    })
  }, [allStudents, search, selectedBranch, selectedSem])

  // Bulk Print Handler for Selected Branch
  const handleBulkPrintBranch = (branchCode) => {
    const targetBranch = branchCode === 'ALL' ? (selectedBranch === 'ALL' ? 'CSE' : selectedBranch) : branchCode
    const branchStudents = allStudents.filter(s => s.branch === targetBranch)
    const title = `${targetBranch} - ${BRANCH_TITLES[targetBranch] || targetBranch}`

    setBulkPrintStudents(branchStudents)
    setBulkBranchTitle(title)
    setIsBulkPrintOpen(true)
  }

  const handleOpenHallTicket = (student) => {
    setActiveStudent(student)
    setIsHallTicketOpen(true)
  }

  const handleOpenDetails = (student) => {
    setActiveStudent(student)
    setIsDetailDrawerOpen(true)
  }

  // REQUIREMENT 1: If timetable is not generated yet, show empty state blocking access
  if (schedule.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Student Directory & Hall Tickets</h1>
            <p style={{ fontSize: 13, marginTop: 2 }}>
              Hall tickets are available after dataset loading and schedule generation.
            </p>
          </div>
        </div>

        <div className="page-body">
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '650px', margin: '40px auto' }}>
            <div style={{ fontSize: 54, marginBottom: 16, color: '#94a3b8' }}>📅</div>
            <h2 style={{ color: '#0f172a', marginBottom: 10, fontSize: 22, fontWeight: 800 }}>
              No Exam Timetable Generated Yet
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Student hall tickets are strictly derived from the official exam schedule. Please load a dataset and complete the AI agent scheduling pipeline to generate hall tickets.
            </p>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/schedule')}
              style={{ padding: '12px 28px', fontSize: 14, fontWeight: 700 }}
            >
              ＋ Generate Exam Schedule Now
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Student Directory & Official Hall Tickets</h1>
          <p style={{ fontSize: 13, marginTop: 2 }}>
            Manage student registrations, preview individual hall tickets, or export entire branch PDFs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={() => handleBulkPrintBranch(selectedBranch)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <span>🖨️</span> Export Branch Hall Tickets ({selectedBranch === 'ALL' ? 'CSE' : selectedBranch})
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Search & Filter Toolbar */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Search Student</label>
              <input
                type="text"
                placeholder="Search by student name or register number..."
                className="form-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Department</label>
              <select
                className="form-select"
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
              >
                <option value="ALL">All Departments ({ALL_BRANCHES.length})</option>
                {ALL_BRANCHES.map(b => (
                  <option key={b} value={b}>{b} — {BRANCH_TITLES[b] || b}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Semester</label>
              <select
                className="form-select"
                value={selectedSem}
                onChange={e => setSelectedSem(e.target.value)}
              >
                <option value="ALL">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Exam Type</label>
              <select
                className="form-select"
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
              >
                <option value="ALL">All Types (Regular + Arrears)</option>
                <option value="REGULAR">Regular Exams Only</option>
                <option value="ARREAR">Arrear Backlogs Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Student Table */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>
              Registered Students ({filteredStudents.length})
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Showing {filteredStudents.length} of {allStudents.length} total students
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Register Number</th>
                  <th>Student Name</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Registered Exams</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, idx) => {
                  const studentExams = getStudentExams(s)
                  const regExams = studentExams.filter(e => !e.is_arrear)
                  const arrExams = studentExams.filter(e => e.is_arrear)

                  return (
                    <tr key={s.reg_no || idx}>
                      <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                          {s.reg_no}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</div>
                      </td>
                      <td>
                        <span className="badge badge-blue">{s.branch}</span>
                      </td>
                      <td>Sem {s.semester}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                            {studentExams.length} Total
                          </span>
                          {regExams.length > 0 && (
                            <span className="badge badge-gray" style={{ fontSize: 11 }}>
                              {regExams.length} Reg
                            </span>
                          )}
                          {arrExams.length > 0 && (
                            <span className="badge badge-red" style={{ fontSize: 11 }}>
                              {arrExams.length} Arrear
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenDetails(s)}
                          >
                            View Details
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenHallTicket(s)}
                            style={{ fontWeight: 700 }}
                          >
                            🎟️ Hall Ticket
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Single Hall Ticket Modal */}
      {isHallTicketOpen && activeStudent && (
        <HallTicketModal
          student={activeStudent}
          getStudentExams={getStudentExams}
          isOpen={isHallTicketOpen}
          onClose={() => setIsHallTicketOpen(false)}
        />
      )}

      {/* Bulk Hall Tickets Modal */}
      {isBulkPrintOpen && bulkPrintStudents.length > 0 && (
        <HallTicketModal
          students={bulkPrintStudents}
          getStudentExams={getStudentExams}
          branchTitle={bulkBranchTitle}
          isOpen={isBulkPrintOpen}
          onClose={() => setIsBulkPrintOpen(false)}
        />
      )}

      {/* Student Details Drawer */}
      {isDetailDrawerOpen && activeStudent && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
          background: '#ffffff', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)',
          zIndex: 900, padding: 24, display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Student Enrolment Details</h3>
            <button
              onClick={() => setIsDetailDrawerOpen(false)}
              style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
            >
              ✕
            </button>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{activeStudent.name}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Reg No: {activeStudent.reg_no}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Branch: {activeStudent.branch} (Sem {activeStudent.semester})</div>
          </div>

          <h4 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: 14 }}>Scheduled Exams ({getStudentExams(activeStudent).length})</h4>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {getStudentExams(activeStudent).map((ex, i) => (
              <div key={i} style={{
                padding: 12, borderRadius: 8, border: '1px solid #e2e8f0',
                background: ex.is_arrear ? '#fef2f2' : '#ffffff',
                borderColor: ex.is_arrear ? '#fecaca' : '#e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{ex.course_code}</span>
                  <span className={`badge ${ex.is_arrear ? 'badge-red' : 'badge-blue'}`}>
                    {ex.is_arrear ? 'ARREAR' : 'REGULAR'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{ex.course_name}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginTop: 6 }}>
                  📅 {ex.date} &nbsp;·&nbsp; {ex.session} ({ex.time})
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary"
            onClick={() => { setIsDetailDrawerOpen(false); handleOpenHallTicket(activeStudent) }}
            style={{ marginTop: 16, width: '100%', padding: 12, fontWeight: 700 }}
          >
            🎟️ View Full Hall Ticket
          </button>
        </div>
      )}
    </div>
  )
}
