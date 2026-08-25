import { NavLink, useLocation } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'
import logoEshwar from '../assets/logo_eshwar.png'

const NAV = [
  { path: '/dashboard', label: 'Dashboard',      icon: '⊞' },
  { path: '/schedule',  label: 'New Schedule',   icon: '＋' },
  { path: '/agents',    label: 'Agent Pipeline', icon: '◈' },
  { path: '/timetable', label: 'Timetable',      icon: '▦' },
  { path: '/students',  label: 'Hall Tickets',   icon: '🎟️' },
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
      {/* Top Header Row (Brand + Status on Mobile) */}
      <div className="sidebar-header-row" style={{ padding: '16px 20px 14px', borderBottom: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={logoEshwar}
            alt="Sri Eshwar Logo"
            style={{ height: 32, maxWidth: 140, objectFit: 'contain' }}
          />
        </div>
        <div className="sidebar-status-box-mobile" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '4px 8px', borderRadius: 20, border: '1px solid #e2e8f0' }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: statusDot.color,
            boxShadow: statusDot.pulse ? `0 0 0 0 ${statusDot.color}` : 'none',
            animation: statusDot.pulse ? 'pulse-ring 1.8s infinite' : 'none',
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: statusDot.color }}>{statusDot.label}</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="sidebar-nav-list" style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div className="sidebar-nav-title" style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', padding: '4px 10px 8px' }}>
          Navigation
        </div>
        {NAV.map(({ path, label, icon }) => {
          const isActive = location.pathname.startsWith(path)
          return (
            <NavLink key={path} to={path} style={{ textDecoration: 'none' }}>
              <div className="sidebar-nav-item" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 12px', borderRadius: 8,
                background: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? '#1d4ed8' : '#475569',
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.12s',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
                <span>{label}</span>
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
      <div className="sidebar-footer-row" style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
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
