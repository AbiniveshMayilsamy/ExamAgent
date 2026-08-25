import { useState } from 'react'

export default function TriggerForm({ onTrigger, disabled }) {
  const [inputMode, setInputMode] = useState('2file') // '2file' | 'single' | 'split'
  const [semType, setSemType] = useState('odd') // 'odd' | 'even'
  
  const [patternType, setPatternType] = useState('alternating') // 'alternating' | 'semester_wise'
  
  // Input Files & Start Dates (Odd sem -> 2026-11-02 Nov/Dec, Even sem -> 2026-04-20 Apr/May)
  const [masterFile, setMasterFile] = useState(null)
  const [regularFile, setRegularFile] = useState(null)
  const [arrearFile, setArrearFile] = useState(null)
  const [startDate, setStartDate] = useState('2026-11-02')

  // Legacy Split Year Files & Start Dates
  const [files, setFiles] = useState({ 1: null, 2: null, 3: null, 4: null })
  const [startDates, setStartDates] = useState({ 1: '2026-11-02', 2: '2026-11-02', 3: '2026-11-02', 4: '2026-11-02' })
  
  const [leaveDays, setLeaveDays] = useState('')
  const [useGroqAI, setUseGroqAI] = useState(true)
  const [humanIntervention, setHumanIntervention] = useState(false)
  const [error, setError] = useState('')

  const handleSemTypeChange = (newSemType) => {
    setSemType(newSemType)
    const defaultDate = newSemType === 'odd' ? '2026-11-02' : '2026-04-20'
    setStartDate(defaultDate)
    setStartDates({ 1: defaultDate, 2: defaultDate, 3: defaultDate, 4: defaultDate })
  }

  const handleFileChange = (year, file) => {
    setFiles(prev => ({ ...prev, [year]: file }))
  }

  const handleStartDateChange = (year, dateVal) => {
    setStartDates(prev => ({ ...prev, [year]: dateVal }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (inputMode === '2file') {
      if (!regularFile && !arrearFile) {
        setError('Please upload at least the Regular Courses file or Arrear file.')
        return
      }
    } else if (inputMode === 'single') {
      if (!masterFile) {
        setError('Please upload your Single Master Registration file (e.g. Regular_All Courses.xlsx).')
        return
      }
    } else {
      const hasYearFile = Object.values(files).some(f => f !== null)
      if (!hasYearFile && !arrearFile) {
        setError('Please upload at least one Regular Year Exam Map file or an Arrear Exam file.')
        return
      }
    }

    const leaves = leaveDays.split(',').map(d => d.trim()).filter(Boolean)
    const fd = new FormData()
    
    fd.append('semType', semType)
    fd.append('patternType', patternType)
    fd.append('leaveDays', JSON.stringify(leaves))
    fd.append('useGroqAI', useGroqAI)
    fd.append('humanIntervention', humanIntervention)

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
      {/* Input Mode Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <button
          type="button"
          onClick={() => setInputMode('2file')}
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
            background: inputMode === '2file' ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : '#1e293b',
            color: inputMode === '2file' ? '#fff' : '#94a3b8'
          }}
        >
          📁 2-File Mode (Regular + Arrear)
        </button>
        <button
          type="button"
          onClick={() => setInputMode('single')}
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
            background: inputMode === 'single' ? 'linear-gradient(135deg, #10b981, #059669)' : '#1e293b',
            color: inputMode === 'single' ? '#fff' : '#94a3b8'
          }}
        >
          ⚡ Single File Mode (1 File)
        </button>
        <button
          type="button"
          onClick={() => setInputMode('split')}
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
            background: inputMode === 'split' ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : '#1e293b',
            color: inputMode === 'split' ? '#fff' : '#94a3b8'
          }}
        >
          🗂️ Split Year Files
        </button>
      </div>

      {/* Schedule Pattern Toggle Switch */}
      <div style={{ background: '#0f172a', padding: 12, borderRadius: 8, border: '1px solid #3b82f6' }}>
        <label style={{ ...lbl, color: '#60a5fa', fontWeight: 700, fontSize: 13 }}>🔀 Schedule Pattern Type</label>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => setPatternType('alternating')}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 8, fontSize: 12, textAlign: 'left',
              border: patternType === 'alternating' ? '2px solid #3b82f6' : '1px solid #334155',
              background: patternType === 'alternating' ? '#1e293b' : '#090d16',
              color: patternType === 'alternating' ? '#f8fafc' : '#94a3b8', cursor: 'pointer'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: patternType === 'alternating' ? '#60a5fa' : '#cbd5e1' }}>
              🔄 Alternating Cycle Pattern
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
              Day 1 FN (Sem 3), Day 1 AN (Sem 5), Day 2 FN (Sem 7), Day 2 AN (Arrear Sweep)
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPatternType('semester_wise')}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 8, fontSize: 12, textAlign: 'left',
              border: patternType === 'semester_wise' ? '2px solid #8b5cf6' : '1px solid #334155',
              background: patternType === 'semester_wise' ? '#2e1065' : '#090d16',
              color: patternType === 'semester_wise' ? '#f8fafc' : '#94a3b8', cursor: 'pointer'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: patternType === 'semester_wise' ? '#c084fc' : '#cbd5e1' }}>
              📅 Semester-Dedicated Daily Pattern
            </div>
            <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 3 }}>
              Day 1: Sem 3 FN + Arrear AN | Day 2: Sem 5 FN + Arrear AN | Day 3: Sem 7 FN + Arrear AN
            </div>
          </button>
        </div>
      </div>

      {/* Semester Type Selector */}
      <div style={{ background: '#0f172a', padding: 12, borderRadius: 8, border: '1px solid #334155' }}>
        <label style={{ ...lbl, color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>Semester Type</label>
        <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f8fafc', cursor: 'pointer', fontSize: 13 }}>
            <input type="radio" name="semType" value="odd" checked={semType === 'odd'} onChange={() => handleSemTypeChange('odd')} style={{ accentColor: '#3b82f6' }} />
            Odd Semesters (Nov / Dec 2026 — Sem 1, 3, 5, 7)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f8fafc', cursor: 'pointer', fontSize: 13 }}>
            <input type="radio" name="semType" value="even" checked={semType === 'even'} onChange={() => handleSemTypeChange('even')} style={{ accentColor: '#3b82f6' }} />
            Even Semesters (Apr / May 2026 — Sem 2, 4, 6, 8)
          </label>
        </div>
      </div>

      {/* Upload Inputs depending on mode */}
      {inputMode === '2file' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: '#1e293b', padding: 12, borderRadius: 8, border: '1px solid #334155' }}>
            <label style={{ ...lbl, color: '#60a5fa', fontWeight: 600 }}>📗 Regular Courses File (e.g. Regular_All Courses.xlsx)</label>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setRegularFile(e.target.files[0])} style={{ ...inp, padding: '5px' }} />
          </div>

          <div style={{ background: '#1e293b', padding: 12, borderRadius: 8, border: '1px solid #334155' }}>
            <label style={{ ...lbl, color: '#f87171', fontWeight: 600 }}>🚨 Arrear Exam File (e.g. Arrear Details_AM2026.xlsx)</label>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setArrearFile(e.target.files[0])} style={{ ...inp, padding: '5px' }} />
          </div>

          <div style={{ background: '#1e293b', padding: 12, borderRadius: 8, border: '1px solid #334155' }}>
            <label style={{ ...lbl, color: '#e2e8f0', fontWeight: 600 }}>📅 Exam Window Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inp} />
          </div>
        </div>
      ) : inputMode === 'single' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: '#1e293b', padding: 14, borderRadius: 8, border: '1px solid #10b981' }}>
            <label style={{ ...lbl, color: '#34d399', fontWeight: 700, fontSize: 13 }}>📗 Master Registration Excel File (e.g. Regular_All Courses.xlsx)</label>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setMasterFile(e.target.files[0])} style={{ ...inp, padding: '6px' }} />
          </div>

          <div style={{ background: '#1e293b', padding: 12, borderRadius: 8, border: '1px solid #334155' }}>
            <label style={{ ...lbl, color: '#f87171', fontWeight: 600 }}>🚨 Arrear Exam Details File (Optional)</label>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setArrearFile(e.target.files[0])} style={{ ...inp, padding: '5px' }} />
          </div>

          <div style={{ background: '#1e293b', padding: 12, borderRadius: 8, border: '1px solid #334155' }}>
            <label style={{ ...lbl, color: '#e2e8f0', fontWeight: 600 }}>📅 Exam Window Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inp} />
          </div>
        </div>
      ) : (
        /* Split Year Files */
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
          <div style={{ background: '#1e293b', padding: 12, borderRadius: 8, border: '2px dashed #f59e0b' }}>
            <label style={{ ...lbl, color: '#fbbf24', fontWeight: 700, fontSize: 13 }}>🚨 Arrear Exam Details File (Year-Wise Mode — e.g. Arrear Details_AM2026.xlsx)</label>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setArrearFile(e.target.files[0])} style={{ ...inp, padding: '5px' }} />
            {arrearFile && <div style={{ fontSize: 11, color: '#34d399', marginTop: 4, fontWeight: 700 }}>✓ Attached Arrear File: {arrearFile.name}</div>}
          </div>
        </div>
      )}

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
