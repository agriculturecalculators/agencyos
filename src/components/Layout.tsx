import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, FolderKanban, CheckSquare, UserCog, FileText, Gavel, Wallet, BarChart3,
  CalendarDays, Bell, Settings, History, Menu, Moon, Sun, LogOut, Zap, Search, MoreHorizontal, X,
} from 'lucide-react'
import { useAuth, type Role } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { Avatar } from './ui'
import { cn } from '../lib/utils'

interface Item { to: string; label: string; icon: any; roles?: Role[] }

export const NAV: Item[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users, roles: ['admin', 'manager', 'team_leader', 'employee'] },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/employees', label: 'Employees', icon: UserCog, roles: ['admin', 'manager', 'team_leader'] },
  { to: '/reports', label: 'Daily reports', icon: FileText },
  { to: '/tenders', label: 'Tenders', icon: Gavel, roles: ['admin', 'manager', 'team_leader'] },
  { to: '/finance', label: 'Finance', icon: Wallet, roles: ['admin', 'manager'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'manager', 'team_leader'] },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/activity', label: 'Activity log', icon: History, roles: ['admin', 'manager'] },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const MOBILE_MAIN = ['/', '/clients', '/tasks', '/tenders']

export default function Layout() {
  const { profile, signOut } = useAuth()
  const { dark, toggle } = useTheme()
  const loc = useLocation()
  const [more, setMore] = useState(false)
  const items = NAV.filter((i) => !i.roles || (profile && i.roles.includes(profile.role)))
  const mobileMain = items.filter((i) => MOBILE_MAIN.includes(i.to)).slice(0, 4)
  const current = items.find((i) => (i.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(i.to)))

  const link = (i: Item, onClick?: () => void) => (
    <NavLink
      key={i.to}
      to={i.to}
      end={i.to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
          isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')
      }
    >
      <i.icon className="h-[18px] w-[18px]" />
      {i.label}
    </NavLink>
  )

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 flex-none flex-col border-r border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="flex items-center gap-2 px-3 py-3 text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><Zap className="h-4 w-4" /></span>
          AgencyOS
        </div>
        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto">{items.map((i) => link(i))}</nav>
        <button onClick={signOut} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          <LogOut className="h-[18px] w-[18px]" /> Sign out
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top flex items-center gap-3 bg-brand-600 px-4 py-3 text-white lg:border-b lg:border-slate-200 lg:bg-white lg:text-slate-900 dark:lg:border-slate-800 dark:lg:bg-slate-900 dark:lg:text-slate-100">
          <button onClick={() => setMore(true)} className="lg:hidden" aria-label="Menu"><Menu className="h-6 w-6" /></button>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] opacity-80 lg:hidden">Assalam o Alaikum, {profile?.full_name?.split(' ')[0]}</div>
            <div className="truncate font-semibold lg:hidden">{current?.label ?? 'AgencyOS'}</div>
            <div className="relative hidden max-w-sm lg:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input className="input pl-9" placeholder="Search clients, projects, tasks" aria-label="Search" />
            </div>
          </div>
          <button onClick={toggle} aria-label="Toggle theme" className="rounded-full p-2 hover:bg-white/10 lg:hover:bg-slate-100 dark:lg:hover:bg-slate-800">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <NavLink to="/notifications" aria-label="Notifications" className="rounded-full p-2 hover:bg-white/10 lg:hover:bg-slate-100 dark:lg:hover:bg-slate-800">
            <Bell className="h-5 w-5" />
          </NavLink>
          <div className="hidden lg:block"><Avatar name={profile?.full_name} /></div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4 lg:px-8 lg:pb-8">
          <div key={loc.pathname} className="mx-auto max-w-6xl animate-fadeUp"><Outlet /></div>
        </main>

        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          {mobileMain.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) =>
              cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition', isActive ? 'text-brand-600' : 'text-slate-400')}>
              <i.icon className="h-5 w-5" />{i.label}
            </NavLink>
          ))}
          <button onClick={() => setMore(true)} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-slate-400">
            <MoreHorizontal className="h-5 w-5" />More
          </button>
        </nav>
      </div>

      {more && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 animate-slideUp dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3"><Avatar name={profile?.full_name} /><div><div className="text-sm font-semibold">{profile?.full_name}</div><div className="text-xs capitalize text-slate-500">{profile?.role.replace('_', ' ')}</div></div></div>
              <button onClick={() => setMore(false)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-1">{items.map((i) => link(i, () => setMore(false)))}</div>
            <button onClick={signOut} className="btn-ghost mt-3 w-full"><LogOut className="h-4 w-4" />Sign out</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Guard({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { profile } = useAuth()
  if (roles && profile && !roles.includes(profile.role))
    return <div className="card text-center text-sm text-slate-500">You don't have access to this page.</div>
  return <>{children}</>
}
