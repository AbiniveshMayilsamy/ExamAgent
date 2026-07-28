import { useState } from 'react'

export default function TriggerForm({ onTrigger, disabled }) {
  const [semType, setSemType] = useState('odd') // 'odd' | 'even'
  
  // Year Files & Start Dates
  const [files, setFiles] = useState({ 1: null, 2: null, 3: null, 4: null })
  const [startDates, setStartDates] = useState({ 1: '2026-11-02', 2: '2026-11-02', 3: '2026-11-02', 4: '2026-11-02' })
  const [arrearFile, setArrearFile] = useState(null)
  
  const [leaveDays, setLeaveDays] = useState('')
  const [useGroqAI, setUseGroqAI] = useState(true)
  const [humanIntervention, setHumanIntervention] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (year, file) => {
    setFiles(prev => ({ ...prev, [year]: file }))
  }

  const handleStartDateChange = (year, dateVal) => {
    setStartDates(prev => ({ ...prev, [year]: dateVal }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Ensure at least 1 file is selected
    const hasYearFile = Object.values(files).some(f => f !== null)
    if (!hasYearFile && !arrearFile) {
      setError('Please upload at least one Regular Year Exam Map file or an Arrear Exam file.')
      return
    }

    const leaves = leaveDays.split(',').map(d => d.trim()).filter(Boolean)
    const fd = new FormData()
    
    fd.append('semType', semType)
    fd.append('leaveDays', JSON.stringify(leaves))
    fd.append('useGroqAI', useGroqAI)
    fd.append('humanIntervention', humanIntervention)
    fd.append('startDates', JSON.stringify(startDates))

    // Append Year files
    Object.keys(files).forEach(yr => {
      if (files[yr]) {
        fd.append(`year_${yr}`, files[yr])
      }
    })

    if (arrearFile) {
      fd.append('arrear_file', arrearFile)
    }

    try {
      await onTrigger(fd)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start exam scheduling pipeline.')
    }
  }

  const inp = {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
    color: '#f1f5f9', padding: '8px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box',
  }
  const lbl = { color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }

  const yearSemLabels = {
    odd: { 1: 'I Year (Semester 1)', 2: 'II Year (Semester 3)', 3: 'III Year (Semester 5)', 4: 'IV Year (Semester 7)' },
    even: { 1: 'I Year (Semester 2)', 2: 'II Year (Semester 4)', 3: 'III Year (Semester 6)', 4: 'IV Year (Semester 8)' }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Semester Type Selector */}
      <div style={{ background: '#0f172a', padding: 12, borderRadius: 8, border: '1px solid #334155' }}>
        <label style={{ ...lbl, color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>Semester Type</label>
        <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f8fafc', cursor: 'pointer', fontSize: 13 }}>
            <input type="radio" name="semType" value="odd" checked={semType === 'odd'} onChange={() => setSemType('odd')} style={{ accentColor: '#3b82f6' }} />
            Odd Semesters (Sem 1, 3, 5, 7)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f8fafc', cursor: 'pointer', fontSize: 13 }}>
            <input type="radio" name="semType" value="even" checked={semType === 'even'} onChange={() => setSemType('even')} style={{ accentColor: '#3b82f6' }} />
            Even Semesters (Sem 2, 4, 6, 8)
          </label>
        </div>
      </div>

      {/* Year-wise File Inputs & Start Dates */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3, 4].map(yr => (
          <div key={yr} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, background: '#1e293b', padding: 10, borderRadius: 8, border: '1px solid #334155' }}>
            <div>
              <label style={lbl}>📁 {yearSemLabels[semType][yr]} File (Optional)</label>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={e => handleFileChange(yr, e.target.files[0])} style={{ ...inp, padding: '5px' }} />
            </div>
            <div>
              <label style={lbl}>📅 Start Date</label>
              <input type="date" value={startDates[yr]} onChange={e => handleStartDateChange(yr, e.target.value)} style={inp} />
            </div>
          </div>
        ))}
      </div>

      {/* Arrear Exam File */}
      <div style={{ background: '#1e293b', padding: 10, borderRadius: 8, border: '1px solid #334155' }}>
        <label style={lbl}>🚨 Arrear Exam File (Optional .xlsx, .csv)</label>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setArrearFile(e.target.files[0])} style={{ ...inp, padding: '5px' }} />
      </div>

      {/* Holidays / Leave Days */}
      <div>
        <label style={lbl}>📅 Government Holidays / Leave Days (YYYY-MM-DD, comma-separated)</label>
        <input type="text" placeholder="2026-11-10, 2026-11-15, 2026-11-26" value={leaveDays} onChange={e => setLeaveDays(e.target.value)} style={inp} />
      </div>

      {/* Groq AI Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#0f172a', padding: 10, borderRadius: 8, border: '1px solid #334155' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={useGroqAI} onChange={e => setUseGroqAI(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#2563eb' }} />
          <span style={{ color: '#e2e8f0', fontSize: 13 }}>🤖 Enable Groq AI Course Difficulty & Summary Generation</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={humanIntervention} onChange={e => setHumanIntervention(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#2563eb' }} />
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Pause after each agent step for manual review / override</span>
        </label>
      </div>

      {error && <div style={{ color: '#f87171', fontSize: 12, padding: '6px 10px', background: '#450a0a', borderRadius: 6 }}>{error}</div>}

      <button type="submit" disabled={disabled} style={{
        background: disabled ? '#1e293b' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
        color: disabled ? '#475569' : '#fff',
        border: 'none', borderRadius: 8, padding: '12px',
        fontSize: 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
        {disabled ? '⟳ Scheduling Pipeline Running...' : '🚀 Generate Exam Schedule'}
      </button>
    </form>
  )
}
