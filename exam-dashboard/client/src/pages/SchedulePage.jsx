import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePipelineContext } from '../context/PipelineContext'

function getDefaultStartDate(semType) {
  const now = new Date()
  const year = now.getFullYear()
  if (semType === 'odd') {
    const novThisYear = new Date(year, 9, 1) // Oct 1 — if past Oct, use next year Nov
    return now > novThisYear ? `${year + 1}-11-02` : `${year}-11-02`
  } else {
    const aprThisYear = new Date(year, 3, 1) // Apr 1
    return now > aprThisYear ? `${year + 1}-04-20` : `${year}-04-20`
  }
}

export default function SchedulePage() {
  const navigate = useNavigate()
  const { trigger } = usePipelineContext()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Mode & Semester Type State
  const [inputMode, setInputMode] = useState('2file') // '2file' | 'single' | 'split'
  const [semType, setSemType] = useState('odd') // 'odd' | 'even'
  const [patternType, setPatternType] = useState('alternating') // 'alternating' | 'semester_wise'

  const defaultOddDate = getDefaultStartDate('odd')
  const defaultEvenDate = getDefaultStartDate('even')

  const [masterFile, setMasterFile] = useState(null)
  const [regularFile, setRegularFile] = useState(null)
  const [arrearFile, setArrearFile] = useState(null)
  const [startDate, setStartDate] = useState(defaultOddDate)

  // Split Year Files & Start Dates
  const [files, setFiles] = useState({ 1: null, 2: null, 3: null, 4: null })
  const [startDates, setStartDates] = useState({
    1: defaultOddDate,
    2: defaultOddDate,
    3: defaultOddDate,
    4: defaultOddDate,
  })

  // Holidays
  const [holidayInput, setHolidayInput] = useState('')
  const [holidays, setHolidays] = useState([])

  // Options
  const [useGroqAI, setUseGroqAI] = useState(false)
  const [humanIntervention, setHumanIntervention] = useState(false)

  const yearSemLabels = {
    odd: { 1: 'I Year (Semester 1)', 2: 'II Year (Semester 3)', 3: 'III Year (Semester 5)', 4: 'IV Year (Semester 7)' },
    even: { 1: 'I Year (Semester 2)', 2: 'II Year (Semester 4)', 3: 'III Year (Semester 6)', 4: 'IV Year (Semester 8)' }
  }

  const handleSemTypeChange = (newSemType) => {
    setSemType(newSemType)
    const defaultDate = getDefaultStartDate(newSemType)
    setStartDate(defaultDate)
    setStartDates({ 1: defaultDate, 2: defaultDate, 3: defaultDate, 4: defaultDate })
  }

  const handleFileChange = (year, file) => {
    setFiles(prev => ({ ...prev, [year]: file }))
  }

  const handleStartDateChange = (year, val) => {
    setStartDates(prev => ({ ...prev, [year]: val }))
  }

  const addHoliday = () => {
    if (!holidayInput) return
    const d = holidayInput.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { setError('Holiday date must be YYYY-MM-DD'); return }
    setHolidays(prev => [...new Set([...prev, d])])
    setHolidayInput('')
    setError('')
  }

  const removeHoliday = (d) => setHolidays(prev => prev.filter(x => x !== d))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (inputMode === '2file') {
      if (!regularFile && !arrearFile) {
        setError('Please upload at least the Regular Courses file or Arrear file.')
        setSubmitting(false)
        return
      }
    } else if (inputMode === 'single') {
      if (!masterFile) {
        setError('Please upload your Single Master Registration file (e.g. Regular_All Courses.xlsx).')
        setSubmitting(false)
        return
      }
    } else {
      const hasRegularFile = Object.values(files).some(f => f !== null)
      if (!hasRegularFile && !arrearFile) {
        setError('Please upload at least one Regular Year Exam Map file or an Arrear Exam file.')
        setSubmitting(false)
        return
      }
    }

    try {
      const fd = new FormData()
      fd.append('semType', semType)
      fd.append('patternType', patternType)
      fd.append('leaveDays', JSON.stringify(holidays))
      fd.append('useGroqAI', useGroqAI)
      fd.append('humanIntervention', humanIntervention)
      fd.append('yearSessionPattern', JSON.stringify({ 1: 'FN', 2: 'FN', 3: 'FN', 4: 'FN' }))

      if (inputMode === '2file') {
        if (regularFile) fd.append('regular_file', regularFile)
        if (arrearFile) fd.append('arrear_file', arrearFile)
        fd.append('startDates', JSON.stringify({ 1: startDate, 2: startDate, 3: startDate, 4: startDate }))
      } else if (inputMode === 'single') {
        fd.append('regular_file', masterFile)
        if (arrearFile) fd.append('arrear_file', arrearFile)
        fd.append('startDates', JSON.stringify({ 1: startDate, 2: startDate, 3: startDate, 4: startDate }))
      } else {
        fd.append('startDates', JSON.stringify(startDates))
        Object.keys(files).forEach(yr => {
          if (files[yr]) {
            fd.append(`year_${yr}`, files[yr])
          }
        })
        if (arrearFile) fd.append('arrear_file', arrearFile)
      }

      await trigger(fd)
      navigate('/agents')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start exam scheduling pipeline.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>New Exam Schedule Setup</h1>
          <p style={{ fontSize: 13, marginTop: 2 }}>
            Upload registration files for automated zero-conflict scheduling
          </p>
        </div>
      </div>

      <div className="page-body">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div className="alert alert-error">{error}</div>}

          {/* Mode Selector */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%' }}>
            <button
              type="button"
              className={`btn ${inputMode === '2file' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setInputMode('2file')}
              style={{ fontWeight: 700, textAlign: 'left', flex: '1 1 200px' }}
            >
              <div>📁 2-File Mode</div>
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>Separate Regular + Arrear files</div>
            </button>
            <button
              type="button"
              className={`btn ${inputMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setInputMode('single')}
              style={{ fontWeight: 700, textAlign: 'left', flex: '1 1 200px' }}
            >
              <div>⚡ Single File Mode</div>
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>One master Excel with all students</div>
            </button>
            <button
              type="button"
              className={`btn ${inputMode === 'split' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setInputMode('split')}
              style={{ fontWeight: 700, textAlign: 'left', flex: '1 1 200px' }}
            >
              <div>🗂️ Year-wise Split Files</div>
              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>One file per year group (I–IV year)</div>
            </button>
          </div>

          {/* 1. Exam Season / Semester Type */}
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>1. Select Examination Season</h3>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', width: '100%' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, flex: '1 1 240px' }}>
                <input
                  type="radio"
                  name="semType"
                  value="odd"
                  checked={semType === 'odd'}
                  onChange={() => handleSemTypeChange('odd')}
                />
                <span>Odd Semesters (Nov / Dec 2026 — Semesters 1, 3, 5, 7)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, flex: '1 1 240px' }}>
                <input
                  type="radio"
                  name="semType"
                  value="even"
                  checked={semType === 'even'}
                  onChange={() => handleSemTypeChange('even')}
                />
                <span>Even Semesters (Apr / May 2026 — Semesters 2, 4, 6, 8)</span>
              </label>
            </div>
          </div>

          {/* 2. Schedule Pattern Toggle Switch */}
          <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <h3 style={{ marginBottom: 6, color: '#1d4ed8' }}>2. Select Schedule Pattern</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
              Choose how regular semester exams and arrear sessions rotate across calendar days.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', width: '100%' }}>
              <button
                type="button"
                onClick={() => setPatternType('alternating')}
                style={{
                  flex: '1 1 240px', padding: '12px 16px', borderRadius: 8, textAlign: 'left',
                  border: patternType === 'alternating' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: patternType === 'alternating' ? '#eff6ff' : '#f8fafc',
                  color: patternType === 'alternating' ? '#1e3a8a' : '#475569', cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: patternType === 'alternating' ? '#1d4ed8' : '#1e293b' }}>
                  🔄 Alternating Cycle Pattern (Default)
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Day 1 FN (Sem 3), Day 1 AN (Sem 5), Day 2 FN (Sem 7), Day 2 AN (Arrear Sweep)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPatternType('semester_wise')}
                style={{
                  flex: '1 1 240px', padding: '12px 16px', borderRadius: 8, textAlign: 'left',
                  border: patternType === 'semester_wise' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                  background: patternType === 'semester_wise' ? '#f5f3ff' : '#f8fafc',
                  color: patternType === 'semester_wise' ? '#4c1d95' : '#475569', cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: patternType === 'semester_wise' ? '#6d28d9' : '#1e293b' }}>
                  📅 Semester-Dedicated Daily Pattern (New Feature)
                </div>
                <div style={{ fontSize: 12, color: '#6d28d9', marginTop: 4 }}>
                  Day 1: Sem 3 FN + Arrear AN | Day 2: Sem 5 FN + Arrear AN | Day 3: Sem 7 FN + Arrear AN
                </div>
              </button>
            </div>
          </div>

          {/* 3. File Upload Cards depending on mode */}
          {inputMode === '2file' ? (
            <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
              <h3 style={{ marginBottom: 6, color: '#1d4ed8' }}>3. Regular & Arrear Input Files</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                Upload the Regular Courses File and optional Arrear Exam Details file.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>
                    📗 Regular Courses File (e.g. Regular_All Courses.xlsx):
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="form-control"
                    onChange={e => setRegularFile(e.target.files[0])}
                  />
                  {regularFile && <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4, fontWeight: 600 }}>✓ Attached: {regularFile.name}</div>}
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>
                    🚨 Arrear Exam File (e.g. Arrear Details_AM2026.xlsx):
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="form-control"
                    onChange={e => setArrearFile(e.target.files[0])}
                  />
                  {arrearFile && <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4, fontWeight: 600 }}>✓ Attached: {arrearFile.name}</div>}
                </div>
              </div>

              <div style={{ maxWidth: 300 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>
                  📅 Exam Start Date:
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
            </div>
          ) : inputMode === 'single' ? (
            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
              <h3 style={{ marginBottom: 6, color: '#047857' }}>3. Upload Registration File</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                Upload your single master registration file containing all student-course registrations (e.g. <code>Regular_All Courses.xlsx</code>).
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>
                    📗 Master Registration Excel File (.xlsx):
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="form-control"
                    onChange={e => setMasterFile(e.target.files[0])}
                  />
                  {masterFile && (
                    <div style={{ fontSize: 12, color: '#16a34a', marginTop: 6, fontWeight: 600 }}>
                      ✓ Master File Attached: {masterFile.name}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>
                    🚨 Arrear Exam Details File (Optional):
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="form-control"
                    onChange={e => setArrearFile(e.target.files[0])}
                  />
                  {arrearFile && (
                    <div style={{ fontSize: 12, color: '#16a34a', marginTop: 6, fontWeight: 600 }}>
                      ✓ Arrear File Attached: {arrearFile.name}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ maxWidth: 300 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>
                  📅 Exam Start Date:
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="card" style={{ borderLeft: '4px solid #7c3aed' }}>
              <h3 style={{ marginBottom: 6, color: '#6d28d9' }}>3. Regular Stream Files & Exam Start Dates</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                Upload Excel files for each year group, set their start dates, and attach optional arrear exam registrations.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                {[1, 2, 3, 4].map(year => (
                  <div key={year} style={{
                    border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 8 }}>
                      {yearSemLabels[semType][year]}
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>
                        Exam Start Date:
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        style={{ fontSize: 12 }}
                        value={startDates[year]}
                        onChange={e => handleStartDateChange(year, e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>
                        Exam Map Excel (.xlsx):
                      </label>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        className="form-control"
                        style={{ fontSize: 12 }}
                        onChange={e => handleFileChange(year, e.target.files[0])}
                      />
                      {files[year] && (
                        <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4, fontWeight: 600 }}>
                          ✓ {files[year].name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Arrear File Input Section for Yearwise Mode */}
              <div style={{
                marginTop: 20, paddingTop: 16, borderTop: '2px dashed #cbd5e1',
                background: '#fff3dc', padding: 16, borderRadius: 10, border: '1px solid #fde68a'
              }}>
                <label style={{ fontSize: 13, fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span>🚨 Arrear Exam Registration File (Year-Wise Mode):</span>
                </label>
                <p style={{ fontSize: 11, color: '#b45309', marginBottom: 10 }}>
                  Upload backlog/arrear registrations file for Year-Wise Mode (e.g. <code>Arrear Details_AM2026.xlsx</code>).
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="form-control"
                  style={{ maxWidth: 500, background: '#fff' }}
                  onChange={e => setArrearFile(e.target.files[0])}
                />
                {arrearFile && (
                  <div style={{ fontSize: 12, color: '#16a34a', marginTop: 8, fontWeight: 700 }}>
                    ✓ Arrear File Attached: {arrearFile.name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Holidays & Excluded Dates */}
          <div className="card">
            <h3 style={{ marginBottom: 6 }}>4. Government Holidays & Excluded Dates</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              Dates where no exams should be scheduled (e.g. Deepavali, Sundays, National Holidays).
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 12, maxWidth: 400 }}>
              <input
                type="date"
                className="form-control"
                style={{ fontSize: 12 }}
                value={holidayInput}
                onChange={e => setHolidayInput(e.target.value)}
              />
              <button type="button" className="btn btn-secondary" onClick={addHoliday}>
                Add Holiday
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {holidays.map(d => (
                <span key={d} className="badge badge-yellow" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}>
                  <span>📅 {d}</span>
                  <button
                    type="button"
                    onClick={() => removeHoliday(d)}
                    style={{ background: 'none', border: 'none', color: '#92400e', cursor: 'pointer', fontWeight: 800, padding: 0, fontSize: 12 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 5. Advanced Options */}
          <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <h3 style={{ marginBottom: 6, color: '#6d28d9' }}>5. Advanced Options</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
              Optional AI features. These do not affect scheduling accuracy — only the audit summary and Ollama integration.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div
                  onClick={() => setUseGroqAI(v => !v)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                    background: useGroqAI ? '#7c3aed' : '#cbd5e1',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: useGroqAI ? 22 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>🧠 Use Groq AI for Course Difficulty</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Calls Groq API to assess course difficulty. Falls back to rule-based heuristic if unavailable.</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div
                  onClick={() => setHumanIntervention(v => !v)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                    background: humanIntervention ? '#d97706' : '#cbd5e1',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: humanIntervention ? 22 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>👁️ Pause for Human Review Between Steps</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Pipeline pauses after each step so you can inspect and approve before the next agent runs.</div>
                </div>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ padding: '12px 28px', fontSize: 15, fontWeight: 700 }}
            >
              {submitting ? 'Initializing Pipeline...' : '🚀 Generate Exam Timetable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
