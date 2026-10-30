import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ErrorBox } from '../components/ui'

export default function ResetPassword() {
  const { clearRecovery } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) return setErr('Use at least 8 characters.')
    if (pw !== pw2) return setErr('The two passwords do not match.')
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) return setErr(error.message)
    clearRecovery()
  }
  return (
    <div className="flex h-full items-center justify-center p-6">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-3">
        <h1 className="text-lg font-semibold">Set a new password</h1>
        {err && <ErrorBox message={err} />}
        <input className="input" type="password" placeholder="New password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <input className="input" type="password" placeholder="Repeat password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        <button className="btn-primary w-full">Save password</button>
      </form>
    </div>
  )
}
