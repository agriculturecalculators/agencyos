import { useRef, useState } from 'react'
import { FileText, Paperclip, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { openFile, uploadFile } from '../lib/data'
import { useLoad } from './ui'
import { fmtDate } from '../lib/utils'

type Link = { client_id?: string; project_id?: string; task_id?: string; tender_id?: string }

export default function Files({ link, canDelete = true }: { link: Link; canDelete?: boolean }) {
  const key = Object.keys(link)[0] as keyof Link
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const { data, reload } = useLoad(async () => {
    const { data } = await supabase.from('documents').select('*').eq(key, link[key]!).order('created_at', { ascending: false })
    return data ?? []
  }, [link[key]])

  async function onPick(f?: File) {
    if (!f) return
    if (f.size > 20 * 1024 * 1024) return setErr('File is larger than 20 MB.')
    setBusy(true); setErr('')
    try { await uploadFile(f, link); await reload() } catch (e: any) { setErr(e.message || 'Upload failed.') }
    setBusy(false)
    if (ref.current) ref.current.value = ''
  }

  async function remove(d: any) {
    if (!confirm(`Delete ${d.name}?`)) return
    await supabase.storage.from('agency-files').remove([d.path])
    await supabase.from('documents').delete().eq('id', d.id)
    reload()
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">Files</div>
        <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={busy} onClick={() => ref.current?.click()}>
          <Paperclip className="h-4 w-4" />{busy ? 'Uploading…' : 'Attach file'}
        </button>
        <input ref={ref} type="file" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      </div>
      {err && <p className="mb-2 text-xs text-red-600">{err}</p>}
      {(data ?? []).length === 0 && <p className="text-sm text-slate-500">No files yet.</p>}
      {(data ?? []).map((d: any) => (
        <div key={d.id} className="flex items-center gap-2 border-t border-slate-100 py-2 text-sm first:border-0 dark:border-slate-800">
          <FileText className="h-4 w-4 flex-none text-brand-600" />
          <button className="min-w-0 flex-1 truncate text-left hover:underline" onClick={() => openFile(d.path)}>{d.name}</button>
          <span className="text-xs text-slate-500">{fmtDate(d.created_at)}</span>
          {canDelete && <button onClick={() => remove(d)} aria-label="Delete file" className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
        </div>
      ))}
    </div>
  )
}
