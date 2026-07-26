import { useState, useEffect } from 'react'
import axios from 'axios'

export default function SettingsPage() {
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState('llama3')
  const [ollamaStatus, setOllamaStatus] = useState(null) // null | 'checking' | 'ok' | 'error'
  const [models, setModels] = useState([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('examcell_settings')
    if (stored) {
      const s = JSON.parse(stored)
      if (s.ollamaUrl) setOllamaUrl(s.ollamaUrl)
      if (s.ollamaModel) setOllamaModel(s.ollamaModel)
    }
  }, [])

  const testOllama = async () => {
    setOllamaStatus('checking')
    try {
      const resp = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 5000 })
      const modelList = resp.data?.models?.map(m => m.name) || []
      setModels(modelList)
      setOllamaStatus('ok')
    } catch {
      setOllamaStatus('error')
      setModels([])
    }
  }

  const saveSettings = async () => {
    localStorage.setItem('examcell_settings', JSON.stringify({ ollamaUrl, ollamaModel }))
    // Also update server env via API (if endpoint exists)
    try {
      await axios.post('/api/settings', { ollamaUrl, ollamaModel })
    } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p style={{ fontSize: 13, marginTop: 2 }}>Configure AI model, system preferences, and defaults</p>
        </div>
        <button className="btn btn-primary" onClick={saveSettings}>
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="page-body" style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Ollama Configuration */}
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Ollama AI Configuration</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            Ollama runs the local LLM that explains each agent's actions and generates timetable improvement suggestions.
            Make sure Ollama is running before generating a schedule.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Ollama Server URL</label>
              <input className="form-input" value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434" />
              <span className="form-hint">Default: http://localhost:11434 — change only if Ollama runs on a different port</span>
            </div>

            <div className="form-group">
              <label className="form-label">Model Name</label>
              {models.length > 0 ? (
                <select className="form-select" value={ollamaModel} onChange={e => setOllamaModel(e.target.value)}>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input className="form-input" value={ollamaModel} onChange={e => setOllamaModel(e.target.value)}
                  placeholder="llama3" />
              )}
              <span className="form-hint">Recommended: llama3 or llama3.1 · Run "ollama pull llama3" to download</span>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={testOllama} disabled={ollamaStatus === 'checking'}>
                {ollamaStatus === 'checking' ? 'Testing...' : 'Test Connection'}
              </button>
              {ollamaStatus === 'ok' && (
                <div className="alert alert-success" style={{ padding: '6px 12px', fontSize: 12 }}>
                  Connected — {models.length} model{models.length !== 1 ? 's' : ''} available
                </div>
              )}
              {ollamaStatus === 'error' && (
                <div className="alert alert-error" style={{ padding: '6px 12px', fontSize: 12 }}>
                  Cannot connect. Is Ollama running?
                </div>
              )}
            </div>

            {ollamaStatus === 'error' && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>How to start Ollama:</div>
                <div className="log-box" style={{ height: 'auto', padding: '8px 12px' }}>
                  <div>$ ollama serve</div>
                  <div style={{ color: '#94a3b8', marginTop: 4 }}># In another terminal:</div>
                  <div>$ ollama pull llama3</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* About */}
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>About This System</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'System', value: 'Exam Cell AI Scheduler' },
              { label: 'Agents', value: '6 AI agents (Calendar, Matcher, Harmonizer, Spacing, Arrear, Validator)' },
              { label: 'Rules Covered', value: '13 exam scheduling rules' },
              { label: 'Backend', value: 'Node.js + Python + MongoDB + Socket.io' },
              { label: 'AI Engine', value: 'Ollama (local LLM — no data leaves your server)' },
              { label: 'Data Privacy', value: 'All student data stays on your local machine' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                <span style={{ width: 120, color: '#64748b', fontWeight: 600, flexShrink: 0 }}>{label}</span>
                <span style={{ color: '#0f172a' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rules reference */}
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Scheduling Rules Reference</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              [1,  'Minimum 1-day gap between regular exams (Mon → Wed pattern)'],
              [2,  'Arrear exams: 2 per day, consecutive days, no gap required'],
              [3,  'Schedule window: Nov–Dec (odd sem), Apr–May (even sem)'],
              [4,  'Exam timings: FN = 9:30–12:30, AN = 1:30–4:30'],
              [5,  'Government holidays are excluded from the exam calendar'],
              [6,  'Each agent shows statistics and function type'],
              [7,  'Schedule output is dept-wise with roll number ranges'],
              [8,  'Number of exams per branch is configurable'],
              [9,  'Credit-based exams: 4+ credits treated as hard (extra gap)'],
              [10, 'Year-wise session pattern is configurable per exam cycle'],
              [11, 'Common exams across branches scheduled in same session'],
              [12, 'Human intervention: review/modify each agent output before next runs'],
              [13, 'Arrear exams also follow the year-wise session pattern'],
            ].map(([num, text]) => (
              <div key={num} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: '#f8fafc', borderRadius: 6 }}>
                <span style={{ background: '#1d4ed8', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: 1 }}>
                  Rule {num}
                </span>
                <span style={{ fontSize: 13, color: '#334155' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
