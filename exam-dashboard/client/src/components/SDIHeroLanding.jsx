import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePipelineContext } from '../context/PipelineContext'
import logoEshwar from '../assets/logo_eshwar.png'

const ROTATING_PHRASES = [
  'Multi-Agent Intelligence',
  '100% Conflict-Free Timetables',
  'Bulk Branch Hall Tickets',
  'AI Study Gap Optimization',
  'Official Schedule PDF Export'
]

export default function SDIHeroLanding({ onSwitchToDashboard }) {
  const navigate = useNavigate()
  const goToDashboard = () => onSwitchToDashboard ? onSwitchToDashboard() : navigate('/dashboard')
  const { agents, pipelineStatus, stats } = usePipelineContext()

  const [contactSubmitted, setContactSubmitted] = useState(false)

  // Typewriter font animation state
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentFullPhrase = ROTATING_PHRASES[phraseIndex]

    let timer
    if (!isDeleting) {
      if (displayText.length < currentFullPhrase.length) {
        timer = setTimeout(() => {
          setDisplayText(currentFullPhrase.slice(0, displayText.length + 1))
        }, 70)
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true)
        }, 2200)
      }
    } else {
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(currentFullPhrase.slice(0, displayText.length - 1))
        }, 40)
      } else {
        setIsDeleting(false)
        setPhraseIndex((prev) => (prev + 1) % ROTATING_PHRASES.length)
      }
    }

    return () => clearTimeout(timer)
  }, [displayText, isDeleting, phraseIndex])

  const doneCount = agents.filter(a => a.status === 'done').length
  const progressPercent = Math.round((doneCount / 7) * 100)

  const solutions = [
    {
      id: 1,
      tag: 'AGENT 01',
      title: 'Calendar & Session Manager',
      desc: 'Automates academic window bounds mapping, morning/afternoon slot split (FN 9:30 AM / AN 1:30 PM), and institutional holiday exclusion.',
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
      desc: 'Evaluates course subject difficulty scores to enforce mandatory 1 to 2 day preparation study gaps between heavy examinations.',
      icon: '📊',
      link: '/agents/5'
    },
    {
      id: 6,
      tag: 'AGENT 06',
      title: 'Arrear & Backlog Scheduler',
      desc: 'Schedules backlog re-appear courses in secondary slots without creating time conflicts with regular semester examination timetables.',
      icon: '🎓',
      link: '/agents/6'
    },
    {
      id: 7,
      tag: 'AGENT 07',
      title: 'Cumulative Conflict Resolver',
      desc: 'Resolves multiple conflicts holistically. Uses intelligent optimization to move courses to free slots or swap sessions.',
      icon: '🔧',
      link: '/agents/7'
    }
  ]

  const features = [
    {
      icon: '🖨️',
      title: 'Official Print Schedule Exporter',
      desc: 'Generates publication-grade institutional schedules matching official Autonomous CoE formats with college logos, NAAC badges, and signatures.'
    },
    {
      icon: '🎟️',
      title: 'Bulk Branch Hall Ticket Export',
      desc: 'Single-click PDF export of all student hall tickets for an entire department (CSE, ECE, MECH, IT, etc.) as one combined document.'
    },
    {
      icon: '🔍',
      title: 'Student Directory & Exam Lookup',
      desc: 'Search any student by Name, Register Number, Branch, or Semester to view their personalized examination timetable.'
    },
    {
      icon: '⚡',
      title: '7-Agent Multi-AI Orchestration',
      desc: 'Autonomous AI pipeline executing rule-based constraint logic to eliminate student clashes and balance invigilation loads.'
    }
  ]

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="sdi-wrapper">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sdi-nav-header" style={{ padding: '12px 48px' }}>
        <a href="/" className="sdi-logo" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <img
            src={logoEshwar}
            alt="Sri Eshwar College Logo"
            style={{ height: '42px', maxWidth: '180px', objectFit: 'contain' }}
          />
        </a>

        <ul className="sdi-nav-links">
          <li><span className="sdi-nav-link" onClick={() => scrollToSection('hero')}>Home</span></li>
          <li><span className="sdi-nav-link" onClick={() => scrollToSection('about')}>About CoE</span></li>
          <li><span className="sdi-nav-link" onClick={() => scrollToSection('agents')}>AI Agents</span></li>
          <li><span className="sdi-nav-link" onClick={() => scrollToSection('features')}>Features</span></li>
          <li><span className="sdi-nav-link" onClick={() => scrollToSection('contact')}>Contact Us</span></li>
        </ul>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="sdi-btn-outline" onClick={() => navigate('/timetable')}>
            📅 Timetable
          </button>
          <button className="sdi-btn-outline" onClick={() => navigate('/students')}>
            🎟️ Hall Tickets
          </button>
          <button className="sdi-btn-gradient" onClick={goToDashboard}>
            Launch Dashboard →
          </button>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section id="hero" className="sdi-hero">
        <div>
          <div className="sdi-hero-badge">
            <span>✨</span> OFFICE OF THE CONTROLLER OF EXAMINATIONS · SRI ESHWAR
          </div>

          <h1 className="sdi-hero-title">
            Autonomous Exam Scheduling & <br />
            <span className="sdi-gradient-text-animated">
              {displayText}
              <span className="typing-cursor">|</span>
            </span>
          </h1>

          <p className="sdi-hero-desc">
            Next-generation AI orchestration platform for Autonomous Semester End Examinations at Sri Eshwar College of Engineering. 
            Delivering 100% conflict-free timetable generation, study gap enforcement, official schedule PDF exports, and bulk branch hall ticket printing.
          </p>

          <div className="sdi-hero-actions">
            <button className="sdi-btn-gradient" onClick={() => navigate('/schedule')}>
              🚀 Start Schedule Solver →
            </button>
            <button className="sdi-btn-outline" onClick={() => navigate('/students')}>
              🎟️ Hall Ticket Portal
            </button>
            <button className="sdi-btn-outline" onClick={() => navigate('/timetable')}>
              🖨️ Official Print Schedule
            </button>
          </div>
        </div>

        {/* Hero Right Visual: Live Agent Monitor Card */}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
            {agents.map(a => (
              <div key={a.agentId} style={{
                background: 'rgba(2, 8, 19, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: a.status === 'done' ? '#166534' : a.status === 'running' ? '#1d4ed8' : '#334155',
                  color: '#fff', fontSize: 10, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {a.agentId}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    Agent {a.agentId}
                  </div>
                  <div style={{ fontSize: 9, color: a.status === 'done' ? '#4ade80' : a.status === 'running' ? '#60a5fa' : '#94a3b8' }}>
                    {a.status.replace('_', ' ')}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' }}>
            <span>Total Exams Scheduled: <strong style={{ color: '#fff' }}>{stats.totalExams || 0}</strong></span>
            <span>Clashes: <strong style={{ color: stats.conflictsFound ? '#f87171' : '#4ade80' }}>{stats.conflictsFound || 0}</strong></span>
          </div>
        </div>
      </section>

      {/* ── Impact Metrics Counter Bar ────────────────────────────────── */}
      <section className="sdi-stats-section">
        <div className="sdi-stats-grid">
          <div className="sdi-stat-item">
            <div className="sdi-stat-num">100%</div>
            <div className="sdi-stat-label">Conflict-Free Assurance</div>
            <div className="sdi-stat-sub">Zero student overlap constraint enforcement</div>
          </div>
          <div className="sdi-stat-item">
            <div className="sdi-stat-num">7</div>
            <div className="sdi-stat-label">Autonomous AI Agents</div>
            <div className="sdi-stat-sub">Collaborative rule-based multi-agent swarm</div>
          </div>
          <div className="sdi-stat-item">
            <div className="sdi-stat-num">12+</div>
            <div className="sdi-stat-label">Engineering Streams</div>
            <div className="sdi-stat-sub">CSE, ECE, EEE, MECH, IT, AI-ML, AI-DS, CSBS, CYSE</div>
          </div>
          <div className="sdi-stat-item">
            <div className="sdi-stat-num">1-Click</div>
            <div className="sdi-stat-label">Bulk Branch Hall Ticket Export</div>
            <div className="sdi-stat-sub">Instant multi-page PDF generation for Exam Cell</div>
          </div>
        </div>
      </section>

      {/* ── About Us Section (Office of Controller of Examinations) ───── */}
      <section id="about" className="sdi-section" style={{ background: 'var(--sdi-bg-navy)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <span className="sdi-section-tag">ABOUT US</span>
            <h2 className="sdi-section-title">Office of the Controller of Examinations</h2>
            <p style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.7, marginBottom: 18 }}>
              Sri Eshwar College of Engineering (An Autonomous Institution), approved by AICTE, New Delhi and affiliated to Anna University, Chennai, is dedicated to academic rigor and administrative excellence.
            </p>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              The Office of the Controller of Examinations (CoE) oversees the end-to-end management of Autonomous Semester End Examinations. By integrating state-of-the-art Multi-Agent AI algorithms, our office ensures 100% clash-free scheduling, optimal preparation gaps between examinations, and streamlined hall ticket issuance.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(96,165,250,0.3)', padding: '10px 16px', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa' }}>NAAC 'A' Grade</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Accredited Institution</div>
              </div>
              <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(96,165,250,0.3)', padding: '10px 16px', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa' }}>NBA & NIRF</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Ranked & Certified</div>
              </div>
              <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(96,165,250,0.3)', padding: '10px 16px', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa' }}>Regulations 2023</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Curriculum Standard</div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(145deg, rgba(13, 27, 46, 0.95), rgba(9, 19, 34, 0.98))',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            borderRadius: 12,
            padding: 32,
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 10 }}>
              Institutional Examination Standards
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ fontSize: 22 }}>📜</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Forenoon & Afternoon Sessions</div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>FN: 9:30 AM – 12:30 PM &nbsp;|&nbsp; AN: 1:30 PM – 4:30 PM</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ fontSize: 22 }}>⏱️</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Mandatory Preparation Gaps</div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>Enforces 1-day rest gaps & 2-day buffers before difficult papers.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ fontSize: 22 }}>🎓</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Arrear & Backlog Management</div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>Fit into secondary sessions without clashing with core regular exams.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key System Features ─────────────────────────────────────────── */}
      <section id="features" className="sdi-section">
        <div className="sdi-section-header">
          <span className="sdi-section-tag">EXAM CELL SYSTEM CAPABILITIES</span>
          <h2 className="sdi-section-title">Built for Modern Educational Administration</h2>
          <p className="sdi-section-desc">
            Complete suite of tools for examination scheduling, official timetable publishing, and bulk student document printing.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat( auto-fit, minmax(240px, 1fr) )', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: 'var(--sdi-bg-card)',
              border: '1px solid rgba(37, 99, 235, 0.15)',
              borderRadius: 10,
              padding: 24,
              transition: 'all 0.25s'
            }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Agents Architecture Grid ───────────────────────────────── */}
      <section id="agents" className="sdi-section" style={{ background: 'var(--sdi-bg-navy)' }}>
        <div className="sdi-section-header">
          <span className="sdi-section-tag">SPECIALIZED AI AGENTS</span>
          <h2 className="sdi-section-title">Collaborative Multi-Agent Pipeline</h2>
          <p className="sdi-section-desc">
            Each agent in our pipeline solves a critical constraint layer in the examination lifecycle, working autonomously in sequence.
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

      {/* ── Contact Us & Address Section ──────────────────────────────── */}
      <section id="contact" className="sdi-section">
        <div className="sdi-section-header">
          <span className="sdi-section-tag">GET IN TOUCH</span>
          <h2 className="sdi-section-title">Office of the Controller of Examinations Contact</h2>
          <p className="sdi-section-desc">
            Reach out to the CoE office for examination queries, timetable assistance, or institutional support.
          </p>
        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 40 }}>
          
          {/* Institution Contact Information Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div style={{
              background: 'var(--sdi-bg-card)', border: '1px solid rgba(37, 99, 235, 0.2)',
              borderRadius: 10, padding: 24, display: 'flex', gap: 16, alignItems: 'flex-start'
            }}>
              <div style={{ fontSize: 26, background: 'rgba(37, 99, 235, 0.1)', padding: 12, borderRadius: 8, color: '#60a5fa' }}>📍</div>
              <div>
                <h4 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Campus Address</h4>
                <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
                  <strong>Sri Eshwar College of Engineering (Autonomous)</strong><br />
                  Office of the Controller of Examinations<br />
                  Kondampatti (Post), Kinathukadavu (Tk),<br />
                  Coimbatore – 641 202, Tamil Nadu, India.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{
                background: 'var(--sdi-bg-card)', border: '1px solid rgba(37, 99, 235, 0.2)',
                borderRadius: 10, padding: 20
              }}>
                <div style={{ fontSize: 22, color: '#60a5fa', marginBottom: 8 }}>📞</div>
                <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Helpline Phones</h4>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                  Main: +91 4259 200300<br />
                  CoE Direct: +91 4259 200305
                </p>
              </div>

              <div style={{
                background: 'var(--sdi-bg-card)', border: '1px solid rgba(37, 99, 235, 0.2)',
                borderRadius: 10, padding: 20
              }}>
                <div style={{ fontSize: 22, color: '#60a5fa', marginBottom: 8 }}>✉️</div>
                <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Email Support</h4>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                  coe@sece.ac.in<br />
                  examcell@sece.ac.in
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--sdi-bg-card)', border: '1px solid rgba(37, 99, 235, 0.2)',
              borderRadius: 10, padding: 20, display: 'flex', gap: 14, alignItems: 'center'
            }}>
              <div style={{ fontSize: 24, color: '#60a5fa' }}>🕒</div>
              <div>
                <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 2 }}>CoE Working Hours</h4>
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Monday to Saturday: 9:00 AM – 5:00 PM (IST)</p>
              </div>
            </div>

          </div>

          {/* Quick Inquiry Form */}
          <div style={{
            background: 'var(--sdi-bg-card)', border: '1px solid rgba(37, 99, 235, 0.25)',
            borderRadius: 12, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
              Send Inquiry to Exam Cell
            </h3>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
              Submit examination support requests, schedule feedback, or hall ticket queries directly.
            </p>

            {contactSubmitted ? (
              <div style={{ background: 'rgba(22, 163, 74, 0.15)', border: '1px solid #4ade80', borderRadius: 8, padding: 20, textAlign: 'center', color: '#4ade80' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Message Sent Successfully</div>
                <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>The Office of the Controller of Examinations will review your inquiry.</div>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setContactSubmitted(true); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name..."
                    style={{ width: '100%', background: '#091322', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email..."
                    style={{ width: '100%', background: '#091322', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Department / Reg No</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE / 24CS001..."
                    style={{ width: '100%', background: '#091322', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Message / Query</label>
                  <textarea
                    rows="3"
                    required
                    placeholder="Describe your query..."
                    style={{ width: '100%', background: '#091322', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <button type="submit" className="sdi-btn-gradient" style={{ justifyContent: 'center', marginTop: 6, width: '100%' }}>
                  Submit Inquiry ➔
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer style={{ background: '#020813', borderTop: '1px solid rgba(37, 99, 235, 0.15)', padding: '40px 48px', color: '#94a3b8', fontSize: 13 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={logoEshwar} alt="Sri Eshwar Logo" style={{ height: 32, objectFit: 'contain' }} />
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>Office of the Controller of Examinations</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Sri Eshwar College of Engineering (An Autonomous Institution)</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24 }}>
            <span style={{ cursor: 'pointer', color: '#cbd5e1' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
            <span style={{ cursor: 'pointer', color: '#cbd5e1' }} onClick={() => navigate('/schedule')}>Schedule Solver</span>
            <span style={{ cursor: 'pointer', color: '#cbd5e1' }} onClick={() => navigate('/timetable')}>Timetable</span>
            <span style={{ cursor: 'pointer', color: '#cbd5e1' }} onClick={() => navigate('/students')}>Hall Tickets</span>
          </div>

          <div style={{ fontSize: 12, color: '#64748b' }}>
            © 2026 Sri Eshwar College of Engineering. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
