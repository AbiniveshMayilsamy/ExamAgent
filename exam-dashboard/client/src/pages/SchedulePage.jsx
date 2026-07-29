import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePipelineContext } from '../context/PipelineContext'

export default function SchedulePage() {
  const navigate = useNavigate()
  const { trigger } = usePipelineContext()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Semester Type State
  const [semType, setSemType] = useState('odd') // 'odd' | 'even'

  // Files & Start Dates per Year
  const [files, setFiles] = useState({ 1: null, 2: null, 3: null, 4: null })
  const [startDates, setStartDates] = useState({
    1: '2026-11-02',
    2: '2026-11-02',
    3: '2026-11-02',
    4: '2026-11-02',
  })
  const [arrearFile, setArrearFile] = useState(null)

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

    const hasRegularFile = Object.values(files).some(f => f !== null)
    if (!hasRegularFile && !arrearFile) {
      setError('Please upload at least one Regular Year Exam Map file or an Arrear Exam file.')
      setSubmitting(false)
      return
    }

    try {
      const fd = new FormData()
      fd.append('semType', semType)
      fd.append('startDates', JSON.stringify(startDates))
      fd.append('leaveDays', JSON.stringify(holidays))
      fd.append('useGroqAI', useGroqAI)
      fd.append('humanIntervention', humanIntervention)
      fd.append('yearSessionPattern', JSON.stringify({ 1: 'FN', 2: 'FN', 3: 'FN', 4: 'FN' }))

      // Append files
      Object.keys(files).forEach(yr => {
        if (files[yr]) {
          fd.append(`year_${yr}`, files[yr])
        }
      })

      if (arrearFile) {
        fd.append('arrear_file', arrearFile)
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
            Upload Multi-Year regular exam maps & arrear files for automated zero-conflict scheduling
          </p>
        </div>
      </div>

      <div className="page-body">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div className="alert alert-error">{error}</div>}

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
                  onChange={() => setSemType('odd')}
                />
                <span>Odd Semesters (Nov / Dec 2026 — Semesters 1, 3, 5, 7)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="radio"
                  name="semType"
                  value="even"
                  checked={semType === 'even'}
                  onChange={() => setSemType('even')}
                />
                <span>Even Semesters (Apr / May 2026 — Semesters 2, 4, 6, 8)</span>
              </label>
            </div>
          </div>

          {/* 2. Upload Regular Year Files & Set Start Dates */}
          <div className="card">
            <h3 style={{ marginBottom: 6 }}>2. Regular Stream Files & Exam Start Dates</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
              Upload Excel files for each year group and set the start date for their exams. All regular exams write in Morning (FN).
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

          {/* 3. Upload Arrear Exam File */}
          <div className="card">
            <h3 style={{ marginBottom: 6 }}>3. Arrear & Backlog Student Enrolments</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              Upload the consolidated arrear details Excel sheet. Arrear exams will be packed into Evening (AN) sessions to conclude exams as fast as possible.
            </p>

            <input
              type="file"
              accept=".xlsx,.xls"
              className="form-control"
              style={{ maxWidth: 400 }}
              onChange={e => setArrearFile(e.target.files[0])}
            />
            {arrearFile && (
              <div style={{ fontSize: 12, color: '#16a34a', marginTop: 6, fontWeight: 600 }}>
                ✓ Arrear File Attached: {arrearFile.name}
              </div>
            )}
          </div>

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
