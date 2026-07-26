import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePipelineContext } from '../context/PipelineContext'

const DEPT_CODES = ['CS', 'IT', 'CB', 'AM', 'EC', 'EE', 'ME', 'CV']
const DEPT_NAMES = { CS: 'Computer Science', IT: 'Information Technology', CB: 'Computer Science & Business Systems', AM: 'AI & Machine Learning', EC: 'Electronics & Communication', EE: 'Electrical & Electronics', ME: 'Mechanical Engineering', CV: 'Civil Engineering' }
const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard']
const SESSION_OPTIONS = ['FN (9:30 AM – 12:30 PM)', 'AN (1:30 PM – 4:30 PM)']

const STEPS = ['Exam Window', 'Departments', 'Year Pattern', 'Holidays', 'Courses', 'Review & Run']

// Auto-fill sensible start/end dates based on semester type
function defaultDates(type) {
  const now = new Date()
  const year = now.getFullYear()
  // Odd sem: Nov 1 – Dec 15 of current year (or next if we're past Dec)
  // Even sem: Apr 1 – May 15 of current year (or next year if we're past May)
  if (type === 'odd') {
    const y = now.getMonth() >= 11 ? year + 1 : year   // if Dec is over, use next year
    return { start: `${y}-11-01`, end: `${y}-12-15` }
  } else {
    const y = now.getMonth() >= 5 ? year + 1 : year    // if May is over, use next year
    return { start: `${y}-04-01`, end: `${y}-05-15` }
  }
}

// Date range limits for the picker
function dateLimits(type) {
  const now = new Date()
  const year = now.getFullYear()
  if (type === 'odd') {
    const y = now.getMonth() >= 11 ? year + 1 : year
    return { min: `${y}-11-01`, max: `${y}-12-31` }
  } else {
    const y = now.getMonth() >= 5 ? year + 1 : year
    return { min: `${y}-04-01`, max: `${y}-05-31` }
  }
}

export default function SchedulePage() {
  const navigate = useNavigate()
  const { trigger } = usePipelineContext()
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Step 0 — Exam Window
  const [csvFile, setCsvFile] = useState(null)
  const [semester, setSemester] = useState('odd')
  const [startDate, setStartDate] = useState(() => defaultDates('odd').start)
  const [endDate, setEndDate] = useState(() => defaultDates('odd').end)
  const [humanIntervention, setHumanIntervention] = useState(false)

  // Step 1 — Departments
  const [selectedDepts, setSelectedDepts] = useState(DEPT_CODES.reduce((a, d) => ({ ...a, [d]: true }), {}))
  const [examsPerBranch, setExamsPerBranch] = useState(DEPT_CODES.reduce((a, d) => ({ ...a, [d]: 12 }), {}))

  // Step 2 — Year pattern
  const [yearPattern, setYearPattern] = useState({ 1: 'FN', 2: 'FN', 3: 'FN', 4: 'AN' })

  // Step 3 — Holidays
  const [holidayInput, setHolidayInput] = useState('')
  const [holidays, setHolidays] = useState([])

  // Step 4 — Courses difficulty
  const [courseRows, setCourseRows] = useState([
    { code: '', difficulty: 'medium' },
  ])

  const handleSemesterChange = (val) => {
    setSemester(val)
    const { start, end } = defaultDates(val)
    setStartDate(start)
    setEndDate(end)
  }

  const addHoliday = () => {
    if (!holidayInput) return
    const d = holidayInput.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { setError('Date must be YYYY-MM-DD'); return }
    setHolidays(prev => [...new Set([...prev, d])])
    setHolidayInput('')
    setError('')
  }

  const removeHoliday = (d) => setHolidays(prev => prev.filter(x => x !== d))

  const addCourseRow = () => setCourseRows(prev => [...prev, { code: '', difficulty: 'medium' }])
  const updateCourse = (i, field, val) => setCourseRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  const removeCourse = (i) => setCourseRows(prev => prev.filter((_, idx) => idx !== i))

  const validate = () => {
    if (step === 0) {
      if (!csvFile) return 'Please upload the student data file.'
      if (!startDate || !endDate) return 'Please select exam start and end dates.'
      if (startDate >= endDate) return 'End date must be after start date.'
    }
    return ''
  }

  const next = () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  const back = () => { setError(''); setStep(s => s - 1) }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const difficultyMap = {}
      courseRows.forEach(r => { if (r.code.trim()) difficultyMap[r.code.trim().toUpperCase()] = r.difficulty })

      const activeDepts = Object.entries(selectedDepts).filter(([, v]) => v).map(([k]) => k)
      const epb = {}
      activeDepts.forEach(d => { epb[d] = Number(examsPerBranch[d]) || 12 })

      const fd = new FormData()
      fd.append('file', csvFile)
      fd.append('startDate', startDate)
      fd.append('endDate', endDate)
      fd.append('leaveDays', JSON.stringify(holidays))
      fd.append('difficultyMap', JSON.stringify(difficultyMap))
      fd.append('yearSessionPattern', JSON.stringify(yearPattern))
      fd.append('examsPerBranch', JSON.stringify(epb))
      fd.append('humanIntervention', humanIntervention)

      await trigger(fd)
      navigate('/agents')
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to start pipeline.')
    } finally {
      setSubmitting(false)
    }
  }

  const inp = 'form-input'
  const sel = 'form-select'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>New Exam Schedule</h1>
          <p style={{ fontSize: 13, marginTop: 2 }}>Fill in the details below to generate a timetable</p>
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 760 }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < step ? '#1d4ed8' : i === step ? '#1d4ed8' : '#e2e8f0',
                  color: i <= step ? '#fff' : '#94a3b8',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: i === step ? '#1d4ed8' : '#94a3b8', whiteSpace: 'nowrap' }}>
                  {s}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < step ? '#1d4ed8' : '#e2e8f0', margin: '0 4px', marginBottom: 18 }} />
              )}
            </div>
          ))}
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="card" style={{ padding: 28 }}>

          {/* ── Step 0: Exam Window ── */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2>Exam Window</h2>
                <p style={{ marginTop: 4, fontSize: 13 }}>Upload student data and set the exam period dates.</p>
              </div>
              <div className="divider" />

              <div className="form-group">
                <label className="form-label">Student Enrolment File <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={{
                  border: '2px dashed #e2e8f0', borderRadius: 10, padding: '20px',
                  textAlign: 'center', cursor: 'pointer', background: csvFile ? '#f0fdf4' : '#f8fafc',
                  transition: 'all 0.15s',
                }}
                  onClick={() => document.getElementById('csv-upload').click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); setCsvFile(e.dataTransfer.files[0]) }}
                >
                  <input id="csv-upload" type="file" accept=".csv,.json" style={{ display: 'none' }}
                    onChange={e => setCsvFile(e.target.files[0])} />
                  {csvFile ? (
                    <div>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>✓</div>
                      <div style={{ fontWeight: 700, color: '#166534' }}>{csvFile.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {(csvFile.size / 1024).toFixed(1)} KB · Click to change
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 28, marginBottom: 6, color: '#94a3b8' }}>↑</div>
                      <div style={{ fontWeight: 600, color: '#334155' }}>Click to upload or drag & drop</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>CSV or JSON · Student enrolment data</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Semester Type</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['odd', 'Odd Semester (Nov – Dec)'], ['even', 'Even Semester (Apr – May)']].map(([val, lbl]) => (
                    <div key={val} onClick={() => handleSemesterChange(val)} style={{
                      flex: 1, padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                      border: `2px solid ${semester === val ? '#1d4ed8' : '#e2e8f0'}`,
                      background: semester === val ? '#eff6ff' : '#fff',
                      fontWeight: semester === val ? 700 : 500,
                      color: semester === val ? '#1d4ed8' : '#334155',
                      fontSize: 13, transition: 'all 0.15s',
                    }}>
                      {lbl}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Exam Start Date <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="date" className={inp} value={startDate}
                    min={dateLimits(semester).min} max={dateLimits(semester).max}
                    onChange={e => setStartDate(e.target.value)} />
                  <span className="form-hint">
                    {semester === 'odd' ? 'Must be within November – December' : 'Must be within April – May'}
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">Exam End Date <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="date" className={inp} value={endDate}
                    min={startDate || dateLimits(semester).min} max={dateLimits(semester).max}
                    onChange={e => setEndDate(e.target.value)} />
                  <span className="form-hint">
                    {semester === 'odd' ? 'Must be within November – December' : 'Must be within April – May'}
                  </span>
                </div>
              </div>

              <div className="form-checkbox-row" onClick={() => setHumanIntervention(v => !v)}>
                <input type="checkbox" checked={humanIntervention} onChange={() => {}} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>Enable Human Review at Each Step</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Pause after each agent completes so you can review and modify before continuing</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Departments ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2>Departments & Exam Count</h2>
                <p style={{ marginTop: 4, fontSize: 13 }}>Select which departments are writing exams and how many exams each should have.</p>
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DEPT_CODES.map(d => (
                  <div key={d} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', borderRadius: 10,
                    border: `1.5px solid ${selectedDepts[d] ? '#1d4ed8' : '#e2e8f0'}`,
                    background: selectedDepts[d] ? '#eff6ff' : '#f8fafc',
                    transition: 'all 0.15s',
                  }}>
                    <input type="checkbox" checked={selectedDepts[d]}
                      onChange={e => setSelectedDepts(prev => ({ ...prev, [d]: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: '#1d4ed8', cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{d}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{DEPT_NAMES[d]}</div>
                    </div>
                    {selectedDepts[d] && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>Max exams:</label>
                        <input type="number" min={1} max={30} value={examsPerBranch[d]}
                          onChange={e => setExamsPerBranch(prev => ({ ...prev, [d]: e.target.value }))}
                          style={{ width: 64, padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 13, textAlign: 'center' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Year Pattern ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2>Year-wise Session Pattern</h2>
                <p style={{ marginTop: 4, fontSize: 13 }}>
                  Set which session (morning or afternoon) each year of students should write their exams.
                  This helps avoid hall allocation conflicts.
                </p>
              </div>
              <div className="divider" />
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#1e40af' }}>
                FN = Forenoon (9:30 AM – 12:30 PM) &nbsp;·&nbsp; AN = Afternoon (1:30 PM – 4:30 PM)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3, 4].map(yr => (
                  <div key={yr} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '14px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                        {yr === 1 ? '1st Year' : yr === 2 ? '2nd Year' : yr === 3 ? '3rd Year' : 'Final Year (4th)'}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Semester {yr * 2 - 1} & {yr * 2}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['FN', 'AN'].map(sess => (
                        <div key={sess} onClick={() => setYearPattern(p => ({ ...p, [yr]: sess }))} style={{
                          padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
                          border: `2px solid ${yearPattern[yr] === sess ? '#1d4ed8' : '#e2e8f0'}`,
                          background: yearPattern[yr] === sess ? '#1d4ed8' : '#f8fafc',
                          color: yearPattern[yr] === sess ? '#fff' : '#64748b',
                          fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
                        }}>
                          {sess}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Holidays ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2>Government Holidays & Leave Days</h2>
                <p style={{ marginTop: 4, fontSize: 13 }}>Add any dates when exams cannot be held — public holidays, college events, etc.</p>
              </div>
              <div className="divider" />
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="date" className={inp} value={holidayInput}
                  min={dateLimits(semester).min} max={dateLimits(semester).max}
                  onChange={e => setHolidayInput(e.target.value)}
                  style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={addHoliday}>Add Date</button>
              </div>
              {holidays.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: 13, border: '1.5px dashed #e2e8f0', borderRadius: 8 }}>
                  No holidays added yet. The system will schedule exams on all working days.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {holidays.sort().map(d => (
                    <div key={d} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff',
                    }}>
                      <div>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{d}</span>
                        <span style={{ marginLeft: 10, fontSize: 12, color: '#64748b' }}>
                          {new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                      <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => removeHoliday(d)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Courses ── */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2>Course Difficulty (Optional)</h2>
                <p style={{ marginTop: 4, fontSize: 13 }}>
                  Mark difficult courses so the system gives students extra preparation time before those exams.
                  Courses with 4+ credits are automatically treated as hard.
                </p>
              </div>
              <div className="divider" />
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#92400e' }}>
                Hard courses get a 2-day gap before them. Medium/Easy courses get the standard 1-day gap.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {courseRows.map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input className={inp} placeholder="Course code (e.g. CS301)"
                      value={row.code} onChange={e => updateCourse(i, 'code', e.target.value)}
                      style={{ flex: 1, textTransform: 'uppercase' }} />
                    <select className={sel} value={row.difficulty}
                      onChange={e => updateCourse(i, 'difficulty', e.target.value)}
                      style={{ width: 140 }}>
                      {DIFFICULTY_OPTIONS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                    </select>
                    {courseRows.length > 1 && (
                      <button className="btn btn-danger" style={{ padding: '8px 12px' }}
                        onClick={() => removeCourse(i)}>×</button>
                    )}
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary" onClick={addCourseRow} style={{ alignSelf: 'flex-start' }}>
                + Add Another Course
              </button>
            </div>
          )}

          {/* ── Step 5: Review ── */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2>Review & Generate</h2>
                <p style={{ marginTop: 4, fontSize: 13 }}>Review your settings before generating the timetable.</p>
              </div>
              <div className="divider" />

              {[
                { label: 'Student Data File', value: csvFile?.name },
                { label: 'Exam Period', value: `${startDate} to ${endDate}` },
                { label: 'Semester Type', value: semester === 'odd' ? 'Odd (Nov–Dec)' : 'Even (Apr–May)' },
                { label: 'Departments', value: Object.entries(selectedDepts).filter(([,v]) => v).map(([k]) => k).join(', ') },
                { label: 'Holidays', value: holidays.length > 0 ? holidays.join(', ') : 'None' },
                { label: 'Human Review', value: humanIntervention ? 'Enabled — pipeline will pause after each agent' : 'Disabled — fully automatic' },
                { label: 'Year Pattern', value: Object.entries(yearPattern).map(([yr, sess]) => `Year ${yr}: ${sess}`).join(' · ') },
                { label: 'Hard Courses', value: courseRows.filter(r => r.code && r.difficulty === 'hard').map(r => r.code).join(', ') || 'None specified' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: 160, fontSize: 13, fontWeight: 600, color: '#64748b', flexShrink: 0 }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#0f172a' }}>{value}</div>
                </div>
              ))}

              <div className="alert alert-info" style={{ marginTop: 8 }}>
                The pipeline will run 6 AI agents in sequence. This typically takes 2–5 minutes depending on data size and LLM response time.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1.5px solid #e2e8f0' }}>
            <button className="btn btn-secondary" onClick={back} disabled={step === 0}
              style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={next}>
                Continue
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Starting...' : 'Generate Timetable'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
