import clsx, { type ClassValue } from 'clsx'

export const cn = (...v: ClassValue[]) => clsx(v)

export const pkr = (n: number | string | null | undefined) =>
  'PKR ' + Math.round(Number(n || 0)).toLocaleString('en-US')

export const pkrShort = (n: number) => {
  const v = Number(n || 0)
  if (Math.abs(v) >= 1_000_000) return 'PKR ' + (v / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1_000) return 'PKR ' + Math.round(v / 1_000) + 'K'
  return 'PKR ' + Math.round(v)
}

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

export const initials = (name?: string | null) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

export const daysUntil = (d?: string | null) => {
  if (!d) return null
  const diff = new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
  return Math.round(diff / 86_400_000)
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
