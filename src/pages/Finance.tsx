import { useState, type FormEvent } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { fetchClientOptions, fetchProfiles, fetchProjectOptions, logActivity } from '../lib/data'
import { Empty, ErrorBox, Field, Modal, PageHeader, Spinner, StatusBadge, useLoad } from '../components/ui'
import { downloadCsv, fmtDate, pkr } from '../lib/utils'

type Tab = 'invoices' | 'payments' | 'expenses' | 'salaries' | 'profit'
const today = () => new Date().toISOString().slice(0, 10)

function InvoiceForm({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const opts = useLoad(async () => ({ clients: await fetchClientOptions(), projects: await fetchProjectOptions() }))
  const [f, setF] = useState<any>({ client_id: '', project_id: '', number: 'INV-' + Date.now().toString().slice(-6), issue_date: today(), due_date: '', total: '' })
  const [err, setErr] = useState('')
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!f.client_id) return setErr('Choose a client.')
    if (!(Number(f.total) > 0)) return setErr('Enter an amount above zero.')
    const { data, error } = await supabase.from('invoices').insert({ client_id: f.client_id, project_id: f.project_id || null, number: f.number, issue_date: f.issue_date, due_date: f.due_date || null, total: Number(f.total) }).select('id').single()
    if (error) return setErr(error.message)
    logActivity('created invoice ' + f.number, 'invoice', data.id); onDone()
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorBox message={err} />}
      <Field label="Client"><select className="input" value={f.client_id} onChange={set('client_id')}><option value="">Choose client</option>{opts.data?.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Project (optional)"><select className="input" value={f.project_id} onChange={set('project_id')}><option value="">None</option>{opts.data?.projects.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Invoice number"><input className="input" value={f.number} onChange={set('number')} /></Field>
        <Field label="Amount (PKR)"><input className="input" type="number" min={1} value={f.total} onChange={set('total')} /></Field>
        <Field label="Issue date"><input className="input" type="date" value={f.issue_date} onChange={set('issue_date')} /></Field>
        <Field label="Due date"><input className="input" type="date" value={f.due_date} onChange={set('due_date')} /></Field>
      </div>
      <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Create invoice</button></div>
    </form>
  )
}

function PaymentForm({ invoice, onDone, onClose }: { invoice: any; onDone: () => void; onClose: () => void }) {
  const left = Number(invoice.total) - invoice.paid
  const [amount, setAmount] = useState(String(left))
  const [method, setMethod] = useState('Bank transfer')
  const [err, setErr] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    const a = Number(amount)
    if (!(a > 0)) return setErr('Enter an amount above zero.')
    if (a > left) return setErr(`That is more than the ${pkr(left)} still due.`)
    const { error } = await supabase.from('payments').insert({ invoice_id: invoice.id, client_id: invoice.client_id, amount: a, method, paid_on: today() })
    if (error) return setErr(error.message)
    if (a >= left) await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoice.id)
    logActivity('recorded payment on ' + invoice.number, 'invoice', invoice.id); onDone()
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorBox message={err} />}
      <p className="text-sm text-slate-500">{invoice.number} · {pkr(left)} still due</p>
      <Field label="Amount received (PKR)"><input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      <Field label="Method"><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>{['Bank transfer', 'Cash', 'JazzCash', 'Easypaisa', 'Cheque'].map((m) => <option key={m}>{m}</option>)}</select></Field>
      <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Record payment</button></div>
    </form>
  )
}

function ExpenseForm({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const projects = useLoad(fetchProjectOptions)
  const [f, setF] = useState<any>({ title: '', category: 'Software', amount: '', spent_on: today(), project_id: '' })
  const [err, setErr] = useState('')
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!f.title.trim() || !(Number(f.amount) > 0)) return setErr('Enter a title and an amount above zero.')
    const { error } = await supabase.from('expenses').insert({ title: f.title.trim(), category: f.category, amount: Number(f.amount), spent_on: f.spent_on, project_id: f.project_id || null })
    if (error) return setErr(error.message)
    logActivity('added expense', 'expense'); onDone()
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorBox message={err} />}
      <Field label="What was it for"><input className="input" value={f.title} onChange={set('title')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category"><select className="input" value={f.category} onChange={set('category')}>{['Software', 'Ads', 'Office', 'Utilities', 'Travel', 'Other'].map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Amount (PKR)"><input className="input" type="number" min={1} value={f.amount} onChange={set('amount')} /></Field>
        <Field label="Date"><input className="input" type="date" value={f.spent_on} onChange={set('spent_on')} /></Field>
        <Field label="Project"><select className="input" value={f.project_id} onChange={set('project_id')}><option value="">None</option>{projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      </div>
      <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Save expense</button></div>
    </form>
  )
}

function SalaryForm({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const people = useLoad(fetchProfiles)
  const [f, setF] = useState<any>({ user_id: '', month: today().slice(0, 7), amount: '' })
  const [err, setErr] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!f.user_id || !(Number(f.amount) > 0)) return setErr('Choose an employee and enter an amount above zero.')
    const { error } = await supabase.from('salaries').insert({ user_id: f.user_id, month: f.month + '-01', amount: Number(f.amount) })
    if (error) return setErr(error.message)
    logActivity('added salary', 'salary'); onDone()
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorBox message={err} />}
      <Field label="Employee"><select className="input" value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })}><option value="">Choose employee</option>{people.data?.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Month"><input className="input" type="month" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} /></Field><Field label="Amount (PKR)"><input className="input" type="number" min={1} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field></div>
      <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Save</button></div>
    </form>
  )
}

export default function Finance() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [tab, setTab] = useState<Tab>('invoices')
  const [modal, setModal] = useState<null | 'invoice' | 'expense' | 'salary' | any>(null)
  const { data, loading, error, reload } = useLoad(async () => {
    const [inv, pay, exp, sal, prj] = await Promise.all([
      supabase.from('invoices').select('*, clients(name)').order('issue_date', { ascending: false }),
      supabase.from('payments').select('*, clients(name), invoices(number)').order('paid_on', { ascending: false }),
      supabase.from('expenses').select('*, projects(name)').order('spent_on', { ascending: false }),
      isAdmin ? supabase.from('salaries').select('*, profiles:user_id(full_name)').order('month', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
      supabase.from('projects').select('id,name,budget'),
    ])
    const paidBy: Record<string, number> = {}
    pay.data?.forEach((p: any) => (paidBy[p.invoice_id] = (paidBy[p.invoice_id] ?? 0) + Number(p.amount)))
    const invoices = (inv.data ?? []).map((i: any) => ({ ...i, paid: paidBy[i.id] ?? 0, shown: i.status === 'pending' && i.due_date && i.due_date < today() ? 'overdue' : i.status }))
    return { invoices, payments: pay.data ?? [], expenses: exp.data ?? [], salaries: sal.data ?? [], projects: prj.data ?? [] }
  }, [isAdmin])

  async function del(table: string, id: string) {
    if (!confirm('Delete this record?')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return alert(error.message)
    reload()
  }

  if (loading && !data) return <Spinner />
  if (error || !data) return <ErrorBox message={error || 'Could not load finance.'} />
  const income = data.payments.reduce((s: number, p: any) => s + Number(p.amount), 0)
  const spend = data.expenses.reduce((s: number, p: any) => s + Number(p.amount), 0)
  const wages = data.salaries.filter((s: any) => s.paid).reduce((s: number, p: any) => s + Number(p.amount), 0)
  const pending = data.invoices.reduce((s: number, i: any) => s + (i.status === 'paid' ? 0 : Number(i.total) - i.paid), 0)
  const tabs: [Tab, string][] = [['invoices', 'Invoices'], ['payments', 'Payments'], ['expenses', 'Expenses'], ...(isAdmin ? [['salaries', 'Salaries'] as [Tab, string]] : []), ['profit', 'Profitability']]

  const addButton = tab === 'invoices' ? 'invoice' : tab === 'expenses' ? 'expense' : tab === 'salaries' ? 'salary' : null
  const exportCsv = () => {
    if (tab === 'invoices') downloadCsv('invoices.csv', data.invoices.map((i: any) => ({ number: i.number, client: i.clients?.name, issued: i.issue_date, due: i.due_date, total: i.total, paid: i.paid, status: i.shown })))
    if (tab === 'payments') downloadCsv('payments.csv', data.payments.map((p: any) => ({ date: p.paid_on, client: p.clients?.name, invoice: p.invoices?.number, amount: p.amount, method: p.method })))
    if (tab === 'expenses') downloadCsv('expenses.csv', data.expenses.map((p: any) => ({ date: p.spent_on, title: p.title, category: p.category, project: p.projects?.name, amount: p.amount })))
    if (tab === 'salaries') downloadCsv('salaries.csv', data.salaries.map((p: any) => ({ month: p.month, employee: p.profiles?.full_name, amount: p.amount, paid: p.paid })))
  }

  return (
    <>
      <PageHeader title="Finance" action={<div className="flex gap-2">{tab !== 'profit' && <button className="btn-ghost" onClick={exportCsv}><Download className="h-4 w-4" />CSV</button>}{addButton && <button className="btn-primary" onClick={() => setModal(addButton)}><Plus className="h-4 w-4" />Add</button>}</div>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Income received', pkr(income)], ['Pending balance', pkr(pending)], ['Expenses and salaries', pkr(spend + wages)], ['Net profit', pkr(income - spend - wages)]].map(([l, v]) => <div key={l} className="card"><div className="text-xs text-slate-500">{l}</div><div className="mt-1 truncate text-lg font-semibold">{v}</div></div>)}
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${tab === k ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>{l}</button>)}</div>
      <div className="card">
        {tab === 'invoices' && (data.invoices.length === 0 ? <Empty title="No invoices yet" text="Create an invoice for a client to start tracking what you're owed." /> : data.invoices.map((i: any) => (
          <div key={i.id} className="flex items-center gap-2 border-t border-slate-100 py-2.5 text-sm first:border-0 dark:border-slate-800">
            <div className="min-w-0 flex-1"><div className="truncate">{i.number} · {i.clients?.name}</div><div className="text-xs text-slate-500">Due {fmtDate(i.due_date)} · paid {pkr(i.paid)}</div></div>
            <div className="text-right"><div>{pkr(i.total)}</div><StatusBadge value={i.shown} /></div>
            {i.status !== 'paid' && <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setModal(i)}>Pay</button>}
            <button aria-label="Delete invoice" className="text-slate-400 hover:text-red-600" onClick={() => del('invoices', i.id)}><Trash2 className="h-4 w-4" /></button>
          </div>
        )))}
        {tab === 'payments' && (data.payments.length === 0 ? <Empty title="No payments yet" text="Payments you record against invoices show up here." /> : data.payments.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between border-t border-slate-100 py-2.5 text-sm first:border-0 dark:border-slate-800"><div><div>{p.clients?.name}</div><div className="text-xs text-slate-500">{p.invoices?.number} · {fmtDate(p.paid_on)} · {p.method}</div></div><b>{pkr(p.amount)}</b></div>
        )))}
        {tab === 'expenses' && (data.expenses.length === 0 ? <Empty title="No expenses yet" text="Add software, ads and office costs to see real profit." /> : data.expenses.map((p: any) => (
          <div key={p.id} className="flex items-center gap-2 border-t border-slate-100 py-2.5 text-sm first:border-0 dark:border-slate-800"><div className="min-w-0 flex-1"><div className="truncate">{p.title}</div><div className="text-xs text-slate-500">{p.category} · {fmtDate(p.spent_on)} {p.projects?.name ? '· ' + p.projects.name : ''}</div></div><b>{pkr(p.amount)}</b><button aria-label="Delete expense" className="text-slate-400 hover:text-red-600" onClick={() => del('expenses', p.id)}><Trash2 className="h-4 w-4" /></button></div>
        )))}
        {tab === 'salaries' && (data.salaries.length === 0 ? <Empty title="No salary records" text="Add monthly salaries and mark them paid." /> : data.salaries.map((s: any) => (
          <div key={s.id} className="flex items-center gap-2 border-t border-slate-100 py-2.5 text-sm first:border-0 dark:border-slate-800"><div className="min-w-0 flex-1"><div>{s.profiles?.full_name}</div><div className="text-xs text-slate-500">{new Date(s.month).toLocaleString('en', { month: 'long', year: 'numeric' })}</div></div><b>{pkr(s.amount)}</b>
            <button className="btn-ghost !px-2 !py-1 text-xs" onClick={async () => { await supabase.from('salaries').update({ paid: !s.paid }).eq('id', s.id); reload() }}>{s.paid ? 'Paid' : 'Mark paid'}</button></div>
        )))}
        {tab === 'profit' && (data.projects.length === 0 ? <Empty title="No projects yet" text="Project profitability appears once projects have invoices and expenses." /> : data.projects.map((p: any) => {
          const billed = data.payments.filter((x: any) => data.invoices.find((i: any) => i.id === x.invoice_id)?.project_id === p.id).reduce((s: number, x: any) => s + Number(x.amount), 0)
          const cost = data.expenses.filter((x: any) => x.project_id === p.id).reduce((s: number, x: any) => s + Number(x.amount), 0)
          return <div key={p.id} className="grid grid-cols-4 items-center gap-2 border-t border-slate-100 py-2.5 text-sm first:border-0 dark:border-slate-800"><span className="col-span-2 truncate sm:col-span-1">{p.name}</span><span className="hidden text-slate-500 sm:block">Budget {pkr(p.budget)}</span><span>In {pkr(billed)}</span><b className={billed - cost < 0 ? 'text-red-600' : 'text-emerald-600'}>{pkr(billed - cost)}</b></div>
        }))}
      </div>
      <Modal open={modal === 'invoice'} onClose={() => setModal(null)} title="New invoice"><InvoiceForm onClose={() => setModal(null)} onDone={() => { setModal(null); reload() }} /></Modal>
      <Modal open={modal === 'expense'} onClose={() => setModal(null)} title="Add expense"><ExpenseForm onClose={() => setModal(null)} onDone={() => { setModal(null); reload() }} /></Modal>
      <Modal open={modal === 'salary'} onClose={() => setModal(null)} title="Add salary"><SalaryForm onClose={() => setModal(null)} onDone={() => { setModal(null); reload() }} /></Modal>
      <Modal open={!!modal && typeof modal === 'object'} onClose={() => setModal(null)} title="Record payment">{modal && typeof modal === 'object' && <PaymentForm invoice={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); reload() }} />}</Modal>
    </>
  )
}
