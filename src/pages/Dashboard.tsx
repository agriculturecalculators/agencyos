import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, FolderKanban, Clock, CheckCircle2, Gavel, UserCog, TrendingUp, Receipt, CalendarClock } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth, canManage } from '../lib/auth'
import { Empty, PageHeader, Spinner, StatusBadge, useLoad } from '../components/ui'
import { daysUntil, fmtDate, pkr, pkrShort } from '../lib/utils'

function Count({ value, money }: { value: number; money?: boolean }) {
  const [v, setV] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    const t0 = performance.now()
    const step = (t: number) => {
      const r = Math.min((t - t0) / 800, 1)
      setV(Math.round(value * (1 - Math.pow(1 - r, 3))))
      if (r < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [value])
  return <>{money ? pkr(v) : v.toLocaleString('en-US')}</>
}

const count = async (table: string, f?: (q: any) => any) => {
  let q = supabase.from(table).select('*', { count: 'exact', head: true })
  if (f) q = f(q)
  const { count: c } = await q
  return c ?? 0
}

export default function Dashboard() {
  const { profile } = useAuth()
  const finance = canManage(profile?.role)

  const { data, loading, error } = useLoad(async () => {
    const [clients, activeClients, activeProjects, pendingProjects, doneTasks, tenders, employees] = await Promise.all([
      count('clients'),
      count('clients', (q) => q.eq('status', 'active')),
      count('projects', (q) => q.eq('status', 'active')),
      count('projects', (q) => q.eq('status', 'pending')),
      count('tasks', (q) => q.eq('status', 'done')),
      count('tenders', (q) => q.in('status', ['new', 'preparing', 'submitted'])),
      count('profiles', (q) => q.eq('active', true)),
    ])
    let revenue = 0, expenses = 0
    const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1)
    const months: { m: string; Revenue: number; Expenses: number }[] = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(since); d.setMonth(since.getMonth() + i)
      months.push({ m: d.toLocaleString('en', { month: 'short' }), Revenue: 0, Expenses: 0 })
    }
    if (finance) {
      const from = since.toISOString().slice(0, 10)
      const [{ data: pay }, { data: exp }] = await Promise.all([
        supabase.from('payments').select('amount, paid_on').gte('paid_on', from),
        supabase.from('expenses').select('amount, spent_on').gte('spent_on', from),
      ])
      const idx = (iso: string) => {
        const d = new Date(iso)
        return (d.getFullYear() - since.getFullYear()) * 12 + d.getMonth() - since.getMonth()
      }
      pay?.forEach((p: any) => { const i = idx(p.paid_on); if (months[i]) months[i].Revenue += Number(p.amount) })
      exp?.forEach((p: any) => { const i = idx(p.spent_on); if (months[i]) months[i].Expenses += Number(p.amount) })
      revenue = months[5].Revenue
      expenses = months[5].Expenses
    }
    const today = new Date().toISOString().slice(0, 10)
    const [{ data: pd }, { data: td }] = await Promise.all([
      supabase.from('projects').select('id,name,deadline,status').gte('deadline', today).neq('status', 'completed').order('deadline').limit(5),
      supabase.from('tasks').select('id,title,due_date,priority').gte('due_date', today).neq('status', 'done').order('due_date').limit(5),
    ])
    const deadlines = [
      ...(pd ?? []).map((p: any) => ({ id: 'p' + p.id, title: p.name, date: p.deadline, tag: 'project' })),
      ...(td ?? []).map((t: any) => ({ id: 't' + t.id, title: t.title, date: t.due_date, tag: t.priority })),
    ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6)
    return { clients, activeClients, activeProjects, pendingProjects, doneTasks, tenders, employees, revenue, expenses, months, deadlines }
  }, [finance])

  if (loading) return <Spinner />
  if (error || !data) return <div className="card text-sm text-red-600">{error}</div>

  const kpis = [
    { label: 'Total clients', v: data.clients, icon: Users, to: '/clients' },
    { label: 'Active clients', v: data.activeClients, icon: Users, to: '/clients' },
    { label: 'Active projects', v: data.activeProjects, icon: FolderKanban, to: '/projects' },
    { label: 'Pending projects', v: data.pendingProjects, icon: Clock, to: '/projects' },
    { label: 'Completed tasks', v: data.doneTasks, icon: CheckCircle2, to: '/tasks' },
    { label: 'Active tenders', v: data.tenders, icon: Gavel, to: '/tenders' },
    { label: 'Employees', v: data.employees, icon: UserCog, to: '/employees' },
    ...(finance
      ? [
          { label: 'Revenue (this month)', v: data.revenue, icon: TrendingUp, to: '/finance', money: true },
          { label: 'Expenses (this month)', v: data.expenses, icon: Receipt, to: '/finance', money: true },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${profile?.full_name}`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <Link key={k.label} to={k.to} style={{ animationDelay: `${i * 40}ms` }} className="card animate-fadeUp transition hover:border-brand-400 active:scale-[.98]">
            <div className="flex items-center justify-between text-xs text-slate-500">
              {k.label}
              <k.icon className="h-4 w-4 text-brand-600" />
            </div>
            <div className="mt-1 truncate text-xl font-semibold"><Count value={k.v} money={(k as any).money} /></div>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {finance && (
          <div className="card lg:col-span-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-medium">Revenue vs expenses</div>
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-brand-600" />Revenue</span>
                <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-slate-400" />Expenses</span>
              </div>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.months} barGap={3}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={64} tickFormatter={(v) => pkrShort(v)} />
                  <Tooltip formatter={(v: number) => pkr(v)} />
                  <Bar dataKey="Revenue" fill="#2a6fdb" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Expenses" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className={`card ${finance ? 'lg:col-span-2' : 'lg:col-span-5'}`}>
          <div className="mb-2 flex items-center gap-2 font-medium"><CalendarClock className="h-4 w-4 text-brand-600" />Upcoming deadlines</div>
          {data.deadlines.length === 0 ? (
            <Empty title="No deadlines coming up" text="New projects and tasks with due dates show up here." />
          ) : (
            data.deadlines.map((d) => {
              const n = daysUntil(d.date)
              return (
                <div key={d.id} className="flex items-center gap-3 border-t border-slate-100 py-2.5 first:border-0 dark:border-slate-800">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{d.title}</div>
                    <div className={`text-xs ${n !== null && n <= 1 ? 'text-red-600' : 'text-slate-500'}`}>
                      {n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : fmtDate(d.date)}
                    </div>
                  </div>
                  {d.tag === 'project' ? <span className="text-xs text-slate-500">project</span> : <StatusBadge value={d.tag} />}
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
