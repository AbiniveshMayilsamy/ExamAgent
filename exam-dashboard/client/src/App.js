import './index.css'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { SocketProvider } from './context/SocketContext'
import { PipelineProvider, usePipelineContext } from './context/PipelineContext'
import Sidebar from './components/Sidebar'
import SDIHeroLanding from './components/SDIHeroLanding'
import DashboardPage from './pages/DashboardPage'
import SchedulePage from './pages/SchedulePage'
import AgentPipelinePage from './pages/AgentPipelinePage'
import AgentDetailPage from './pages/AgentDetailPage'
import TimetablePage from './pages/TimetablePage'
import StudentsPage from './pages/StudentsPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'

function AppShell() {
  const { pipelineStatus, agents } = usePipelineContext()
  const awaitingCount = agents.filter(a => a.status === 'awaiting_review').length

  return (
    <div className="app-shell">
      <Sidebar pipelineStatus={pipelineStatus} awaitingCount={awaitingCount} />
      <main className="main-content">
        <Routes>
          <Route path="/dashboard"  element={<DashboardPage />} />
          <Route path="/schedule"   element={<SchedulePage />} />
          <Route path="/agents"     element={<AgentPipelinePage />} />
          <Route path="/agents/:id" element={<AgentDetailPage />} />
          <Route path="/timetable"  element={<TimetablePage />} />
          <Route path="/students"   element={<StudentsPage />} />
          <Route path="/history"    element={<HistoryPage />} />
          <Route path="/settings"   element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <SocketProvider>
      <PipelineProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<SDIHeroLanding />} />
            <Route path="/*" element={<AppShell />} />
          </Routes>
        </HashRouter>
      </PipelineProvider>
    </SocketProvider>
  )
}
