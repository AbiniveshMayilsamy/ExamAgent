import React from 'react'
import { useNavigate } from 'react-router-dom'
import { usePipelineContext } from '../context/PipelineContext'

export default function SDIHeroLanding({ onSwitchToDashboard }) {
  const navigate = useNavigate()
  const goToDashboard = () => onSwitchToDashboard ? onSwitchToDashboard() : navigate('/dashboard')
  const { agents, pipelineStatus, stats } = usePipelineContext()

  const doneCount = agents.filter(a => a.status === 'done').length
  const progressPercent = Math.round((doneCount / 7) * 100)

  const solutions = [
    {
      id: 1,
      tag: 'AGENT 01',
      title: 'Calendar & Session Manager',
      desc: 'Automates academic window bounds mapping, morning/afternoon slot split (FN/AN), and institutional holiday exclusion.',
      icon: '📅',
      link: '/agents/1'
    },
    {
      id: 2,
      tag: 'AGENT 02',
      title: 'Student Conflict Checker',
      desc: 'Guarantees zero overlapping examination slots for any enrolled student across all cross-departmental roll number ranges.',
      icon: '🛡️',
      link: '/agents/2'
    },
    {
      id: 3,
      tag: 'AGENT 03',
      title: 'Common Course Matcher',
      desc: 'Detects and synchronizes shared curriculum courses across engineering and science branches to unify exam dates.',
      icon: '🔗',
      link: '/agents/3'
    },
    {
      id: 4,
      tag: 'AGENT 04',
      title: 'Stream & Room Harmonizer',
      desc: 'Balancing regular stream course loads evenly across available exam sessions and physical hall seat capacities.',
      icon: '⚖️',
      link: '/agents/4'
    },
    {
      id: 5,
      tag: 'AGENT 05',
      title: 'Spacing & Difficulty Evaluator',
      desc: 'Evaluates course subject difficulty scores to enforce mandatory preparation study gaps between heavy examinations.',
      icon: '📊',
      link: '/agents/5'
    },
    {
      id: 6,
      tag: 'AGENT 06',
      title: 'Arrear & Backlog Scheduler',
      desc: 'Schedules backlog re-appear courses without creating time conflicts with regular semester examination timetables.',
      icon: '🎓',
      link: '/agents/6'
    },
    {
      id: 7,
      tag: 'AGENT 07',
      title: 'Cumulative Conflict Resolver',
      desc: 'Resolves multiple conflicts that earlier agents could not fix. Uses holistic analysis to move courses to free slots or swap sessions.',
      icon: '🔧',
      link: '/agents/7'
    }
  ]

  const industries = [
    { name: 'Engineering & Tech', desc: 'Computer Science, Electrical, Mechanical & Civil streams', icon: '💻' },
    { name: 'Health Sciences', desc: 'Medical, Pharmacy & Allied Health curriculum scheduling', icon: '🩺' },
    { name: 'Business Administration', desc: 'Management, Finance & MBA multi-session examinations', icon: '📈' },
    { name: 'Arrear & Backlog Hub', desc: 'Comprehensive backlog tracking and zero-clash slotting', icon: '⚡' }
  ]

  return (
    <div className="sdi-wrapper">
      {/* ── Top Header Navigation ─────────────────────────────────────────────── */}
      <header className="sdi-nav-header">
        <a href="/" className="sdi-logo" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <div className="sdi-logo-icon">AI</div>
          <div>
            <div className="sdi-logo-text">Agentverse</div>
            <div className="sdi-logo-sub">Exam Cell AI Hub</div>
          </div>
        </a>

        <ul className="sdi-nav-links">
          <li><span className="sdi-nav-link" onClick={() => navigate('/agents')}>AI Agents</span></li>
          <li><span className="sdi-nav-link" onClick={() => navigate('/schedule')}>Schedule Generator</span></li>
          <li><span className="sdi-nav-link" onClick={() => navigate('/timetable')}>Timetable</span></li>
          <li><span className="sdi-nav-link" onClick={() => navigate('/history')}>Run History</span></li>
          <li><span className="sdi-nav-link" onClick={() => navigate('/settings')}>Settings</span></li>
        </ul>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="sdi-btn-outline" onClick={goToDashboard}>
            Live Dashboard
          </button>
          <button className="sdi-btn-gradient" onClick={() => navigate('/schedule')}>
            Launch AI Solver →
          </button>
        </div>
      </header>

      {/* ── Hero Section ───────────────────────────────────────────────────────── */}
      <section className="sdi-hero">
        <div>
          <div className="sdi-hero-badge">
            <span>✨</span> AUTONOMOUS EXAM SCHEDULING & AGENTIC AI
          </div>

          <h1 className="sdi-hero-title">
            Autonomous Exam Scheduling & <br />
            <span className="sdi-gradient-text">Multi-Agent Intelligence</span>
          </h1>

          <p className="sdi-hero-desc">
            SDI-Grade multi-agent automation platform for higher education institutions.
            Delivering automated timetable creation, student conflict prevention, spacing optimization, 
            and arrear slotting with real-time LLM explanations.
          </p>

          <div className="sdi-hero-actions">
            <button className="sdi-btn-gradient" onClick={() => navigate('/schedule')}>
              Start New Schedule Setup →
            </button>
            <button className="sdi-btn-outline" onClick={() => navigate('/agents')}>
              Explore Agent Architecture
            </button>
          </div>
        </div>

        {/* Hero Right Visual: Live Agent Hub Card */}
        <div className="sdi-hero-card">
          <div className="sdi-card-header-badge">
            <span style={{ fontSize: 12, fontWeight: 700, color: '#3866f1', letterSpacing: 1 }}>
              ACTIVE PIPELINE MONITOR
            </span>
            <span className={`badge ${pipelineStatus === 'running' ? 'badge-running' : 'badge-done'}`}>
              {pipelineStatus === 'running' ? '⚡ Processing' : '● System Ready'}
            </span>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: '#94a3b8' }}>Agent Pipeline Progress</span>
              <span style={{ color: '#65acff', fontWeight: 800 }}>{progressPercent}%</span>
            </div>
            <div className="progress-bar" style={{ background: 'rgba(255,255,255,0.1)', height: 8 }}>
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #013b9a, #3866f1, #65acff)' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24 }}>
            {agents.map(a => (
              <div key={a.agentId} style={{
                background: 'rgba(2, 8, 19, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: a.status === 'done' ? '#166534' : a.status === 'running' ? '#1d4ed8' : '#334155',
                  color: '#fff', fontSize: 11, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {a.agentId}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    Agent {a.agentId}
                  </div>
                  <div style={{ fontSize: 10, color: a.status === 'done' ? '#4ade80' : a.status === 'running' ? '#60a5fa' : '#94a3b8' }}>
                    {a.status.replace('_', ' ')}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
            <span>Total Exams Scheduled: <strong style={{ color: '#fff' }}>{stats.totalExams || 0}</strong></span>
            <span>Conflicts: <strong style={{ color: stats.conflictsFound ? '#f87171' : '#4ade80' }}>{stats.conflictsFound || 0}</strong></span>
          </div>
        </div>
      </section>

      {/* ── Impact Metrics Counter Bar ────────────────────────────────────────── */}
      <section className="sdi-stats-section">
        <div className="sdi-stats-grid">
          <div className="sdi-stat-item">
            <div className="sdi-stat-num">475+</div>
            <div className="sdi-stat-label">Exam Cycles Managed</div>
            <div className="sdi-stat-sub">Across engineering & degree colleges</div>
          </div>
          <div className="sdi-stat-item">
            <div className="sdi-stat-num">100%</div>
            <div className="sdi-stat-label">Conflict-Free Assurance</div>
            <div className="sdi-stat-sub">Zero student overlap constraint enforcement</div>
          </div>
          <div className="sdi-stat-item">
            <div className="sdi-stat-num">7</div>
            <div className="sdi-stat-label">Autonomous AI Agents</div>
            <div className="sdi-stat-sub">Collaborative rule-based architecture</div>
          </div>
          <div className="sdi-stat-item">
            <div className="sdi-stat-num">95%</div>
            <div className="sdi-stat-label">Time Reduction</div>
            <div className="sdi-stat-sub">Generated in minutes instead of weeks</div>
          </div>
        </div>
      </section>

      {/* ── SDI Managed AI Solutions Grid ───────────────────────────────────── */}
      <section className="sdi-section">
        <div className="sdi-section-header">
          <span className="sdi-section-tag">SPECIALIZED AI AGENTS</span>
          <h2 className="sdi-section-title">Managed Multi-Agent Solutions for Exam Scheduling</h2>
          <p className="sdi-section-desc">
            Each agent in our pipeline solves a critical constraint layer in the examination lifecycle, 
            working autonomously in sequence to construct flawless institutional timetables.
          </p>
        </div>

        <div className="sdi-solutions-grid">
          {solutions.map(sol => (
            <div className="sdi-solution-card" key={sol.id}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div className="sdi-card-icon">{sol.icon}</div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#3866f1', letterSpacing: 1.5 }}>
                    {sol.tag}
                  </span>
                </div>
                <h3 className="sdi-card-title">{sol.title}</h3>
                <p className="sdi-card-body">{sol.desc}</p>
              </div>

              <div>
                <a href="#" className="sdi-card-link" onClick={(e) => { e.preventDefault(); navigate(sol.link); }}>
                  View Agent Specification →
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Industry Solutions Section ──────────────────────────────────────── */}
      <section className="sdi-section" style={{ background: 'var(--sdi-bg-navy)' }}>
        <div className="sdi-section-header">
          <span className="sdi-section-tag">ACADEMIC DISCIPLINES</span>
          <h2 className="sdi-section-title">Built for Multi-Disciplinary Educational Campuses</h2>
          <p className="sdi-section-desc">
            Tailored configurations for complex university ecosystems with overlapping student enrollments.
          </p>
        </div>

        <div className="sdi-industry-grid">
          {industries.map((ind, i) => (
            <div className="sdi-ind-card" key={i}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{ind.icon}</div>
              <h4 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{ind.name}</h4>
              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{ind.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom Call To Action Banner ────────────────────────────────────── */}
      <section className="sdi-section" style={{ textAlign: 'center', background: 'radial-gradient(circle, rgba(56,102,241,0.2) 0%, var(--sdi-bg-dark) 70%)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 16 }}>
            Ready to Generate Conflict-Free Timetables?
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 15, marginBottom: 32 }}>
            Upload your course enrollment data, define session windows, and launch the multi-agent AI pipeline in seconds.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button className="sdi-btn-gradient" onClick={() => navigate('/schedule')}>
              Launch AI Schedule Solver →
            </button>
            <button className="sdi-btn-outline" onClick={goToDashboard}>
              Open Analytics Dashboard
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
