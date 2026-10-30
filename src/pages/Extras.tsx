import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, ChevronLeft, ChevronRight, LogOut, Moon, Sun } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { Avatar, Empty, ErrorBox, Field, PageHeader, Spinner, useLoad } from '../components/ui'
import { fmtDate } from '../lib/utils'

export function Notifications() {
  const { profile } = useAuth()
  const { data, loading, reload } = useLoad(async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', profile!.id).order('created_at', { ascending: false }).limit(50)
    return data ?? []
  })
  async function readAll() { await supabase.from('notifications').update({ read: true }).eq('user_id', profile!.id).eq('read', false); reload() }
  async function read(n: any) { if (!n.read) { await supabase.from('notifications').update({ read: true }).eq('id', n.id); reload() } }
  return (
    <>
      <PageHeader title="Notifications" action={<button className="btn-ghost" onClick={readAll}><CheckCheck className="h-4 w-4" />Mark all read</button>} />
      {loading && !data ? <Spinner /> : data && data.length === 0 ? <div className="card"><Empty title="You're all caught up" text="Task assignments, report reviews and tender alerts appear here." /></div> : (
        <div className="card !p-0">
          {data?.map((n: any) => (
            <button key={n.id} onClick={() => read(n)} className={`flex w-full items-start gap-3 border-t border-slate-100 p-4 text-left first:border-0 dark:border-slate-800 ${n.read ? '' : 'bg-brand-50/60 dark:bg-brand-900/20'}`}>
              <div className="mt-0.5 rounded-full bg-brand-100 p-2 text-brand-700 dark:bg-brand-900/50"><Bell className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1"><div className="text-sm font-medium">{n.title}</div>{n.body && <div className="text-sm text-slate-500">{n.body}</div>}<div className="mt-0.5 text-xs text-slate-400">{fmtDate(n.created_at)}</div></div>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

export function ActivityLog() {
  const { data, loading, error } = useLoad(async () => {
    const { data, error } = await supabase.from('activity_logs').select('*, profiles:actor_id(full_name)').order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    return data ?? []
  })
  return (
    <>
      <PageHeader title="Activity log" subtitle="Last 100 actions" />
      {error && <ErrorBox message={error} />}
      {loading && !data ? <Spinner /> : data && data.length === 0 ? <div className="card"><Empty title="No activity yet" text="Everything your team does is recorded here." /></div> : (
        <div className="card">
          {data?.map((a: any) => (
            <div key={a.id} className="flex items-center gap-3 border-t border-slate-100 py-2.5 text-sm first:border-0 dark:border-slate-800">
              <Avatar name={a.profiles?.full_name} size={28} />
              <div className="min-w-0 flex-1"><span className="font-medium">{a.profiles?.full_name || 'Someone'}</span> {a.action}</div>
              <span className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export function CalendarPage() {
  const [cur, setCur] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const y = cur.getFullYear(), m = cur.getMonth()
  const first = `${y}-${String(m + 1).padStart(2, '0')}-01`
  const last = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`
  const [sel, setSel] = useState<string | null>(null)
  const { data } = useLoad(async () => {
    const [p, t, td] = await Promise.all([
      supabase.from('projects').select('id,name,deadline').gte('deadline', first).lte('deadline', last),
      supabase.from('tasks').select('id,title,due_date').gte('due_date', first).lte('due_date', last).neq('status', 'done'),
      supabase.from('tenders').select('id,title,submission_deadline').gte('submission_deadline', first).lte('submission_deadline', last),
    ])
    const ev: Record<string, { label: string; kind: string; to: string }[]> = {}
    const add = (d: string, label: string, kind: string, to: string) => ((ev[d] ??= []).push({ label, kind, to }))
    p.data?.forEach((x: any) => add(x.deadline, x.name, 'project', `/projects/${x.id}`))
    t.data?.forEach((x: any) => add(x.due_date, x.title, 'task', '/tasks'))
    td.data?.forEach((x: any) => add(x.submission_deadline, x.title, 'tender', '/tenders'))
    return ev
  }, [first])
  const startPad = (new Date(y, m, 1).getDay() + 6) % 7
  const days = new Date(y, m + 1, 0).getDate()
  const todayIso = new Date().toISOString().slice(0, 10)
  const colors: Record<string, string> = { project: 'bg-brand-600', task: 'bg-emerald-500', tender: 'bg-amber-500' }
  const key = (d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return (
    <>
      <PageHeader title="Calendar" action={<div className="flex items-center gap-1"><button className="btn-ghost !p-2" aria-label="Previous month" onClick={() => setCur(new Date(y, m - 1, 1))}><ChevronLeft className="h-4 w-4" /></button><span className="w-32 text-center text-sm font-medium">{cur.toLocaleString('en', { month: 'long', year: 'numeric' })}</span><button className="btn-ghost !p-2" aria-label="Next month" onClick={() => setCur(new Date(y, m + 1, 1))}><ChevronRight className="h-4 w-4" /></button></div>} />
      <div className="mb-2 flex gap-4 text-xs text-slate-500">{Object.entries(colors).map(([k, c]) => <span key={k} className="flex items-center gap-1"><i className={`h-2.5 w-2.5 rounded-full ${c}`} />{k} deadline</span>)}</div>
      <div className="card !p-2">
        <div className="grid grid-cols-7 text-center text-xs text-slate-500">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-1">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPad }).map((_, i) => <div key={'p' + i} />)}
          {Array.from({ length: days }).map((_, i) => {
            const k = key(i + 1), ev = data?.[k] ?? []
            return (
              <button key={k} onClick={() => setSel(k)} className={`flex min-h-[3.2rem] flex-col items-center rounded-xl border p-1 text-sm transition active:scale-95 ${sel === k ? 'border-brand-600' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'} ${k === todayIso ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/30' : ''}`}>
                {i + 1}
                <span className="mt-1 flex gap-0.5">{ev.slice(0, 3).map((e, j) => <i key={j} className={`h-1.5 w-1.5 rounded-full ${colors[e.kind]}`} />)}</span>
              </button>
            )
          })}
        </div>
      </div>
      {sel && (
        <div className="card mt-3 animate-fadeUp">
          <div className="mb-2 font-medium">{fmtDate(sel)}</div>
          {(data?.[sel] ?? []).length === 0 ? <p className="text-sm text-slate-500">Nothing due on this day.</p> : data![sel].map((e, i) => <Link key={i} to={e.to} className="flex items-center gap-2 py-1.5 text-sm"><i className={`h-2 w-2 rounded-full ${colors[e.kind]}`} />{e.label}<span className="text-xs text-slate-500">{e.kind}</span></Link>)}
        </div>
      )}
    </>
  )
}

export function SettingsPage() {
  const { profile, refreshProfile, signOut } = useAuth()
  const { dark, toggle } = useTheme()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setMsg({ ok: false, text: 'Enter your name.' })
    const { error } = await supabase.from('profiles').update({ full_name: name.trim(), phone: phone || null }).eq('id', profile!.id)
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Profile saved.' })
    refreshProfile()
  }
  async function changePw(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) return setMsg({ ok: false, text: 'Use at least 8 characters for the new password.' })
    if (pw !== pw2) return setMsg({ ok: false, text: 'The two passwords do not match.' })
    const { error } = await supabase.auth.updateUser({ password: pw })
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Password changed.' })
    if (!error) { setPw(''); setPw2('') }
  }
  return (
    <>
      <PageHeader title="Profile and settings" />
      {msg && <div className={`mb-3 rounded-xl p-3 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>{msg.text}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="card space-y-3">
          <div className="flex items-center gap-3"><Avatar name={profile?.full_name} size={48} /><div><div className="font-medium">{profile?.full_name}</div><div className="text-xs capitalize text-slate-500">{profile?.role.replace('_', ' ')} · {profile?.email}</div></div></div>
          <Field label="Full name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Phone"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <button className="btn-primary">Save profile</button>
        </form>
        <form onSubmit={changePw} className="card space-y-3">
          <div className="font-medium">Change password</div>
          <Field label="New password"><input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          <Field label="Repeat new password"><input className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
          <button className="btn-primary">Change password</button>
        </form>
        <div className="card flex items-center justify-between"><div><div className="font-medium">Appearance</div><div className="text-sm text-slate-500">{dark ? 'Dark' : 'Light'} mode</div></div><button className="btn-ghost" onClick={toggle}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}Switch</button></div>
        <div className="card flex items-center justify-between"><div className="font-medium">Sign out of this device</div><button className="btn-ghost" onClick={signOut}><LogOut className="h-4 w-4" />Sign out</button></div>
      </div>
    </>
  )
}
