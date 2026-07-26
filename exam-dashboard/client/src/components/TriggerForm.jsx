import { useState } from 'react'

const DEFAULT_DIFFICULTY = JSON.stringify({
  CS301: 'hard', CS302: 'hard', MA101: 'medium',
  EC301: 'medium', EC302: 'easy', ME301: 'hard',
}, null, 2)

const DEFAULT_YEAR_PATTERN = JSON.stringify({
  1: 'FN', 2: 'FN', 3: 'FN', 4: 'AN',
}, null, 2)

const DEFAULT_EXAMS_PER_BRANCH = JSON.stringify({
  CS: 12, IT: 12, CB: 10, AM: 10, EC: 12, EE: 12, ME: 10, CV: 10,
}, null, 2)

export default function TriggerForm({ onTrigger, disabled }) {
  const [file, setFile] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [leaveDays, setLeaveDays] = useState('')
  const [difficultyRaw, setDifficultyRaw] = useState(DEFAULT_DIFFICULTY)
  const [yearPatternRaw, setYearPatternRaw] = useState(DEFAULT_YEAR_PATTERN)
  const [examsPerBranchRaw, setExamsPerBranchRaw] = useState(DEFAULT_EXAMS_PER_BRANCH)
  const [humanIntervention, setHumanIntervention] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!file || !startDate || !endDate) {
      setError('File, start date and end date are required.')
      return
    }
    let difficultyMap = {}, yearSessionPattern = {}, examsPerBranch = {}
    try { difficultyMap = JSON.parse(difficultyRaw) } catch { setError('Difficulty map: invalid JSON.'); return }
    try { yearSessionPattern = JSON.parse(yearPatternRaw) } catch { setError('Year-session pattern: invalid JSON.'); return }
    try { examsPerBranch = JSON.parse(examsPerBranchRaw) } catch { setError('Exams-per-branch: invalid JSON.'); return }

    const leaves = leaveDays.split(',').map(d => d.trim()).filter(Boolean)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('startDate', startDate)
    fd.append('endDate', endDate)
    fd.append('leaveDays', JSON.stringify(leaves))
    fd.append('difficultyMap', JSON.stringify(difficultyMap))
    fd.append('yearSessionPattern', JSON.stringify(yearSessionPattern))
    fd.append('examsPerBranch', JSON.stringify(examsPerBranch))
    fd.append('humanIntervention', humanIntervention)
    try {
      await onTrigger(fd)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start pipeline.')
    }
  }

  const inp = {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
    color: '#f1f5f9', padding: '8px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box',
  }
  const lbl = { color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }
  const ta = { ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={lbl}>Student Data (CSV / JSON)</label>
        <input type="file" accept=".csv,.json" onChange={e => setFile(e.target.files[0])}
          style={{ ...inp, padding: '6px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={lbl}>Exam Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Exam End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inp} />
        </div>
      </div>

      <div>
        <label style={lbl}>Govt Holidays / Leave Days (YYYY-MM-DD, comma-separated)</label>
        <input type="text" placeholder="2026-11-10, 2026-11-15"
          value={leaveDays} onChange={e => setLeaveDays(e.target.value)} style={inp} />
      </div>

      {/* Advanced toggle */}
      <button type="button" onClick={() => setAdvanced(v => !v)} style={{
        background: 'none', border: '1px solid #334155', borderRadius: 6,
        color: '#64748b', fontSize: 12, padding: '6px 10px', cursor: 'pointer', textAlign: 'left',
      }}>
        {advanced ? '▲' : '▼'} Advanced Settings
      </button>

      {advanced && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={lbl}>Year-Session Pattern (year → "FN" | "AN")</label>
            <textarea value={yearPatternRaw} onChange={e => setYearPatternRaw(e.target.value)}
              rows={5} style={ta} />
            <div style={{ color: '#475569', fontSize: 10, marginTop: 3 }}>
              1=1st yr, 2=2nd yr, 3=3rd yr, 4=final yr · FN=9:30–12:30, AN=1:30–4:30
            </div>
          </div>

          <div>
            <label style={lbl}>Exams Per Branch (branch → max count)</label>
            <textarea value={examsPerBranchRaw} onChange={e => setExamsPerBranchRaw(e.target.value)}
              rows={4} style={ta} />
          </div>

          <div>
            <label style={lbl}>Course Difficulty Map (JSON) — credits ≥ 4 auto-treated as hard</label>
            <textarea value={difficultyRaw} onChange={e => setDifficultyRaw(e.target.value)}
              rows={5} style={ta} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={humanIntervention}
              onChange={e => setHumanIntervention(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#2563eb' }} />
            <span style={{ color: '#94a3b8', fontSize: 12 }}>
              Human Intervention — pause after each agent for review/override
            </span>
          </label>
        </div>
      )}

      {error && <div style={{ color: '#f87171', fontSize: 12 }}>{error}</div>}

      <button type="submit" disabled={disabled} style={{
        background: disabled ? '#1e293b' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
        color: disabled ? '#475569' : '#fff',
        border: 'none', borderRadius: 8, padding: '12px',
        fontSize: 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
        {disabled ? '⟳ Pipeline Running...' : '🚀 Generate Timetable'}
      </button>
    </form>
  )
}
