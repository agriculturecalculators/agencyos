import { useState, type FormEvent } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { canLead, canManage, useAuth } from '../lib/auth'
import { fetchClientOptions, fetchProfiles, logActivity } from '../lib/data'
import { Avatar, Empty, ErrorBox, Field, Modal, PageHeader, Progress, Spinner, StatusBadge, useLoad } from '../components/ui'
import Files from '../components/Files'
import { daysUntil, fmtDate, pkr } from '../lib/utils'

const STATUSES = ['pending', 'active', 'on_hold', 'completed']

function ProjectForm({ initial, onDone, onClose }: { initial?: any; onDone: () => void; onClose: () => void }) {
  const opts = useLoad(async () => ({ clients: await fetchClientOptions(), people: await fetchProfiles() }))
  const [f, setF] = useState<any>(initial ? { ...initial, members: (initial.project_members ?? []).map((m: any) => m.user_id) } :
    { name: '', description: '', client_id: '', status: 'pending', progress: 0, budget: 0, start_date: '', deadline: '', members: [] })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  const toggle = (id: string) => setF({ ...f, members: f.members.includes(id) ? f.members.filter((x: string) => x !== id) : [...f.members, id] })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!f.name.trim()) return setErr('Enter the project name.')
    if (f.start_date && f.deadline && f.deadline < f.start_date) return setErr('Deadline must be after the start date.')
    setBusy(true); setErr('')
    const payload = { name: f.name.trim(), description: f.description || null, client_id: f.client_id || null, status: f.status, progress: Number(f.progress) || 0, budget: Number(f.budget) || 0, start_date: f.start_date || null, deadline: f.deadline || null }
    const res = initial?.id
      ? await supabase.from('projects').update(payload).eq('id', initial.id).select().single()
      : await supabase.from('projects').insert(payload).select().single()
    if (res.error) { setBusy(false); return setErr(res.error.message) }
    const pid = res.data.id
    await supabase.from('project_members').delete().eq('project_id', pid)
    if (f.members.length) await supabase.from('project_members').insert(f.members.map((u: string) => ({ project_id: pid, user_id: u })))
    logActivity(initial?.id ? 'updated project' : 'created project', 'project', pid)
    setBusy(false); onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorBox message={err} />}
      <Field label="Project name"><input className="input" value={f.name} onChange={set('name')} /></Field>
      <Field label="Client">
        <select className="input" value={f.client_id ?? ''} onChange={set('client_id')}>
          <option value="">No client</option>{opts.data?.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Description"><textarea className="input" rows={2} value={f.description ?? ''} onChange={set('description')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status"><select className="input" value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></Field>
        <Field label={`Progress (${f.progress}%)`}><input type="range" min={0} max={100} value={f.progress} onChange={set('progress')} className="w-full accent-brand-600" /></Field>
        <Field label="Start date"><input className="input" type="date" value={f.start_date ?? ''} onChange={set('start_date')} /></Field>
        <Field label="Deadline"><input className="input" type="date" value={f.deadline ?? ''} onChange={set('deadline')} /></Field>
      </div>
      <Field label="Budget (PKR)"><input className="input" type="number" min={0} value={f.budget} onChange={set('budget')} /></Field>
      <div>
        <span className="label">Team members</span>
        <div className="flex flex-wrap gap-2">
          {opts.data?.people.map((p) => (
            <button type="button" key={p.id} onClick={() => toggle(p.id)}
              className={`rounded-full border px-3 py-1 text-xs transition ${f.members.includes(p.id) ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>{p.full_name}</button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save project'}</button>
      </div>
    </form>
  )
}

function List() {
  const { profile } = useAuth()
  const manage = canManage(profile?.role)
  const [status, setStatus] = useState('all')
  const [modal, setModal] = useState(false)
  const { data, loading, error, reload } = useLoad(async () => {
    let q = supabase.from('projects').select('*, clients(name), project_members(user_id, profiles(full_name))').order('created_at', { ascending: false })
    if (status !== 'all') q = q.eq('status', status)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  }, [status])
  return (
    <>
      <PageHeader title="Projects" action={manage && <button className="btn-primary" onClick={() => setModal(true)}><Plus className="h-4 w-4" />New project</button>} />
      <div className="mb-3 flex gap-2 overflow-x-auto">
        {['all', ...STATUSES].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${status === s ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'}`}>{s.replace('_', ' ')}</button>
        ))}
      </div>
      {error && <ErrorBox message={error} />}
      {loading && !data ? <Spinner /> : data && data.length === 0 ? (
        <div className="card"><Empty title="No projects yet" text="Create a project, assign your team and track it to the deadline." action={manage ? <button className="btn-primary" onClick={() => setModal(true)}>New project</button> : undefined} /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data?.map((p: any, i: number) => {
            const n = daysUntil(p.deadline)
            return (
              <Link key={p.id} to={p.id} style={{ animationDelay: `${i * 30}ms` }} className="card animate-fadeUp transition hover:border-brand-400 active:scale-[.98]">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate font-medium">{p.name}</div><div className="truncate text-xs text-slate-500">{p.clients?.name || 'No client'}</div></div><StatusBadge value={p.status} /></div>
                <div className="mt-3"><Progress value={p.progress} /><div className="mt-1 flex justify-between text-xs text-slate-500"><span>{p.progress}%</span><span className={n !== null && n < 0 && p.status !== 'completed' ? 'text-red-600' : ''}>{p.deadline ? fmtDate(p.deadline) : 'No deadline'}</span></div></div>
                <div className="mt-2 flex -space-x-2">{p.project_members?.slice(0, 5).map((m: any) => <div key={m.user_id} className="rounded-full ring-2 ring-white dark:ring-slate-900"><Avatar name={m.profiles?.full_name} size={26} /></div>)}</div>
              </Link>
            )
          })}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="New project"><ProjectForm onClose={() => setModal(false)} onDone={() => { setModal(false); reload() }} /></Modal>
    </>
  )
}

function Detail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const manage = canManage(profile?.role)
  const lead = canLead(profile?.role)
  const [edit, setEdit] = useState(false)
  const [ms, setMs] = useState('')
  const { data, loading, error, reload } = useLoad(async () => {
    const [p, m, t] = await Promise.all([
      supabase.from('projects').select('*, clients(id,name), project_members(user_id, profiles(id,full_name,job_title))').eq('id', id!).single(),
      supabase.from('milestones').select('*').eq('project_id', id!).order('due_date'),
      supabase.from('tasks').select('id,title,status,priority,due_date,profiles:assignee_id(full_name)').eq('project_id', id!).is('parent_id', null).order('created_at', { ascending: false }),
    ])
    if (p.error) throw p.error
    return { p: p.data, milestones: m.data ?? [], tasks: t.data ?? [] }
  }, [id])

  async function addMs(e: FormEvent) {
    e.preventDefault()
    if (!ms.trim()) return
    await supabase.from('milestones').insert({ project_id: id, title: ms.trim() })
    setMs(''); reload()
  }
  async function toggleMs(m: any) { await supabase.from('milestones').update({ done: !m.done }).eq('id', m.id); reload() }
  async function remove() {
    if (!confirm('Delete this project and its tasks?')) return
    const { error } = await supabase.from('projects').delete().eq('id', id!)
    if (error) return alert(error.message)
    logActivity('deleted project', 'project', id); nav('/projects')
  }

  if (loading && !data) return <Spinner />
  if (error || !data) return <ErrorBox message={error || 'Project not found.'} />
  const { p, milestones, tasks } = data
  const done = tasks.filter((t: any) => t.status === 'done').length

  return (
    <>
      <Link to="/projects" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />Projects</Link>
      <div className="card mb-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold">{p.name}</h1><StatusBadge value={p.status} /></div>
            {p.clients && <Link to={`/clients/${p.clients.id}`} className="text-sm text-brand-600">{p.clients.name}</Link>}
            {p.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{p.description}</p>}
          </div>
          {manage && <div className="flex gap-1"><button className="btn-ghost !p-2" aria-label="Edit project" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" /></button><button className="btn-ghost !p-2 text-red-600" aria-label="Delete project" onClick={remove}><Trash2 className="h-4 w-4" /></button></div>}
        </div>
        <div className="mt-4"><Progress value={p.progress} /><div className="mt-1 text-xs text-slate-500">{p.progress}% complete · {done}/{tasks.length} tasks done</div></div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
          {[['Start', fmtDate(p.start_date)], ['Deadline', fmtDate(p.deadline)], ...(manage ? [['Budget', pkr(p.budget)]] : []), ['Team', p.project_members.length]].map(([l, v]) => (
            <div key={String(l)} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="text-xs text-slate-500">{l}</div><div className="font-semibold">{v}</div></div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-2 font-medium">Team</div>
          {p.project_members.length === 0 && <p className="text-sm text-slate-500">No one is assigned yet.</p>}
          {p.project_members.map((m: any) => (
            <div key={m.user_id} className="flex items-center gap-3 border-t border-slate-100 py-2 first:border-0 dark:border-slate-800"><Avatar name={m.profiles?.full_name} size={30} /><div className="text-sm">{m.profiles?.full_name}<div className="text-xs text-slate-500">{m.profiles?.job_title}</div></div></div>
          ))}
        </div>
        <div className="card">
          <div className="mb-2 flex items-center gap-2 font-medium"><CalendarClock className="h-4 w-4 text-brand-600" />Milestones</div>
          {lead && <form onSubmit={addMs} className="mb-2 flex gap-2"><input className="input" placeholder="Add a milestone" value={ms} onChange={(e) => setMs(e.target.value)} /><button className="btn-primary">Add</button></form>}
          {milestones.length === 0 && <p className="text-sm text-slate-500">No milestones yet.</p>}
          {milestones.map((m: any) => (
            <button key={m.id} disabled={!lead} onClick={() => toggleMs(m)} className="flex w-full items-center gap-3 border-t border-slate-100 py-2 text-left text-sm first:border-0 dark:border-slate-800">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${m.done ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'}`}>{m.done && <Check className="h-3 w-3" />}</span>
              <span className={m.done ? 'text-slate-400 line-through' : ''}>{m.title}</span>
            </button>
          ))}
        </div>
        <div className="card lg:col-span-2">
          <div className="mb-2 flex items-center justify-between font-medium">Tasks <Link to={`/tasks?project=${id}`} className="text-sm font-normal text-brand-600">Open board</Link></div>
          {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks yet. Create them from the Tasks page.</p>}
          {tasks.map((t: any) => (
            <div key={t.id} className="flex items-center gap-2 border-t border-slate-100 py-2 text-sm first:border-0 dark:border-slate-800">
              <span className="min-w-0 flex-1 truncate">{t.title}</span><span className="hidden text-xs text-slate-500 sm:block">{t.profiles?.full_name}</span><StatusBadge value={t.priority} /><StatusBadge value={t.status} />
            </div>
          ))}
        </div>
        <div className="card lg:col-span-2"><Files link={{ project_id: id! }} canDelete={lead} /></div>
      </div>
      <Modal open={edit} onClose={() => setEdit(false)} title="Edit project"><ProjectForm initial={p} onClose={() => setEdit(false)} onDone={() => { setEdit(false); reload() }} /></Modal>
    </>
  )
}

export default function Projects() {
  return <Routes><Route index element={<List />} /><Route path=":id" element={<Detail />} /></Routes>
}
