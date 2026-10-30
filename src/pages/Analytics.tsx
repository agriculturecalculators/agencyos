import { useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'
import { canManage, useAuth } from '../lib/auth'
import { ErrorBox, PageHeader, Spinner, useLoad } from '../components/ui'
import { downloadCsv, pkr, pkrShort } from '../lib/utils'

const iso = (d: Date) => d.toISOString().slice(0, 10)
const COLORS = ['#2a6fdb', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6']
type Range = 'day' | 'week' | 'month' | 'custom'

export default function Analytics() {
  const { profile } = useAuth()
  const finance = canManage(profile?.role)
  const [range, setRange] = useState<Range>('month')
  const [from, setFrom] = useState(iso(new Date(Date.now() - 30 * 86400000)))
  const [to, setTo] = useState(iso(new Date()))

  const bounds = () => {
    const end = new Date()
    if (range === 'custom') return { a: from, b: to }
    const start = new Date(); start.setDate(end.getDate() - (range === 'day' ? 0 : range === 'week' ? 6 : 29))
    return { a: iso(start), b: iso(end) }
  }

  const { data, loading, error } = useLoad(async () => {
    const { a, b } = bounds()
    if (a > b) throw new Error('The start date must be before the end date.')
    const [tasks, projects, tenders, hours, pay, exp, clients] = await Promise.all([
      supabase.from('tasks').select('status,created_at,assignee_id,profiles:assignee_id(full_name)').gte('created_at', a).lte('created_at', b + 'T23:59:59'),
      supabase.from('projects').select('status'),
      supabase.from('tenders').select('status').gte('created_at', a).lte('created_at', b + 'T23:59:59'),
      supabase.from('time_entries').select('minutes,profiles:user_id(full_name)').gte('logged_on', a).lte('logged_on', b),
      finance ? supabase.from('payments').select('amount,paid_on,clients(name)').gte('paid_on', a).lte('paid_on', b) : Promise.resolve({ data: [] as any[] }),
      finance ? supabase.from('expenses').select('amount,spent_on').gte('spent_on', a).lte('spent_on', b) : Promise.resolve({ data: [] as any[] }),
      supabase.from('clients').select('status'),
    ])
    const tally = (rows: any[] | null, key: string) => Object.entries((rows ?? []).reduce((m: any, r: any) => ((m[r[key]] = (m[r[key]] ?? 0) + 1), m), {})).map(([name, value]) => ({ name: name.replace('_', ' '), value: value as number }))
    const hrs: Record<string, number> = {}
    hours.data?.forEach((h: any) => (hrs[h.profiles?.full_name ?? 'Unknown'] = (hrs[h.profiles?.full_name ?? 'Unknown'] ?? 0) + h.minutes / 60))
    const byClient: Record<string, number> = {}
    pay.data?.forEach((p: any) => (byClient[p.clients?.name ?? 'Unknown'] = (byClient[p.clients?.name ?? 'Unknown'] ?? 0) + Number(p.amount)))
    const done: Record<string, number> = {}
    tasks.data?.filter((t: any) => t.status === 'done').forEach((t: any) => (done[t.profiles?.full_name ?? 'Unassigned'] = (done[t.profiles?.full_name ?? 'Unassigned'] ?? 0) + 1))
    return {
      taskStatus: tally(tasks.data, 'status'), projectStatus: tally(projects.data, 'status'), tenderStatus: tally(tenders.data, 'status'), clientStatus: tally(clients.data, 'status'),
      hours: Object.entries(hrs).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 })),
      topClients: Object.entries(byClient).map(([name, value]) => ({ name, value })).sort((x, y) => y.value - x.value).slice(0, 6),
      tasksDone: Object.entries(done).map(([name, value]) => ({ name, value })),
      income: (pay.data ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0),
      spent: (exp.data ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0),
      totalTasks: tasks.data?.length ?? 0,
    }
  }, [range, from, to, finance])

  const Pie1 = ({ title, rows }: { title: string; rows: { name: string; value: number }[] }) => (
    <div className="card break-inside-avoid">
      <div className="mb-1 font-medium">{title}</div>
      {rows.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No data in this period.</p> : (
        <>
          <div className="h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={rows} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2}>{rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-500">{rows.map((r, i) => <span key={r.name} className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />{r.name} {r.value}</span>)}</div>
        </>
      )}
    </div>
  )
  const Bars = ({ title, rows, money }: { title: string; rows: { name: string; value: number }[]; money?: boolean }) => (
    <div className="card break-inside-avoid">
      <div className="mb-1 font-medium">{title}</div>
      {rows.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No data in this period.</p> : (
        <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows}><CartesianGrid vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} /><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} /><YAxis tickLine={false} axisLine={false} fontSize={11} width={money ? 64 : 32} tickFormatter={(v) => (money ? pkrShort(v) : v)} /><Tooltip formatter={(v: number) => (money ? pkr(v) : v)} /><Bar dataKey="value" fill="#2a6fdb" radius={[4, 4, 0, 0]} maxBarSize={28} /></BarChart></ResponsiveContainer></div>
      )}
    </div>
  )

  function exportCsv() {
    if (!data) return
    const rows = [
      ...data.taskStatus.map((r) => ({ section: 'Tasks by status', name: r.name, value: r.value })),
      ...data.projectStatus.map((r) => ({ section: 'Projects by status', name: r.name, value: r.value })),
      ...data.tenderStatus.map((r) => ({ section: 'Tenders by status', name: r.name, value: r.value })),
      ...data.hours.map((r) => ({ section: 'Hours by employee', name: r.name, value: r.value })),
      ...(finance ? [{ section: 'Finance', name: 'Income', value: data.income }, { section: 'Finance', name: 'Expenses', value: data.spent }] : []),
    ]
    downloadCsv(`agencyos-report-${iso(new Date())}.csv`, rows)
  }

  return (
    <>
      <PageHeader title="Analytics and reports" action={<div className="flex gap-2 print:hidden"><button className="btn-ghost" onClick={exportCsv}><Download className="h-4 w-4" />CSV</button><button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" />PDF</button></div>} />
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        {([['day', 'Today'], ['week', 'Last 7 days'], ['month', 'Last 30 days'], ['custom', 'Custom']] as [Range, string][]).map(([k, l]) => <button key={k} onClick={() => setRange(k)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${range === k ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>{l}</button>)}
        {range === 'custom' && <><input type="date" className="input !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" /><input type="date" className="input !w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" /></>}
      </div>
      {error && <ErrorBox message={error} />}
      {loading && !data ? <Spinner /> : data && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[['Tasks created', data.totalTasks], ['Hours logged', data.hours.reduce((s, h) => s + h.value, 0).toFixed(1)], ...(finance ? [['Income', pkr(data.income)], ['Expenses', pkr(data.spent)]] : [])].map(([l, v]) => <div key={String(l)} className="card"><div className="text-xs text-slate-500">{l}</div><div className="mt-1 truncate text-lg font-semibold">{v}</div></div>)}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Pie1 title="Tasks by status" rows={data.taskStatus} />
            <Pie1 title="Projects by status" rows={data.projectStatus} />
            <Pie1 title="Tenders by status" rows={data.tenderStatus} />
            <Pie1 title="Clients by status" rows={data.clientStatus} />
            <Bars title="Tasks completed per employee" rows={data.tasksDone} />
            <Bars title="Hours logged per employee" rows={data.hours} />
            {finance && <Bars title="Income by client" rows={data.topClients} money />}
          </div>
        </>
      )}
    </>
  )
}
