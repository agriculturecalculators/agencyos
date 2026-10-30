import { useState, type FormEvent } from 'react'
import { AlarmClock, ArrowRightCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { canManage, useAuth } from '../lib/auth'
import { fetchProfiles, logActivity } from '../lib/data'
import { Empty, ErrorBox, Field, Modal, PageHeader, Spinner, StatusBadge, useLoad } from '../components/ui'
import Files from '../components/Files'
import { daysUntil, fmtDate, pkr } from '../lib/utils'

const STATUSES = ['new', 'preparing', 'submitted', 'won', 'lost']

function TenderForm({ initial, onDone, onClose }: { initial?: any; onDone: () => void; onClose: () => void }) {
  const people = useLoad(fetchProfiles)
  const [f, setF] = useState<any>(initial ?? { title: '', organization: '', estimated_budget: 0, requirements: '', submission_deadline: '', status: 'new', assigned_to: '' })
  const [err, setErr] = useState('')
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!f.title.trim()) return setErr('Enter the tender title.')
    const payload = { title: f.title.trim(), organization: f.organization || null, estimated_budget: Number(f.estimated_budget) || 0, requirements: f.requirements || null, submission_deadline: f.submission_deadline || null, status: f.status, assigned_to: f.assigned_to || null }
    const res = initial?.id ? await supabase.from('tenders').update(payload).eq('id', initial.id).select().single() : await supabase.from('tenders').insert(payload).select().single()
    if (res.error) return setErr(res.error.message)
    if (payload.assigned_to && payload.assigned_to !== initial?.assigned_to)
      await supabase.from('notifications').insert({ user_id: payload.assigned_to, title: 'Tender assigned to you', body: payload.title })
    logActivity(initial?.id ? 'updated tender' : 'added tender', 'tender', res.data.id); onDone()
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorBox message={err} />}
      <Field label="Tender title"><input className="input" value={f.title} onChange={set('title')} /></Field>
      <Field label="Organization"><input className="input" value={f.organization ?? ''} onChange={set('organization')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estimated budget (PKR)"><input className="input" type="number" min={0} value={f.estimated_budget} onChange={set('estimated_budget')} /></Field>
        <Field label="Submission deadline"><input className="input" type="date" value={f.submission_deadline ?? ''} onChange={set('submission_deadline')} /></Field>
        <Field label="Status"><select className="input" value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Bid prepared by"><select className="input" value={f.assigned_to ?? ''} onChange={set('assigned_to')}><option value="">Unassigned</option>{people.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
      </div>
      <Field label="Requirements"><textarea className="input" rows={3} value={f.requirements ?? ''} onChange={set('requirements')} /></Field>
      <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Save tender</button></div>
    </form>
  )
}

export default function Tenders() {
  const { profile } = useAuth()
  const manage = canManage(profile?.role)
  const [status, setStatus] = useState('all')
  const [modal, setModal] = useState<any>(null)
  const [open, setOpen] = useState<any>(null)
  const { data, loading, error, reload } = useLoad(async () => {
    let q = supabase.from('tenders').select('*, profiles:assigned_to(full_name)').order('submission_deadline', { nullsFirst: false })
    if (status !== 'all') q = q.eq('status', status)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  }, [status])

  async function convert(t: any) {
    if (!confirm('Create a client and an active project from this won tender?')) return
    let clientId: string | null = null
    if (t.organization) {
      const ex = await supabase.from('clients').select('id').ilike('name', t.organization).maybeSingle()
      clientId = ex.data?.id ?? (await supabase.from('clients').insert({ name: t.organization, status: 'active', created_by: profile!.id }).select('id').single()).data?.id ?? null
    }
    const p = await supabase.from('projects').insert({ name: t.title, client_id: clientId, status: 'active', budget: t.estimated_budget, created_by: profile!.id }).select('id').single()
    if (p.error) return alert(p.error.message)
    if (t.assigned_to) await supabase.from('project_members').insert({ project_id: p.data.id, user_id: t.assigned_to })
    await supabase.from('tenders').update({ converted_project_id: p.data.id }).eq('id', t.id)
    logActivity('converted tender to project', 'tender', t.id); setOpen(null); reload()
  }
  async function remove(t: any) {
    if (!confirm('Delete this tender?')) return
    await supabase.from('tenders').delete().eq('id', t.id); setOpen(null); reload()
  }

  return (
    <>
      <PageHeader title="Tenders" action={<button className="btn-primary" onClick={() => setModal({})}><Plus className="h-4 w-4" />New tender</button>} />
      <div className="mb-3 flex gap-2 overflow-x-auto">{['all', ...STATUSES].map((s) => <button key={s} onClick={() => setStatus(s)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${status === s ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>{s}</button>)}</div>
      {error && <ErrorBox message={error} />}
      {loading && !data ? <Spinner /> : data && data.length === 0 ? <div className="card"><Empty title="No tenders yet" text="Track bids from the first look to win or loss, then turn wins into projects." /></div> : (
        <div className="grid gap-3 md:grid-cols-2">
          {data?.map((t: any, i: number) => {
            const n = daysUntil(t.submission_deadline)
            const soon = n !== null && n >= 0 && n <= 3 && ['new', 'preparing'].includes(t.status)
            return (
              <button key={t.id} onClick={() => setOpen(t)} style={{ animationDelay: `${i * 30}ms` }} className="card animate-fadeUp text-left transition hover:border-brand-400 active:scale-[.98]">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate font-medium">{t.title}</div><div className="truncate text-xs text-slate-500">{t.organization || 'No organization'}</div></div><StatusBadge value={t.status} /></div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{pkr(t.estimated_budget)}</span><span className={soon ? 'flex items-center gap-1 font-medium text-red-600' : ''}>{soon && <AlarmClock className="h-3.5 w-3.5" />}{t.submission_deadline ? (n === 0 ? 'Due today' : n === 1 ? 'Due tomorrow' : fmtDate(t.submission_deadline)) : 'No deadline'}</span></div>
              </button>
            )
          })}
        </div>
      )}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit tender' : 'New tender'}>{modal && <TenderForm initial={modal.id ? modal : undefined} onClose={() => setModal(null)} onDone={() => { setModal(null); setOpen(null); reload() }} />}</Modal>
      <Modal open={!!open} onClose={() => setOpen(null)} title="Tender">
        {open && (
          <div className="space-y-4">
            <div><div className="font-semibold">{open.title}</div><div className="text-sm text-slate-500">{open.organization} · {pkr(open.estimated_budget)}</div></div>
            <div className="flex flex-wrap items-center gap-2 text-sm"><StatusBadge value={open.status} /><span>Deadline {fmtDate(open.submission_deadline)}</span><span>· {open.profiles?.full_name || 'Unassigned'}</span></div>
            {open.requirements && <p className="whitespace-pre-line text-sm">{open.requirements}</p>}
            <Files link={{ tender_id: open.id }} />
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={() => { setModal(open); }}><Pencil className="h-4 w-4" />Edit</button>
              {open.status === 'won' && !open.converted_project_id && manage && <button className="btn-primary" onClick={() => convert(open)}><ArrowRightCircle className="h-4 w-4" />Convert to project</button>}
              {open.converted_project_id && <span className="self-center text-sm text-emerald-600">Converted to a project</span>}
              {manage && <button className="btn-ghost text-red-600" onClick={() => remove(open)}><Trash2 className="h-4 w-4" />Delete</button>}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
