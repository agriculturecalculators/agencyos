import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock, MessageSquare, Pencil, Play, Plus, Square, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { canLead, useAuth } from '../lib/auth'
import { fetchProfiles, fetchProjectOptions, logActivity } from '../lib/data'
import { Avatar, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, StatusBadge, useLoad } from '../components/ui'
import Files from '../components/Files'
import { fmtDate } from '../lib/utils'

const COLS = [
  ['todo', 'To do'],
  ['in_progress', 'In progress'],
  ['review', 'Review'],
  ['done', 'Done'],
] as const
const PRIORITIES = ['low', 'medium', 'high', 'urgent']

function TaskForm({ initial, parentId, defaultProject, onDone, onClose }: { initial?: any; parentId?: string; defaultProject?: string; onDone: () => void; onClose: () => void }) {
  const { profile } = useAuth()
  const opts = useLoad(async () => ({ projects: await fetchProjectOptions(), people: await fetchProfiles() }))
  const [f, setF] = useState<any>(initial ?? { title: '', description: '', project_id: defaultProject ?? '', assignee_id: '', priority: 'medium', status: 'todo', due_date: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!f.title.trim()) return setErr('Enter a task title.')
    setBusy(true); setErr('')
    const payload: any = { title: f.title.trim(), description: f.description || null, project_id: f.project_id || null, assignee_id: f.assignee_id || null, priority: f.priority, status: f.status, due_date: f.due_date || null }
    if (parentId) payload.parent_id = parentId
    const res = initial?.id
      ? await supabase.from('tasks').update(payload).eq('id', initial.id).select().single()
      : await supabase.from('tasks').insert({ ...payload, created_by: profile!.id }).select().single()
    setBusy(false)
    if (res.error) return setErr(res.error.message)
    if (!initial?.id && payload.assignee_id && payload.assignee_id !== profile!.id)
      await supabase.from('notifications').insert({ user_id: payload.assignee_id, title: 'New task assigned', body: payload.title })
    logActivity(initial?.id ? 'updated task' : 'created task', 'task', res.data.id)
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorBox message={err} />}
      <Field label="Title"><input className="input" value={f.title} onChange={set('title')} autoFocus /></Field>
      <Field label="Description"><textarea className="input" rows={2} value={f.description ?? ''} onChange={set('description')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Project"><select className="input" value={f.project_id ?? ''} onChange={set('project_id')}><option value="">None</option>{opts.data?.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Assign to"><select className="input" value={f.assignee_id ?? ''} onChange={set('assignee_id')}><option value="">Unassigned</option>{opts.data?.people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
        <Field label="Priority"><select className="input" value={f.priority} onChange={set('priority')}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></Field>
        <Field label="Due date"><input className="input" type="date" value={f.due_date ?? ''} onChange={set('due_date')} /></Field>
      </div>
      <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save task'}</button></div>
    </form>
  )
}

function TaskDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { profile } = useAuth()
  const lead = canLead(profile?.role)
  const [comment, setComment] = useState('')
  const [mins, setMins] = useState('')
  const [edit, setEdit] = useState(false)
  const [sub, setSub] = useState(false)
  const [running, setRunning] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  const timer = useRef<any>(null)
  const { data, reload } = useLoad(async () => {
    const [t, c, te, st] = await Promise.all([
      supabase.from('tasks').select('*, projects(name), assignee:assignee_id(full_name)').eq('id', id).single(),
      supabase.from('task_comments').select('*, profiles(full_name)').eq('task_id', id).order('created_at'),
      supabase.from('time_entries').select('*, profiles(full_name)').eq('task_id', id).order('logged_on', { ascending: false }),
      supabase.from('tasks').select('id,title,status').eq('parent_id', id).order('created_at'),
    ])
    return { t: t.data, comments: c.data ?? [], time: te.data ?? [], subs: st.data ?? [] }
  }, [id])

  useEffect(() => () => clearInterval(timer.current), [])

  async function setStatus(status: string) { await supabase.from('tasks').update({ status }).eq('id', id); reload(); onChanged() }
  async function addComment(e: FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    await supabase.from('task_comments').insert({ task_id: id, author_id: profile!.id, body: comment.trim() })
    setComment(''); reload()
  }
  async function logTime(minutes: number) {
    if (!minutes || minutes < 1) return
    await supabase.from('time_entries').insert({ task_id: id, user_id: profile!.id, minutes: Math.round(minutes) })
    setMins(''); reload()
  }
  function toggleTimer() {
    if (running) {
      clearInterval(timer.current)
      const m = Math.max(1, Math.round((Date.now() - running) / 60000))
      setRunning(null); setTick(0); logTime(m)
    } else {
      const start = Date.now()
      setRunning(start)
      timer.current = setInterval(() => setTick(Math.floor((Date.now() - start) / 1000)), 1000)
    }
  }
  async function toggleSub(s: any) { await supabase.from('tasks').update({ status: s.status === 'done' ? 'todo' : 'done' }).eq('id', s.id); reload() }
  async function remove() {
    if (!confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', id)
    logActivity('deleted task', 'task', id); onChanged(); onClose()
  }

  if (!data?.t) return <Spinner />
  const { t, comments, time, subs } = data
  const total = time.reduce((s: number, x: any) => s + x.minutes, 0)
  const mm = String(Math.floor(tick / 60)).padStart(2, '0') + ':' + String(tick % 60).padStart(2, '0')

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2"><StatusBadge value={t.priority} /><span className="text-xs text-slate-500">{t.projects?.name || 'No project'}</span></div>
        {t.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.description}</p>}
        <div className="mt-2 text-xs text-slate-500">Assigned to {t.assignee?.full_name || 'nobody'} · Due {fmtDate(t.due_date)}</div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COLS.map(([k, l]) => <button key={k} onClick={() => setStatus(k)} className={`rounded-full px-3 py-1 text-xs font-medium ${t.status === k ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{l}</button>)}
      </div>
      <div className="flex gap-2">
        {lead && <button className="btn-ghost !py-1.5 text-xs" onClick={() => setEdit(true)}><Pencil className="h-3.5 w-3.5" />Edit</button>}
        {lead && <button className="btn-ghost !py-1.5 text-xs" onClick={() => setSub(true)}><Plus className="h-3.5 w-3.5" />Subtask</button>}
        {lead && <button className="btn-ghost !py-1.5 text-xs text-red-600" onClick={remove}><Trash2 className="h-3.5 w-3.5" />Delete</button>}
      </div>
      {subs.length > 0 && (
        <div><div className="mb-1 text-sm font-medium">Subtasks</div>
          {subs.map((s: any) => (
            <label key={s.id} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" className="accent-brand-600" checked={s.status === 'done'} onChange={() => toggleSub(s)} /><span className={s.status === 'done' ? 'line-through text-slate-400' : ''}>{s.title}</span></label>
          ))}
        </div>
      )}
      <div>
        <div className="mb-1 flex items-center gap-2 text-sm font-medium"><Clock className="h-4 w-4 text-brand-600" />Time tracked: {Math.floor(total / 60)}h {total % 60}m</div>
        <div className="flex gap-2">
          <button className={running ? 'btn-danger' : 'btn-primary'} onClick={toggleTimer}>{running ? <><Square className="h-4 w-4" />Stop {mm}</> : <><Play className="h-4 w-4" />Start timer</>}</button>
          <input className="input" type="number" min={1} placeholder="Minutes" value={mins} onChange={(e) => setMins(e.target.value)} />
          <button className="btn-ghost" onClick={() => logTime(Number(mins))}>Log</button>
        </div>
        {time.slice(0, 3).map((x: any) => <div key={x.id} className="mt-1 text-xs text-slate-500">{x.profiles?.full_name}: {x.minutes} min on {fmtDate(x.logged_on)}</div>)}
      </div>
      <Files link={{ task_id: id }} canDelete={lead} />
      <div>
        <div className="mb-1 flex items-center gap-2 text-sm font-medium"><MessageSquare className="h-4 w-4 text-brand-600" />Comments</div>
        {comments.map((c: any) => <div key={c.id} className="border-t border-slate-100 py-2 text-sm dark:border-slate-800">{c.body}<div className="text-xs text-slate-500">{c.profiles?.full_name} · {fmtDate(c.created_at)}</div></div>)}
        <form onSubmit={addComment} className="mt-2 flex gap-2"><input className="input" placeholder="Write a comment" value={comment} onChange={(e) => setComment(e.target.value)} /><button className="btn-primary">Send</button></form>
      </div>
      <Modal open={edit} onClose={() => setEdit(false)} title="Edit task"><TaskForm initial={t} onClose={() => setEdit(false)} onDone={() => { setEdit(false); reload(); onChanged() }} /></Modal>
      <Modal open={sub} onClose={() => setSub(false)} title="New subtask"><TaskForm parentId={id} defaultProject={t.project_id} onClose={() => setSub(false)} onDone={() => { setSub(false); reload() }} /></Modal>
    </div>
  )
}

export default function Tasks() {
  const { profile } = useAuth()
  const lead = canLead(profile?.role)
  const [sp, setSp] = useSearchParams()
  const project = sp.get('project') || ''
  const [mine, setMine] = useState(!lead)
  const [col, setCol] = useState<string>('todo')
  const [modal, setModal] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const projects = useLoad(fetchProjectOptions)
  const { data, loading, error, reload } = useLoad(async () => {
    let q = supabase.from('tasks').select('*, projects(name), assignee:assignee_id(full_name)').is('parent_id', null).order('created_at', { ascending: false })
    if (project) q = q.eq('project_id', project)
    if (mine) q = q.eq('assignee_id', profile!.id)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  }, [project, mine])

  useEffect(() => {
    const ch = supabase.channel('tasks-live').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => reload()).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [reload])

  async function move(t: any, status: string) {
    await supabase.from('tasks').update({ status }).eq('id', t.id)
    reload()
  }

  return (
    <>
      <PageHeader title="Tasks" action={<button className="btn-primary" onClick={() => setModal(true)}><Plus className="h-4 w-4" />New task</button>} />
      <div className="mb-3 flex flex-wrap gap-2">
        <select className="input !w-auto" value={project} onChange={(e) => setSp(e.target.value ? { project: e.target.value } : {})} aria-label="Filter by project">
          <option value="">All projects</option>{projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className={`rounded-xl border px-3 text-sm ${mine ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-700'}`} onClick={() => setMine(!mine)}>My tasks</button>
      </div>
      <div className="mb-3 flex gap-1.5 overflow-x-auto lg:hidden">
        {COLS.map(([k, l]) => <button key={k} onClick={() => setCol(k)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${col === k ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'}`}>{l} {data?.filter((t: any) => t.status === k).length ?? 0}</button>)}
      </div>
      {error && <ErrorBox message={error} />}
      {loading && !data ? <Spinner /> : data && data.length === 0 ? (
        <div className="card"><Empty title="No tasks here" text="Create a task, assign it, and track it across the board." action={<button className="btn-primary" onClick={() => setModal(true)}>New task</button>} /></div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-4">
          {COLS.map(([k, l]) => (
            <div key={k} className={`rounded-2xl bg-slate-100/70 p-2 dark:bg-slate-900/60 ${col === k ? '' : 'hidden'} lg:block`}>
              <div className="mb-2 hidden px-1 text-sm font-medium lg:block">{l} <span className="text-slate-400">{data?.filter((t: any) => t.status === k).length}</span></div>
              <div className="space-y-2">
                {data?.filter((t: any) => t.status === k).map((t: any) => (
                  <div key={t.id} className="card animate-fadeUp !p-3">
                    <button className="w-full text-left" onClick={() => setOpen(t.id)}>
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="mt-0.5 truncate text-xs text-slate-500">{t.projects?.name || 'No project'}</div>
                    </button>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">{t.assignee && <Avatar name={t.assignee.full_name} size={22} />}<span className="text-xs text-slate-500">{t.due_date ? fmtDate(t.due_date) : ''}</span></div>
                      <StatusBadge value={t.priority} />
                    </div>
                    <select aria-label="Move task" className="mt-2 w-full rounded-lg border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-700" value={t.status} onChange={(e) => move(t, e.target.value)}>
                      {COLS.map(([ck, cl]) => <option key={ck} value={ck}>{cl}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="New task"><TaskForm defaultProject={project} onClose={() => setModal(false)} onDone={() => { setModal(false); reload() }} /></Modal>
      <Modal open={!!open} onClose={() => setOpen(null)} title="Task details">{open && <TaskDetail id={open} onClose={() => setOpen(null)} onChanged={reload} />}</Modal>
    </>
  )
}
