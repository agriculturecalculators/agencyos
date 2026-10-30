import { useState, type FormEvent } from 'react'
import { Link, Route, Routes, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarCheck, Mail, Pencil, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { canLead, canManage, useAuth, type Profile } from '../lib/auth'
import { logActivity } from '../lib/data'
import { Avatar, Badge, Empty, ErrorBox, Field, Modal, PageHeader, Progress, Spinner, StatusBadge, useLoad } from '../components/ui'
import { fmtDate } from '../lib/utils'

const ROLES = ['admin', 'manager', 'team_leader', 'employee']

function EditForm({ p, onDone, onClose }: { p: Profile; onDone: () => void; onClose: () => void }) {
  const { profile } = useAuth()
  const [f, setF] = useState<any>({ full_name: p.full_name, department: p.department ?? '', job_title: p.job_title ?? '', phone: p.phone ?? '', role: p.role, active: p.active })
  const [err, setErr] = useState('')
  const isAdmin = profile?.role === 'admin'
  async function submit(e: FormEvent) {
    e.preventDefault()
    const payload: any = { full_name: f.full_name, department: f.department || null, job_title: f.job_title || null, phone: f.phone || null }
    if (isAdmin) { payload.role = f.role; payload.active = f.active }
    const { error } = await supabase.from('profiles').update(payload).eq('id', p.id)
    if (error) return setErr(error.message)
    logActivity('updated employee', 'profile', p.id); onDone()
  }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorBox message={err} />}
      <Field label="Full name"><input className="input" value={f.full_name} onChange={set('full_name')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Department"><input className="input" value={f.department} onChange={set('department')} placeholder="SEO" /></Field>
        <Field label="Job title"><input className="input" value={f.job_title} onChange={set('job_title')} /></Field>
        <Field label="Phone"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
        {isAdmin && <Field label="Role"><select className="input" value={f.role} onChange={set('role')}>{ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}</select></Field>}
      </div>
      {isAdmin && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-600" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Account is active</label>}
      <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Save</button></div>
    </form>
  )
}

function List() {
  const { profile } = useAuth()
  const manage = canManage(profile?.role)
  const [invite, setInvite] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('employee')
  const [err, setErr] = useState('')
  const { data, loading, error, reload } = useLoad(async () => {
    const today = new Date().toISOString().slice(0, 10)
    const [p, t, r, inv] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('tasks').select('assignee_id,status').neq('status', 'done').not('assignee_id', 'is', null),
      supabase.from('daily_reports').select('user_id,status').eq('report_date', today),
      manage ? supabase.from('invitations').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
    ])
    const load: Record<string, number> = {}
    t.data?.forEach((x: any) => (load[x.assignee_id] = (load[x.assignee_id] ?? 0) + 1))
    const rep: Record<string, string> = {}
    r.data?.forEach((x: any) => (rep[x.user_id] = x.status))
    return { people: (p.data ?? []) as Profile[], load, rep, invites: inv.data ?? [] }
  })

  async function sendInvite(e: FormEvent) {
    e.preventDefault(); setErr('')
    if (!email.includes('@')) return setErr('Enter a valid email.')
    const { error } = await supabase.from('invitations').insert({ email: email.trim().toLowerCase(), role, invited_by: profile!.id })
    if (error) return setErr(error.code === '23505' ? 'That email is already invited.' : error.message)
    logActivity('invited ' + email, 'invitation'); setEmail(''); setInvite(false); reload()
  }

  return (
    <>
      <PageHeader title="Employees" subtitle={data ? `${data.people.length} people` : undefined} action={manage && <button className="btn-primary" onClick={() => setInvite(true)}><UserPlus className="h-4 w-4" />Invite</button>} />
      {error && <ErrorBox message={error} />}
      {loading && !data ? <Spinner /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data?.people.map((p, i) => (
            <Link key={p.id} to={p.id} style={{ animationDelay: `${i * 30}ms` }} className="card animate-fadeUp transition hover:border-brand-400 active:scale-[.98]">
              <div className="flex items-center gap-3">
                <Avatar name={p.full_name} size={42} />
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{p.full_name}</div><div className="truncate text-xs text-slate-500">{p.job_title || p.department || 'No title yet'}</div></div>
                <Badge tone={p.role === 'admin' ? 'blue' : 'gray'}>{p.role.replace('_', ' ')}</Badge>
              </div>
              <div className="mt-3 flex justify-between text-xs text-slate-500">
                <span>{data.load[p.id] ?? 0} open tasks</span>
                <span>Report today: {data.rep[p.id] ? data.rep[p.id] : 'not yet'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      {manage && data && data.invites.length > 0 && (
        <div className="card mt-4"><div className="mb-2 font-medium">Pending invitations</div>
          {data.invites.map((i: any) => <div key={i.id} className="flex items-center justify-between border-t border-slate-100 py-2 text-sm first:border-0 dark:border-slate-800"><span className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{i.email}</span><Badge>{i.role.replace('_', ' ')}</Badge></div>)}
          <p className="mt-2 text-xs text-slate-500">Invited people create their account with this exact email on the sign-up screen.</p>
        </div>
      )}
      <Modal open={invite} onClose={() => setInvite(false)} title="Invite an employee">
        <form onSubmit={sendInvite} className="space-y-3">
          {err && <ErrorBox message={err} />}
          <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" /></Field>
          <Field label="Role"><select className="input" value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.filter((r) => profile?.role === 'admin' || r === 'employee' || r === 'team_leader').map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}</select></Field>
          <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setInvite(false)}>Cancel</button><button className="btn-primary">Send invite</button></div>
        </form>
      </Modal>
    </>
  )
}

function Detail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const manage = canManage(profile?.role)
  const lead = canLead(profile?.role)
  const self = profile?.id === id
  const [edit, setEdit] = useState(false)
  const [leave, setLeave] = useState(false)
  const [lf, setLf] = useState({ from_date: '', to_date: '', reason: '' })
  const { data, loading, error, reload } = useLoad(async () => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const [p, pr, tk, rp, at, lv, te] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id!).single(),
      supabase.from('project_members').select('projects(id,name,progress,status,clients(name))').eq('user_id', id!),
      supabase.from('tasks').select('id,title,status,priority,due_date').eq('assignee_id', id!).order('created_at', { ascending: false }),
      supabase.from('daily_reports').select('*').eq('user_id', id!).order('report_date', { ascending: false }).limit(5),
      supabase.from('attendance').select('*').eq('user_id', id!).gte('day', since).order('day', { ascending: false }),
      supabase.from('leave_requests').select('*').eq('user_id', id!).order('created_at', { ascending: false }).limit(5),
      supabase.from('time_entries').select('minutes').eq('user_id', id!).gte('logged_on', since),
    ])
    if (p.error) throw p.error
    return { p: p.data as Profile, projects: (pr.data ?? []).map((x: any) => x.projects).filter(Boolean), tasks: tk.data ?? [], reports: rp.data ?? [], att: at.data ?? [], leaves: lv.data ?? [], minutes: (te.data ?? []).reduce((s: number, x: any) => s + x.minutes, 0) }
  }, [id])

  async function checkIn() {
    const day = new Date().toISOString().slice(0, 10)
    const status = new Date().getHours() >= 11 ? 'late' : 'present'
    await supabase.from('attendance').upsert({ user_id: id, day, status }, { onConflict: 'user_id,day' })
    reload()
  }
  async function requestLeave(e: FormEvent) {
    e.preventDefault()
    if (!lf.from_date || !lf.to_date || lf.to_date < lf.from_date) return alert('Choose a valid date range.')
    await supabase.from('leave_requests').insert({ ...lf, user_id: id })
    setLeave(false); setLf({ from_date: '', to_date: '', reason: '' }); reload()
  }
  async function decide(l: any, status: string) { await supabase.from('leave_requests').update({ status }).eq('id', l.id); reload() }

  if (loading && !data) return <Spinner />
  if (error || !data) return <ErrorBox message={error || 'Employee not found.'} />
  const { p, projects, tasks, reports, att, leaves, minutes } = data
  const open = tasks.filter((t: any) => t.status !== 'done')
  const done = tasks.filter((t: any) => t.status === 'done').length
  const rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0
  const present = att.filter((a: any) => a.status === 'present' || a.status === 'late').length

  return (
    <>
      <Link to="/employees" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />Employees</Link>
      <div className="card mb-4">
        <div className="flex items-start gap-3">
          <Avatar name={p.full_name} size={52} />
          <div className="min-w-0 flex-1"><h1 className="text-xl font-semibold">{p.full_name}</h1><div className="text-sm text-slate-500">{[p.job_title, p.department].filter(Boolean).join(' · ') || 'No title yet'}</div><div className="mt-1 flex gap-2"><Badge tone="blue">{p.role.replace('_', ' ')}</Badge>{!p.active && <Badge tone="red">inactive</Badge>}</div></div>
          {(manage || self) && <button className="btn-ghost !p-2" aria-label="Edit" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" /></button>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
          {[['Open tasks', open.length], ['Completion', rate + '%'], ['Hours (30 days)', (minutes / 60).toFixed(1)], ['Present (30 days)', present + ' days']].map(([l, v]) => <div key={String(l)} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="text-xs text-slate-500">{l}</div><div className="font-semibold">{v}</div></div>)}
        </div>
        <div className="mt-3"><div className="mb-1 text-xs text-slate-500">Task completion</div><Progress value={rate} /></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><div className="mb-2 font-medium">Assigned projects and clients</div>
          {projects.length === 0 && <p className="text-sm text-slate-500">No projects yet.</p>}
          {projects.map((x: any) => <Link to={`/projects/${x.id}`} key={x.id} className="block border-t border-slate-100 py-2 first:border-0 dark:border-slate-800"><div className="flex justify-between text-sm"><span>{x.name}</span><StatusBadge value={x.status} /></div><div className="text-xs text-slate-500">{x.clients?.name}</div></Link>)}
        </div>
        <div className="card"><div className="mb-2 font-medium">Tasks</div>
          {open.length === 0 && <p className="text-sm text-slate-500">Nothing open right now.</p>}
          {open.slice(0, 6).map((t: any) => <div key={t.id} className="flex items-center justify-between gap-2 border-t border-slate-100 py-2 text-sm first:border-0 dark:border-slate-800"><span className="truncate">{t.title}</span><span className="flex gap-1"><StatusBadge value={t.priority} /><StatusBadge value={t.status} /></span></div>)}
        </div>
        <div className="card"><div className="mb-2 font-medium">Recent daily reports</div>
          {reports.length === 0 && <p className="text-sm text-slate-500">No reports submitted.</p>}
          {reports.map((r: any) => <div key={r.id} className="flex items-center justify-between border-t border-slate-100 py-2 text-sm first:border-0 dark:border-slate-800"><span>{fmtDate(r.report_date)} · {r.hours}h</span><StatusBadge value={r.status} /></div>)}
        </div>
        <div className="card">
          <div className="mb-2 flex items-center justify-between font-medium">Attendance and leave
            {self && <span className="flex gap-2"><button className="btn-primary !px-3 !py-1.5 text-xs" onClick={checkIn}><CalendarCheck className="h-4 w-4" />Check in</button><button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setLeave(true)}>Request leave</button></span>}
          </div>
          <div className="mb-3 flex flex-wrap gap-1">{att.slice(0, 14).map((a: any) => <span key={a.id} title={`${a.day}: ${a.status}`} className={`h-5 w-5 rounded ${a.status === 'present' ? 'bg-emerald-400' : a.status === 'late' ? 'bg-amber-400' : a.status === 'leave' ? 'bg-slate-300' : 'bg-red-400'}`} />)}{att.length === 0 && <span className="text-sm text-slate-500">No attendance yet.</span>}</div>
          {leaves.map((l: any) => <div key={l.id} className="flex items-center justify-between gap-2 border-t border-slate-100 py-2 text-sm dark:border-slate-800"><span>{fmtDate(l.from_date)} to {fmtDate(l.to_date)}</span><span className="flex items-center gap-2"><StatusBadge value={l.status} />{lead && !self && l.status === 'pending' && <><button className="text-xs text-emerald-600" onClick={() => decide(l, 'approved')}>Approve</button><button className="text-xs text-red-600" onClick={() => decide(l, 'rejected')}>Reject</button></>}</span></div>)}
        </div>
      </div>
      <Modal open={edit} onClose={() => setEdit(false)} title="Edit profile"><EditForm p={p} onClose={() => setEdit(false)} onDone={() => { setEdit(false); reload() }} /></Modal>
      <Modal open={leave} onClose={() => setLeave(false)} title="Request leave">
        <form onSubmit={requestLeave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><Field label="From"><input className="input" type="date" value={lf.from_date} onChange={(e) => setLf({ ...lf, from_date: e.target.value })} /></Field><Field label="To"><input className="input" type="date" value={lf.to_date} onChange={(e) => setLf({ ...lf, to_date: e.target.value })} /></Field></div>
          <Field label="Reason"><textarea className="input" rows={2} value={lf.reason} onChange={(e) => setLf({ ...lf, reason: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setLeave(false)}>Cancel</button><button className="btn-primary">Send request</button></div>
        </form>
      </Modal>
    </>
  )
}

export default function Employees() {
  return <Routes><Route index element={<List />} /><Route path=":id" element={<Detail />} /></Routes>
}
