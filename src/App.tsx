import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ComingSoon from './pages/ComingSoon'
import { Spinner } from './components/ui'

export default function App() {
  const { session, profile, loading, signOut } = useAuth()
  if (loading) return <div className="flex h-full items-center justify-center"><Spinner /></div>
  if (!session) return <Login />
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
        <Route path="clients/*" element={<ComingSoon title="Clients" />} />
        <Route path="projects/*" element={<ComingSoon title="Projects" />} />
        <Route path="tasks/*" element={<ComingSoon title="Tasks" />} />
        <Route path="employees/*" element={<ComingSoon title="Employees" />} />
        <Route path="reports/*" element={<ComingSoon title="Daily reports" />} />
        <Route path="tenders/*" element={<ComingSoon title="Tenders" />} />
        <Route path="finance/*" element={<ComingSoon title="Finance" />} />
        <Route path="analytics/*" element={<ComingSoon title="Analytics" />} />
        <Route path="calendar/*" element={<ComingSoon title="Calendar" />} />
        <Route path="notifications/*" element={<ComingSoon title="Notifications" />} />
        <Route path="activity/*" element={<ComingSoon title="Activity log" />} />
        <Route path="settings/*" element={<ComingSoon title="Settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
