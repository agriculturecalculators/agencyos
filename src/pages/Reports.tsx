import { useState, type FormEvent } from 'react'
import { Check, ExternalLink, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { canLead, useAuth } from '../lib/auth'
import { logActivity } from '../lib/data'
import { Avatar, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, StatusBadge, useLoad } from '../components/ui'
import { fmtDate } from '../lib/utils'

const today = () => new Date().toISOString().slice(0, 10)

function ReportForm({ initial, onDone, onClose }: { initial?: any; onDone: () => void; onClose: () => void }) {
  const { profile } = useAuth()
  const [f, setF] = useState<any>(initial ?? { report_date: today(), summary: '', completed: '', pending: '', hours: 8, links: '', challenges: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!f.completed.trim()) return setErr('List what you completed today.')
    const hours = Number(f.hours)
    if (!(hours > 0 && hours <= 24)) return setErr('Hours must be between 1 and 24.')
    setBusy(true); setErr('')
    const payload = { user_id: profile!.id, report_date: f.report_date, summary: f.summary || null, completed: f.completed, pending: f.pending || null, hours, links: f.links || null, challenges: f.challenges || null, status: 'submitted' }
    const { error } = initial?.id
      ? await supabase.from('daily_reports').update(payload).eq('id', initial.id)
      : await supabase.from('daily_reports').insert(payload)
    setBusy(false)
    if (error) return setErr(error.code === '23505' ? 'You already submitted a report for that date.' : error.message)
    logActivity('submitted daily report', 'daily_report'); onDone()
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorBox message={err} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><input className="input" type="date" max={today()} value={f.report_date} onChange={set('report_date')} /></Field>
        <Field label="Hours worked"><input className="input" type="number" step="0.5" min="0.5" max="24" value={f.hours} onChange={set('hours')} /></Field>
      </div>
      <Field label="Completed today"><textarea className="input" rows={3} value={f.completed} onChange={set('completed')} placeholder="Finished homepage banners, replied to 5 client emails" /></Field>
      <Field label="Pending work"><textarea className="input" rows={2} value={f.pending ?? ''} onChange={set('pending')} /></Field>
      <Field label="Supporting links"><input className="input" value={f.links ?? ''} onChange={set('links')} placeholder="https://drive.google.com/…" /></Field>
      <Field label="Challenges"><textarea className="input" rows={2} value={f.challenges ?? ''} onChange={set('challenges')} /></Field>
      <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Submit report'}</button></div>
    </form>
  )
}

export default function Reports() {
  const { profile } = useAuth()
  const lead = canLead(profile?.role)
  const [tab, setTab] = useState<'mine' | 'team'>(lead ? 'team' : 'mine')
  const [modal, setModal] = useState<any>(null)
  const [review, setReview] = useState<any>(null)
  const [note, setNote] = useState('')
  const { data, loading, error, reload } = useLoad(async () => {
    let q = supabase.from('daily_reports').select('*, profiles:user_id(full_name)').order('report_date', { ascending: false }).limit(60)
    if (tab === 'mine') q = q.eq('user_id', profile!.id)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  }, [tab])

  async function decide(status: 'approved' | 'rejected') {
    const { error } = await supabase.from('daily_reports').update({ status, reviewed_by: profile!.id, review_note: note || null }).eq('id', review.id)
    if (error) return alert(error.message)
    await supabase.from('notifications').insert({ user_id: review.user_id, title: `Your report was ${status}`, body: note || fmtDate(review.report_date) })
    logActivity(status + ' daily report', 'daily_report', review.id)
    setReview(null); setNote(''); reload()
  }

  return (
    <>
      <PageHeader title="Daily reports" action={<button className="btn-primary" onClick={() => setModal({})}>Submit today's report</button>} />
      {lead && <div className="mb-3 flex gap-2">{(['team', 'mine'] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${tab === t ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>{t === 'team' ? 'Team reports' : 'My reports'}</button>)}</div>}
      {error && <ErrorBox message={error} />}
      {loading && !data ? <Spinner /> : data && data.length === 0 ? <div className="card"><Empty title="No reports yet" text="Submit a report at the end of each day so your manager sees your progress." /></div> : (
        <div className="space-y-3">
          {data?.map((r: any) => (
            <div key={r.id} className="card animate-fadeUp">
              <div className="flex items-center gap-3"><Avatar name={r.profiles?.full_name} size={34} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{r.profiles?.full_name}</div><div className="text-xs text-slate-500">{fmtDate(r.report_date)} · {r.hours}h</div></div><StatusBadge value={r.status} /></div>
              <div className="mt-3 space-y-2 text-sm">
                <div><span className="text-xs text-slate-500">Completed</span><div className="whitespace-pre-line">{r.completed}</div></div>
                {r.pending && <div><span className="text-xs text-slate-500">Pending</span><div className="whitespace-pre-line">{r.pending}</div></div>}
                {r.challenges && <div><span className="text-xs text-slate-500">Challenges</span><div className="whitespace-pre-line">{r.challenges}</div></div>}
                {r.links && <a href={r.links.startsWith('http') ? r.links : `https://${r.links}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600"><ExternalLink className="h-3.5 w-3.5" />Supporting link</a>}
                {r.review_note && <div className="rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800">Manager note: {r.review_note}</div>}
              </div>
              <div className="mt-3 flex gap-2">
                {lead && r.user_id !== profile!.id && r.status === 'submitted' && <button className="btn-primary !py-1.5 text-xs" onClick={() => setReview(r)}>Review</button>}
                {r.user_id === profile!.id && r.status !== 'approved' && <button className="btn-ghost !py-1.5 text-xs" onClick={() => setModal(r)}>Edit</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!modal} onClose={() => setModal(null)} title="Daily report">{modal && <ReportForm initial={modal.id ? modal : undefined} onClose={() => setModal(null)} onDone={() => { setModal(null); reload() }} />}</Modal>
      <Modal open={!!review} onClose={() => setReview(null)} title="Review report">
        <Field label="Note for the employee (optional)"><textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="mt-3 flex justify-end gap-2"><button className="btn-ghost text-red-600" onClick={() => decide('rejected')}><X className="h-4 w-4" />Reject</button><button className="btn-primary" onClick={() => decide('approved')}><Check className="h-4 w-4" />Approve</button></div>
      </Modal>
    </>
  )
}
