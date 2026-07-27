import { NavLink, useLocation } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'

const NAV = [
  { path: '/dashboard', label: 'Dashboard',      icon: '⊞' },
  { path: '/schedule',  label: 'New Schedule',   icon: '＋' },
  { path: '/agents',    label: 'Agent Pipeline', icon: '◈' },
  { path: '/timetable', label: 'Timetable',      icon: '▦' },
  { path: '/history',   label: 'Run History',    icon: '◷' },
  { path: '/settings',  label: 'Settings',       icon: '⚙' },
]

export default function Sidebar({ pipelineStatus, awaitingCount }) {
  const { connected } = useSocket()
  const location = useLocation()

  const statusDot = {
    idle:          { color: '#94a3b8', label: 'Idle' },
    running:       { color: '#1d4ed8', label: 'Running', pulse: true },
    done:          { color: '#16a34a', label: 'Complete' },
    failed:        { color: '#dc2626', label: 'Failed' },
    manual_review: { color: '#d97706', label: 'Needs Review' },
  }[pipelineStatus] || { color: '#94a3b8', label: 'Idle' }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div style={{ padding: '22px 20px 16px', borderBottom: '1.5px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, background: '#1d4ed8', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: '#fff', fontWeight: 800, flexShrink: 0,
          }}>E</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', lineHeight: 1.2 }}>Exam Cell</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>AI Scheduler</div>
          </div>
        </div>
      </div>

      {/* Pipeline status pill */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#f8fafc', borderRadius: 8, padding: '8px 12px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: statusDot.color,
            boxShadow: statusDot.pulse ? `0 0 0 0 ${statusDot.color}` : 'none',
            animation: statusDot.pulse ? 'pulse-ring 1.8s infinite' : 'none',
          }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>Pipeline</div>
            <div style={{ fontSize: 10, color: statusDot.color, fontWeight: 600 }}>{statusDot.label}</div>
          </div>
          {awaitingCount > 0 && (
            <div style={{
              marginLeft: 'auto', background: '#fef3c7', color: '#92400e',
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            }}>
              {awaitingCount} waiting
            </div>
          )}
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', padding: '4px 10px 8px' }}>
          Navigation
        </div>
        {NAV.map(({ path, label, icon }) => {
          const isActive = location.pathname.startsWith(path)
          return (
            <NavLink key={path} to={path} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                background: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? '#1d4ed8' : '#475569',
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.12s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{icon}</span>
                {label}
                {path === '/agents' && awaitingCount > 0 && (
                  <span style={{
                    marginLeft: 'auto', background: '#fef3c7', color: '#92400e',
                    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
                  }}>{awaitingCount}</span>
                )}
              </div>
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom: connection status */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#16a34a' : '#dc2626' }} />
          <span style={{ fontSize: 11, color: connected ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
            {connected ? 'Live connection' : 'Disconnected'}
          </span>
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Socket.io · Real-time</div>
      </div>
    </aside>
  )
}
