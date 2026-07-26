export default function AISuggestions({ text, auditLog }) {
  if (!text && (!auditLog || auditLog.length === 0)) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {text && (
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b, #0f172a)',
          border: '1px solid #4338ca',
          borderRadius: 12,
          padding: '16px 20px',
        }}>
          <div style={{ color: '#818cf8', fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
            🤖 AI Suggestions
          </div>
          <div style={{ color: '#c7d2fe', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
            {text}
          </div>
        </div>
      )}

      {auditLog && auditLog.length > 0 && (
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 12,
          padding: '16px 20px',
        }}>
          <div style={{ color: '#64748b', fontWeight: 700, marginBottom: 10, fontSize: 13 }}>
            📋 Audit Log
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {auditLog.map((line, i) => (
              <div key={i} style={{
                color: '#94a3b8', fontSize: 12, fontFamily: 'monospace',
                paddingLeft: 12, borderLeft: '2px solid #334155',
              }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
