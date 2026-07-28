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
          <p style={{ fontSize: 13, marginTop: 4, color: '#64748b' }}>
            Upload year-wise regular exam maps and optional arrear data to generate a clash-free timetable.
          </p>
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 840 }}>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* 1. Semester Type Selector */}
          <div className="card" style={{ padding: 22 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              1. Select Semester Type
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Choose whether you are scheduling Odd or Even semester examinations.
            </p>
            <div style={{ display: 'flex', gap: 14 }}>
              {[
                ['odd', 'Odd Semesters (Semesters 1, 3, 5, 7)'],
                ['even', 'Even Semesters (Semesters 2, 4, 6, 8)']
              ].map(([val, lbl]) => (
                <div key={val} onClick={() => setSemType(val)} style={{
                  flex: 1, padding: '16px 20px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${semType === val ? '#1d4ed8' : '#e2e8f0'}`,
                  background: semType === val ? '#eff6ff' : '#ffffff',
                  fontWeight: semType === val ? 700 : 500,
                  color: semType === val ? '#1d4ed8' : '#334155',
                  fontSize: 14, transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <input type="radio" name="semType" checked={semType === val} onChange={() => {}} style={{ accentColor: '#1d4ed8' }} />
                  {lbl}
                </div>
              ))}
            </div>
          </div>

          {/* 2. Year-wise Regular Exam Maps & Start Dates */}
          <div className="card" style={{ padding: 22 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              2. Year-Wise Regular Exam Maps & Start Dates
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Upload dataset files for any year(s) you wish to schedule. Start dates can be set individually per year.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[1, 2, 3, 4].map(yr => (
                <div key={yr} style={{
                  display: 'grid', gridTemplateColumns: '1fr 200px', gap: 14,
                  padding: 16, borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc'
                }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, color: '#1e293b' }}>
                      📁 {yearSemLabels[semType][yr]} File (Optional)
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={e => handleFileChange(yr, e.target.files[0])}
                      className="form-input"
                      style={{ padding: '6px 10px', background: '#ffffff', cursor: 'pointer' }}
                    />
                    {files[yr] && (
                      <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, marginTop: 4, display: 'inline-block' }}>
                        ✓ {files[yr].name} ({(files[yr].size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>📅 Start Date</label>
                    <input
                      type="date"
                      value={startDates[yr]}
                      onChange={e => handleStartDateChange(yr, e.target.value)}
                      className="form-input"
                      style={{ background: '#ffffff' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Arrear Exam Dataset */}
          <div className="card" style={{ padding: 22 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              3. Arrear / Backlog Exam Data (Optional)
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
              Upload arrear backlog entries. Student names will be auto-filled from the master roster using Reg No.
            </p>
            <div className="form-group">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => setArrearFile(e.target.files[0])}
                className="form-input"
                style={{ padding: '8px 12px', background: '#f8fafc', cursor: 'pointer' }}
              />
              {arrearFile && (
                <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, marginTop: 4, display: 'inline-block' }}>
                  ✓ Arrear File Attached: {arrearFile.name}
                </span>
              )}
            </div>
          </div>

          {/* 4. Government Holidays / Leave Days */}
          <div className="card" style={{ padding: 22 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              4. Government Holidays & Leave Days
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
              No exams will be scheduled on these dates.
            </p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input
                type="date"
                className="form-input"
                value={holidayInput}
                onChange={e => setHolidayInput(e.target.value)}
                style={{ width: 220 }}
              />
              <button type="button" className="btn btn-secondary" onClick={addHoliday}>
                + Add Leave Date
              </button>
            </div>
            {holidays.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {holidays.map(d => (
                  <span key={d} className="badge badge-blue" style={{ fontSize: 13, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    📅 {d}
                    <button type="button" onClick={() => removeHoliday(d)} style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontWeight: 700 }}>×</button>
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: '#94a3b8' }}>No leave days added yet.</span>
            )}
          </div>

          {/* 5. Groq AI & Pipeline Settings */}
          <div className="card" style={{ padding: 22 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              5. AI Intelligence & Execution Options
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useGroqAI}
                  onChange={e => setUseGroqAI(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#1d4ed8' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>🤖 Enable Groq AI Course Difficulty & Summary Generation</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Uses LLM to assess subject difficulty and summarize timetable metrics</div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={humanIntervention}
                  onChange={e => setHumanIntervention(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#1d4ed8' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>Enable Human Review / Interventions</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Pauses execution after each agent step for manual review and overrides</div>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{
              padding: '16px', fontSize: 16, fontWeight: 700, borderRadius: 10,
              background: submitting ? '#94a3b8' : 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
              border: 'none', cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? '⟳ Scheduling Exam Pipeline...' : '🚀 Generate Exam Schedule'}
          </button>
        </form>
      </div>
    </div>
  )
}
