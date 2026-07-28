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

// Generate mock students mapped to branches
function generateMockStudents() {
  const deptsCodes = {
    CSE: 'CS', AIML: 'AM', CCE: 'CC', CYSE: 'CY', MECH: 'ME',
    ECE: 'EC', VLSI: 'VL', EEE: 'EE', AIDS: 'AD', CSBS: 'CB', IT: 'IT'
  }

  const sampleFirstNames = ['Ishaan', 'Raja', 'Naveen', 'Harish', 'Kiran', 'Ananya', 'Priya', 'Siddharth', 'Divya', 'Karthik', 'Aarav', 'Meera', 'Rohan', 'Sneha', 'Vikram', 'Pooja', 'Rahul', 'Deepak', 'Swetha', 'Arjun']
  const sampleLastNames = ['Kumar', 'Iyer', 'Reddy', 'Sundar', 'Patel', 'Sharma', 'Nair', 'Verma', 'Subramanian', 'Menon', 'Joshi', 'Gupta', 'Rao', 'Singh', 'Chaudhary']

  const list = []
  let globalId = 1

  ALL_BRANCHES.forEach(dept => {
    const deptCode = deptsCodes[dept] || '104'
    const batches = [
      { year: '26', sem: 1 },
      { year: '25', sem: 3 },
      { year: '24', sem: 5 },
      { year: '23', sem: 7 },
    ]
    batches.forEach(b => {
      for (let i = 1; i <= 4; i++) {
        const fn = sampleFirstNames[(i + globalId) % sampleFirstNames.length]
        const ln = sampleLastNames[(i * 3 + globalId) % sampleLastNames.length]
        const reg_no = `7228${b.year}${deptCode}${String(i).padStart(3, '0')}`
        const name = `${fn} ${ln}`

        list.push({
          id: globalId++,
          reg_no,
          name,
          branch: dept,
          semester: b.sem,
          section: i % 2 === 0 ? 'B' : 'A',
          year: Math.ceil(b.sem / 2)
        })
      }
    })
  })

  return list
}

export default function StudentsPage() {
  const navigate = useNavigate()
  const { schedule } = usePipelineContext()

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

  // Generate base student directory
  const allStudents = useMemo(() => generateMockStudents(), [])

  // Resolve student exams strictly from active schedule
  const getStudentExams = (student) => {
    if (!student || schedule.length === 0) return []

    const studentBranch = student.branch
    const studentSem = student.semester

    // Filter schedule items for student's branch
    let exams = schedule.filter(e => (e.branches || []).includes(studentBranch))

    // Filter exams matching student's semester or arrear
    exams = exams.filter(e => e.semester === studentSem || e.is_arrear)

    if (selectedType === 'REGULAR') exams = exams.filter(e => !e.is_arrear)
    if (selectedType === 'ARREAR') exams = exams.filter(e => e.is_arrear)

    return exams.sort((a, b) => (a.date > b.date ? 1 : -1))
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
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Student Directory & Hall Tickets</h1>
          <p style={{ fontSize: 13, marginTop: 2 }}>
            View exam schedules per student & bulk print department hall tickets as single combined PDFs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleBulkPrintBranch(selectedBranch === 'ALL' ? 'CSE' : selectedBranch)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <span>🖨️</span> Bulk Print Branch Hall Tickets (PDF)
          </button>
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Search & Filter Toolbar */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 14, alignItems: 'center' }}>
            
            {/* Search Input */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
                🔍 Search Student
              </label>
              <input
                type="text"
                placeholder="Search by Name or Register No (e.g. Ishaan, 24CS001)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="form-input"
                style={{ borderRadius: 6 }}
              />
            </div>

            {/* Department Filter */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
                🏫 Department / Branch
              </label>
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="form-select"
                style={{ borderRadius: 6 }}
              >
                <option value="ALL">All Departments ({ALL_BRANCHES.length})</option>
                {ALL_BRANCHES.map(b => (
                  <option key={b} value={b}>{b} – {BRANCH_TITLES[b] || b}</option>
                ))}
              </select>
            </div>

            {/* Semester Filter */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
                📚 Semester
              </label>
              <select
                value={selectedSem}
                onChange={e => setSelectedSem(e.target.value)}
                className="form-select"
                style={{ borderRadius: 6 }}
              >
                <option value="ALL">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>

            {/* Exam Type Filter */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
                📋 Exam Filter
              </label>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="form-select"
                style={{ borderRadius: 6 }}
              >
                <option value="ALL">All Exams (Regular + Arrear)</option>
                <option value="REGULAR">Regular Exams Only</option>
                <option value="ARREAR">Arrear Backlogs Only</option>
              </select>
            </div>

          </div>

          {/* Bulk Export Branch Bar */}
          <div style={{
            marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, color: '#1d4ed8' }}>Exam Cell Bulk Print:</span>
              <span>Showing {filteredStudents.length} students in selected view</span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {ALL_BRANCHES.slice(0, 5).map(b => (
                <button
                  key={b}
                  onClick={() => handleBulkPrintBranch(b)}
                  style={{
                    background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6,
                    padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    color: '#334155'
                  }}
                >
                  🖨️ Bulk Print {b}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Student Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredStudents.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <h3 style={{ color: '#64748b', marginBottom: 6 }}>No matching students found</h3>
              <p style={{ fontSize: 13, color: '#94a3b8' }}>Try adjusting your search name, register number, or branch filters.</p>
            </div>
          ) : (
            filteredStudents.map(student => {
              const studentExams = getStudentExams(student)
              const regularCount = studentExams.filter(e => !e.is_arrear).length
              const arrearCount = studentExams.filter(e => e.is_arrear).length

              return (
                <div key={student.id} className="card-sm" style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  transition: 'all 0.2s', border: '1px solid #e2e8f0'
                }}>
                  <div>
                    {/* Header line */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{
                        fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: '#1d4ed8',
                        background: '#eff6ff', border: '1px solid #dbeafe', padding: '2px 8px', borderRadius: 4
                      }}>
                        {student.reg_no}
                      </span>
                      <span className="badge badge-blue">
                        Sem {student.semester} · Sec {student.section}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                      {student.name}
                    </h3>

                    {/* Department Title */}
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                      {BRANCH_TITLES[student.branch] || student.branch}
                    </div>

                    {/* Exam count pills */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                      <div style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
                        padding: '4px 10px', fontSize: 12
                      }}>
                        <strong style={{ color: '#1d4ed8' }}>{regularCount}</strong> <span style={{ color: '#64748b' }}>Regular</span>
                      </div>
                      {arrearCount > 0 && (
                        <div style={{
                          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6,
                          padding: '4px 10px', fontSize: 12
                        }}>
                          <strong style={{ color: '#b45309' }}>{arrearCount}</strong> <span style={{ color: '#92400e' }}>Arrear</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 4 }}>
                    <button
                      onClick={() => handleOpenDetails(student)}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '7px 10px', fontSize: 12, justifyContent: 'center' }}
                    >
                      👁️ View Schedule
                    </button>
                    <button
                      onClick={() => handleOpenHallTicket(student)}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '7px 10px', fontSize: 12, justifyContent: 'center' }}
                    >
                      🎟️ Print Ticket
                    </button>
                  </div>

                </div>
              )
            })
          )}
        </div>

      </div>

      {/* Student Details Drawer */}
      {isDetailDrawerOpen && activeStudent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)',
          zIndex: 900, display: 'flex', justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '540px', maxWidth: '100%', background: '#ffffff', height: '100%',
            overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #e2e8f0', pb: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', fontFamily: 'monospace' }}>
                  {activeStudent.reg_no}
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                  {activeStudent.name}
                </h2>
                <p style={{ fontSize: 12, color: '#64748b' }}>
                  {BRANCH_TITLES[activeStudent.branch]} · Sem {activeStudent.semester} (Sec {activeStudent.section})
                </p>
              </div>
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 }}
              >
                ✖
              </button>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>📅 Registered Exam Schedule</h3>
                <span className="badge badge-blue">{getStudentExams(activeStudent).length} Subjects</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {getStudentExams(activeStudent).map((e, idx) => (
                  <div key={idx} style={{
                    border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px',
                    background: e.is_arrear ? '#fffbeb' : '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1d4ed8', fontSize: 13 }}>
                        {e.course_code}
                      </span>
                      <span className={`badge ${e.session === 'FN' ? 'badge-blue' : 'badge-yellow'}`}>
                        {e.session} ({e.session === 'FN' ? '9:30 AM – 12:30 PM' : '1:30 PM – 4:30 PM'})
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 6 }}>
                      {e.course_name}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                      <span>📅 Date: <strong>{e.date}</strong></span>
                      <span>Type: <strong style={{ color: e.is_arrear ? '#b45309' : '#16a34a' }}>{e.is_arrear ? 'Arrear' : 'Regular'}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 20, display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  setIsDetailDrawerOpen(false)
                  handleOpenHallTicket(activeStudent)
                }}
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                🎟️ Print Official Hall Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Student Hall Ticket Print Modal */}
      <HallTicketModal
        student={activeStudent}
        getStudentExams={getStudentExams}
        isOpen={isHallTicketOpen}
        onClose={() => setIsHallTicketOpen(false)}
      />

      {/* Bulk Branch Hall Ticket Print Modal */}
      <HallTicketModal
        students={bulkPrintStudents}
        branchTitle={bulkBranchTitle}
        getStudentExams={getStudentExams}
        isOpen={isBulkPrintOpen}
        onClose={() => setIsBulkPrintOpen(false)}
      />
    </div>
  )
}
