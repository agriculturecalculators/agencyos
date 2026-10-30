import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Projects from './pages/Projects'
import Tasks from './pages/Tasks'
import Employees from './pages/Employees'
import Reports from './pages/Reports'
import Tenders from './pages/Tenders'
import Finance from './pages/Finance'
import { Guard } from './components/Layout'
import Analytics from './pages/Analytics'
import { ActivityLog, CalendarPage, Notifications, SettingsPage } from './pages/Extras'
import ResetPassword from './pages/ResetPassword'
import { Spinner } from './components/ui'

export default function App() {
  const { session, profile, loading, signOut, recovery } = useAuth()
  if (loading) return <div className="flex h-full items-center justify-center"><Spinner /></div>
  if (!session) return <Login />
  if (recovery) return <ResetPassword />
  if (!profile)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-slate-600">Your account has no profile yet. Ask the Admin to invite you.</p>
        <button className="btn-ghost" onClick={signOut}>Sign out</button>
      </div>
    )
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="clients/*" element={<Clients />} />
        <Route path="projects/*" element={<Projects />} />
        <Route path="tasks/*" element={<Tasks />} />
        <Route path="employees/*" element={<Guard roles={['admin','manager','team_leader']}><Employees /></Guard>} />
        <Route path="reports/*" element={<Reports />} />
        <Route path="tenders/*" element={<Guard roles={['admin','manager','team_leader']}><Tenders /></Guard>} />
        <Route path="finance/*" element={<Guard roles={['admin','manager']}><Finance /></Guard>} />
        <Route path="analytics/*" element={<Guard roles={['admin','manager','team_leader']}><Analytics /></Guard>} />
        <Route path="calendar/*" element={<CalendarPage />} />
        <Route path="notifications/*" element={<Notifications />} />
        <Route path="activity/*" element={<Guard roles={['admin','manager']}><ActivityLog /></Guard>} />
        <Route path="settings/*" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
