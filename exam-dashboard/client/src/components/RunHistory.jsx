import { useEffect, useState } from 'react'
import axios from 'axios'

const STATUS_COLOR = {
  running: '#16a34a', done: '#2563eb',
  failed: '#dc2626', manual_review: '#d97706',
}

export default function RunHistory({ onSelect }) {
  const [runs, setRuns] = useState([])

  useEffect(() => {
    axios.get('/api/runs').then(r => setRuns(r.data)).catch(() => {})
    const interval = setInterval(() => {
      axios.get('/api/runs').then(r => setRuns(r.data)).catch(() => {})
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  if (runs.length === 0) return (
    <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: 20 }}>
      No runs yet
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {runs.map(run => (
        <div key={run._id} onClick={() => onSelect(run._id)}
          style={{
            background: '#1e293b', borderRadius: 8, padding: '10px 14px',
            cursor: 'pointer', border: '1px solid #334155',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 600 }}>
              {run.inputFile || 'Unknown file'}
            </span>
            <span style={{
              background: STATUS_COLOR[run.status] || '#475569',
              color: '#fff', fontSize: 10, padding: '2px 8px',
              borderRadius: 20, fontWeight: 700,
            }}>{run.status?.toUpperCase()}</span>
          </div>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
            {new Date(run.startedAt).toLocaleString()} ·{' '}
            {run.totalExams ?? '?'} exams · {run.totalArrears ?? '?'} arrears ·{' '}
            <span style={{ color: run.conflictsFound ? '#f87171' : '#4ade80' }}>
              {run.conflictsFound ?? '?'} conflicts
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
