import { useState, type FormEvent } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, Pencil, Phone, Plus, Search, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { canManage, useAuth } from '../lib/auth'
import { logActivity } from '../lib/data'
import { Avatar, Empty, ErrorBox, Field, Modal, PageHeader, Progress, Spinner, StatusBadge, useLoad } from '../components/ui'
import Files from '../components/Files'
import { fmtDate, pkr } from '../lib/utils'

const STATUSES = ['active', 'pending', 'paused', 'inactive']
const blank = { name: '', contact_person: '', email: '', phone: '', address: '', service_package: '', status: 'active' }

function ClientForm({ initial, onDone, onClose }: { initial?: any; onDone: () => void; onClose: () => void }) {
  const [f, setF] = useState<any>(initial ?? blank)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!f.name.trim()) return setErr('Enter the client name.')
    setBusy(true); setErr('')
    const payload = { name: f.name.trim(), contact_person: f.contact_person || null, email: f.email || null, phone: f.phone || null, address: f.address || null, service_package: f.service_package || null, status: f.status }
    const res = initial?.id
      ? await supabase.from('clients').update(payload).eq('id', initial.id).select().single()
      : await supabase.from('clients').insert(payload).select().single()
    setBusy(false)
    if (res.error) return setErr(res.error.message)
    logActivity(initial?.id ? 'updated client' : 'added client', 'client', res.data.id)
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorBox message={err} />}
      <Field label="Client name"><input className="input" value={f.name} onChange={set('name')} placeholder="Hamdan Traders" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact person"><input className="input" value={f.contact_person ?? ''} onChange={set('contact_person')} /></Field>
        <Field label="Phone"><input className="input" value={f.phone ?? ''} onChange={set('phone')} /></Field>
      </div>
      <Field label="Email"><input className="input" type="email" value={f.email ?? ''} onChange={set('email')} placeholder="name@company.com" /></Field>
      <Field label="Address"><input className="input" value={f.address ?? ''} onChange={set('address')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Service package"><input className="input" value={f.service_package ?? ''} onChange={set('service_package')} placeholder="SEO + Social media" /></Field>
        <Field label="Status">
          <select className="input" value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save client'}</button>
      </div>
    </form>
  )
}

function List() {
  const { profile } = useAuth()
  const manage = canManage(profile?.role)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState(false)
  const size = 12
  const { data, loading, error, reload } = useLoad(async () => {
    let query = supabase.from('clients').select('*, projects(count)', { count: 'exact' }).order('created_at', { ascending: false }).range(page * size, page * size + size - 1)
    if (status !== 'all') query = query.eq('status', status)
    if (q.trim()) query = query.ilike('name', `%${q.trim()}%`)
    const { data, count, error } = await query
    if (error) throw error
    return { rows: data ?? [], total: count ?? 0 }
  }, [q, status, page])

  return (
    <>
      <PageHeader title="Clients" subtitle={data ? `${data.total} total` : undefined}
        action={manage && <button className="btn-primary" onClick={() => setModal(true)}><Plus className="h-4 w-4" />Add client</button>} />
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search clients" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} />
        </div>
        <select className="input !w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }} aria-label="Filter by status">
          <option value="all">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {error && <ErrorBox message={error} />}
      {loading && !data ? <Spinner /> : data && data.rows.length === 0 ? (
        <div className="card"><Empty title={q || status !== 'all' ? 'No clients match' : 'Add your first client'} text="Clients you add show up here with their projects and payments."
          action={manage && !q && status === 'all' ? <button className="btn-primary" onClick={() => setModal(true)}>Add client</button> : undefined} /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data?.rows.map((c: any, i: number) => (
            <Link key={c.id} to={c.id} style={{ animationDelay: `${i * 30}ms` }} className="card animate-fadeUp transition hover:border-brand-400 active:scale-[.98]">
              <div className="flex items-center gap-3">
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="truncate text-xs text-slate-500">{c.service_package || 'No package set'}</div>
                </div>
                <StatusBadge value={c.status} />
              </div>
              <div className="mt-3 flex justify-between text-xs text-slate-500">
                <span>{c.projects?.[0]?.count ?? 0} projects</span><span>Since {fmtDate(c.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      {data && data.total > size && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page + 1} of {Math.ceil(data.total / size)}</span>
          <button className="btn-ghost" disabled={(page + 1) * size >= data.total} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="Add client">
        <ClientForm onClose={() => setModal(false)} onDone={() => { setModal(false); reload() }} />
      </Modal>
    </>
  )
}

function Detail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const manage = canManage(profile?.role)
  const [edit, setEdit] = useState(false)
  const [note, setNote] = useState('')
  const { data, loading, error, reload } = useLoad(async () => {
    const [c, p, n, inv, pay, act] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id!).single(),
      supabase.from('projects').select('*, project_members(profiles(id,full_name)), tasks(id,status)').eq('client_id', id!).order('created_at', { ascending: false }),
      supabase.from('client_notes').select('*, profiles(full_name)').eq('client_id', id!).order('created_at', { ascending: false }),
      manage ? supabase.from('invoices').select('*').eq('client_id', id!).order('issue_date', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
      manage ? supabase.from('payments').select('*').eq('client_id', id!).order('paid_on', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
      manage ? supabase.from('activity_logs').select('*, profiles(full_name)').eq('entity_id', id!).order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [] as any[] }),
    ])
    if (c.error) throw c.error
    return { client: c.data, projects: p.data ?? [], notes: n.data ?? [], invoices: inv.data ?? [], payments: pay.data ?? [], activity: act.data ?? [] }
  }, [id])

  async function addNote(e: FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    await supabase.from('client_notes').insert({ client_id: id, body: note.trim(), author_id: profile!.id })
    setNote(''); reload()
  }
  async function remove() {
    if (!confirm('Delete this client? Their projects stay but lose the client link.')) return
    const { error } = await supabase.from('clients').delete().eq('id', id!)
    if (error) return alert(error.message)
    logActivity('deleted client', 'client', id)
    nav('/clients')
  }

  if (loading && !data) return <Spinner />
  if (error || !data) return <ErrorBox message={error || 'Client not found.'} />
  const { client: c, projects, notes, invoices, payments, activity } = data
  const team = new Map<string, string>()
  projects.forEach((p: any) => p.project_members?.forEach((m: any) => m.profiles && team.set(m.profiles.id, m.profiles.full_name)))
  const tasks = projects.flatMap((p: any) => p.tasks ?? [])
  const billed = invoices.reduce((s: number, i: any) => s + Number(i.total), 0)
  const paid = payments.reduce((s: number, i: any) => s + Number(i.amount), 0)

  return (
    <>
      <Link to="/clients" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />Clients</Link>
      <div className="card mb-4">
        <div className="flex items-start gap-3">
          <Avatar name={c.name} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold">{c.name}</h1><StatusBadge value={c.status} /></div>
            <div className="text-sm text-slate-500">{c.service_package || 'No package set'}</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
              {c.contact_person && <span>{c.contact_person}</span>}
              {c.email && <a className="inline-flex items-center gap-1" href={`mailto:${c.email}`}><Mail className="h-3.5 w-3.5" />{c.email}</a>}
              {c.phone && <a className="inline-flex items-center gap-1" href={`tel:${c.phone}`}><Phone className="h-3.5 w-3.5" />{c.phone}</a>}
            </div>
          </div>
          {manage && (
            <div className="flex gap-1">
              <button className="btn-ghost !p-2" onClick={() => setEdit(true)} aria-label="Edit client"><Pencil className="h-4 w-4" /></button>
              <button className="btn-ghost !p-2 text-red-600" onClick={remove} aria-label="Delete client"><Trash2 className="h-4 w-4" /></button>
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[['Projects', projects.length], ['Open tasks', tasks.filter((t: any) => t.status !== 'done').length],
            ...(manage ? [['Billed', pkr(billed)], ['Pending balance', pkr(billed - paid)]] : [['Team', team.size]])].map(([l, v]) => (
            <div key={String(l)} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="text-xs text-slate-500">{l}</div><div className="font-semibold">{v}</div></div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-2 font-medium">Projects</div>
          {projects.length === 0 ? <p className="text-sm text-slate-500">No projects for this client yet.</p> : projects.map((p: any) => (
            <Link to={`/projects/${p.id}`} key={p.id} className="block border-t border-slate-100 py-2.5 first:border-0 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2"><span className="truncate text-sm">{p.name}</span><StatusBadge value={p.status} /></div>
              <div className="mt-1.5"><Progress value={p.progress} /></div>
            </Link>
          ))}
          {team.size > 0 && <div className="mt-3 text-xs text-slate-500">Team: {[...team.values()].join(', ')}</div>}
        </div>
        <div className="card">
          <div className="mb-2 font-medium">Communication notes</div>
          <form onSubmit={addNote} className="mb-2 flex gap-2">
            <input className="input" placeholder="Call summary, request, decision" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn-primary">Add</button>
          </form>
          {notes.length === 0 && <p className="text-sm text-slate-500">No notes yet.</p>}
          {notes.map((n: any) => (
            <div key={n.id} className="border-t border-slate-100 py-2 text-sm first:border-0 dark:border-slate-800">
              {n.body}<div className="text-xs text-slate-500">{n.profiles?.full_name} · {fmtDate(n.created_at)}</div>
            </div>
          ))}
        </div>
        {manage && (
          <div className="card">
            <div className="mb-2 font-medium">Invoices and payments</div>
            {invoices.length === 0 && <p className="text-sm text-slate-500">No invoices yet.</p>}
            {invoices.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between border-t border-slate-100 py-2 text-sm first:border-0 dark:border-slate-800">
                <span>{i.number}<span className="ml-2 text-xs text-slate-500">{fmtDate(i.issue_date)}</span></span>
                <span className="flex items-center gap-2">{pkr(i.total)}<StatusBadge value={i.status} /></span>
              </div>
            ))}
            {payments.length > 0 && <div className="mt-3 text-xs text-slate-500">{payments.length} payments received, total {pkr(paid)}</div>}
          </div>
        )}
        <div className="card"><Files link={{ client_id: id! }} canDelete={manage} /></div>
        {manage && activity.length > 0 && (
          <div className="card lg:col-span-2">
            <div className="mb-2 font-medium">Activity history</div>
            {activity.map((a: any) => <div key={a.id} className="border-t border-slate-100 py-1.5 text-sm first:border-0 dark:border-slate-800">{a.profiles?.full_name} {a.action} <span className="text-xs text-slate-500">· {fmtDate(a.created_at)}</span></div>)}
          </div>
        )}
      </div>
      <Modal open={edit} onClose={() => setEdit(false)} title="Edit client">
        <ClientForm initial={c} onClose={() => setEdit(false)} onDone={() => { setEdit(false); reload() }} />
      </Modal>
    </>
  )
}

export default function Clients() {
  return (
    <Routes>
      <Route index element={<List />} />
      <Route path=":id" element={<Detail />} />
    </Routes>
  )
}
