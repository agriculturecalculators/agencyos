import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Loader2, X, Inbox } from 'lucide-react'
import { cn } from '../lib/utils'

const tones: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  blue: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200',
  gray: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

const statusTone: Record<string, string> = {
  active: 'green', paid: 'green', won: 'green', done: 'green', approved: 'green', completed: 'green', present: 'green',
  pending: 'amber', preparing: 'amber', medium: 'amber', review: 'amber', on_hold: 'amber', paused: 'amber', late: 'amber',
  overdue: 'red', lost: 'red', urgent: 'red', high: 'red', rejected: 'red', absent: 'red',
  submitted: 'blue', in_progress: 'blue', new: 'blue', low: 'blue', todo: 'gray', inactive: 'gray', leave: 'gray',
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: string }) {
  return <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium', tones[tone])}>{children}</span>
}

export function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return null
  return <Badge tone={statusTone[value] || 'gray'}>{value.replace(/_/g, ' ')}</Badge>
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 animate-fadeUp">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10 text-brand-600">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  )
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center animate-fadeUp">
      <div className="rounded-full bg-brand-50 p-3 text-brand-600 dark:bg-brand-900/40"><Inbox className="h-6 w-6" /></div>
      <div className="font-medium">{title}</div>
      {text && <p className="max-w-xs text-sm text-slate-500">{text}</p>}
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 animate-slideUp dark:bg-slate-900 sm:max-w-lg sm:rounded-2xl sm:animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  )
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
      <div className="h-2 rounded-full bg-brand-600 transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

export function Avatar({ name, size = 36 }: { name?: string | null; size?: number }) {
  const t = (name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
  return (
    <div style={{ width: size, height: size }} className="flex flex-none items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
      {t}
    </div>
  )
}

// Tiny data-loading hook: runs an async loader, exposes reload.
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setData(await loader())
      setError(null)
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => {
    reload()
  }, [reload])
  return { data, loading, error, reload, setData }
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{message}</div>
}
