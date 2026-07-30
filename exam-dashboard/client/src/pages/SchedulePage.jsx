import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePipelineContext } from '../context/PipelineContext'

export default function SchedulePage() {
  const navigate = useNavigate()
  const { trigger } = usePipelineContext()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Mode & Semester Type State
  const [inputMode, setInputMode] = useState('single') // 'single' | '2file' | 'split'
  const [semType, setSemType] = useState('odd') // 'odd' | 'even'

  // Files & Start Dates (Odd sem -> 2026-11-02 Nov/Dec, Even sem -> 2026-04-20 Apr/May)
  const [masterFile, setMasterFile] = useState(null)
  const [regularFile, setRegularFile] = useState(null)
  const [arrearFile, setArrearFile] = useState(null)
  const [startDate, setStartDate] = useState('2026-11-02')

  // Split Year Files & Start Dates
  const [files, setFiles] = useState({ 1: null, 2: null, 3: null, 4: null })
  const [startDates, setStartDates] = useState({
    1: '2026-11-02',
    2: '2026-11-02',
    3: '2026-11-02',
    4: '2026-11-02',
  })

  // Holidays
  const [holidayInput, setHolidayInput] = useState('')
  const [holidays, setHolidays] = useState(['2026-11-10', '2026-11-15'])

  // Options
  const [useGroqAI, setUseGroqAI] = useState(true)
  const [humanIntervention, setHumanIntervention] = useState(false)

  const yearSemLabels = {
    odd: { 1: 'I Year (Semester 1)', 2: 'II Year (Semester 3)', 3: 'III Year (Semester 5)', 4: 'IV Year (Semester 7)' },
    even: { 1: 'I Year (Semester 2)', 2: 'II Year (Semester 4)', 3: 'III Year (Semester 6)', 4: 'IV Year (Semester 8)' }
  }

  const handleSemTypeChange = (newSemType) => {
    setSemType(newSemType)
    const defaultDate = newSemType === 'odd' ? '2026-11-02' : '2026-04-20'
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

    if (inputMode === 'single') {
      if (!masterFile) {
        setError('Please upload your Single Master Registration file (e.g. Regular_All Courses.xlsx).')
        setSubmitting(false)
        return
      }
    } else if (inputMode === '2file') {
      if (!regularFile && !arrearFile) {
        setError('Please upload at least the Regular Courses file or Arrear file.')
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
      fd.append('leaveDays', JSON.stringify(holidays))
      fd.append('useGroqAI', useGroqAI)
      fd.append('humanIntervention', humanIntervention)
      fd.append('yearSessionPattern', JSON.stringify({ 1: 'FN', 2: 'FN', 3: 'FN', 4: 'FN' }))

      if (inputMode === 'single') {
        fd.append('regular_file', masterFile)
        fd.append('startDates', JSON.stringify({ 1: startDate, 2: startDate, 3: startDate, 4: startDate }))
      } else if (inputMode === '2file') {
        if (regularFile) fd.append('regular_file', regularFile)
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
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className={`btn ${inputMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setInputMode('single')}
              style={{ fontWeight: 700 }}
            >
              ⚡ Single File Mode (1 File Upload)
            </button>
            <button
              type="button"
              className={`btn ${inputMode === '2file' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setInputMode('2file')}
              style={{ fontWeight: 700 }}
            >
              📁 2-File Mode (Regular + Arrear)
            </button>
            <button
              type="button"
              className={`btn ${inputMode === 'split' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setInputMode('split')}
              style={{ fontWeight: 700 }}
            >
              🗂️ Year-wise Split Files
            </button>
          </div>

          {/* 1. Exam Season / Semester Type */}
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>1. Select Examination Season</h3>
            <div style={{ display: 'flex', gap: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="radio"
                  name="semType"
                  value="odd"
                  checked={semType === 'odd'}
                  onChange={() => handleSemTypeChange('odd')}
                />
                <span>Odd Semesters (Nov / Dec 2026 — Semesters 1, 3, 5, 7)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
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

          {/* 2. File Upload Cards depending on mode */}
          {inputMode === 'single' ? (
            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
              <h3 style={{ marginBottom: 6, color: '#047857' }}>2. Master Registration File (1 File Mode)</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                Upload your single master registration file containing all student-course registrations (e.g. <code>Regular_All Courses.xlsx</code>).
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'center' }}>
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
            </div>
          ) : inputMode === '2file' ? (
            <div className="card">
              <h3 style={{ marginBottom: 6 }}>2. Regular & Arrear Input Files</h3>
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
          ) : (
            <div className="card">
              <h3 style={{ marginBottom: 6 }}>2. Regular Stream Files & Exam Start Dates</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                Upload Excel files for each year group and set the start date for their exams.
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
            </div>
          )}

          {/* 3. Holidays & Excluded Dates */}
          <div className="card">
            <h3 style={{ marginBottom: 6 }}>3. Government Holidays & Excluded Dates</h3>
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

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ padding: '12px 28px', fontSize: 15, fontWeight: 700 }}
            >
              {submitting ? 'Initializing Multi-Agent System...' : '🚀 Launch Multi-Agent Scheduling Pipeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
