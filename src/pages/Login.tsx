import { useState, type FormEvent } from 'react'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { isConfigured } from '../lib/supabase'
import { ErrorBox } from '../components/ui'

export default function Login() {
  const { signIn } = useAuth()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!id.trim() || !pw) return setErr('Enter your username and password.')
    setBusy(true)
    setErr('')
    try {
      await signIn(id, pw)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-brand-600">
      <div className="safe-top flex flex-1 flex-col items-center justify-center px-6 py-10 text-white animate-fadeUp">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15"><Zap className="h-8 w-8" /></div>
        <h1 className="text-2xl font-semibold">AgencyOS</h1>
        <p className="mt-1 text-sm opacity-80">Think Out Media, ek jagah sab kuch</p>
      </div>
      <form onSubmit={submit} className="safe-bottom space-y-4 rounded-t-3xl bg-white p-6 animate-slideUp dark:bg-slate-900 sm:mx-auto sm:mb-10 sm:w-full sm:max-w-md sm:rounded-3xl">
        <h2 className="text-lg font-semibold">Sign in</h2>
        {!isConfigured && <ErrorBox message="Supabase keys are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild." />}
        {err && <ErrorBox message={err} />}
        <label className="block">
          <span className="label">Username or email</span>
          <input className="input" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" placeholder="Abu Bakar Altaf" />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <div className="relative">
            <input className="input pr-10" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-2.5 text-slate-400" aria-label="Show password">
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </label>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="text-center text-xs text-slate-500">Naye employees ko Admin invite karta hai. Google sign-in jaldi aayega.</p>
      </form>
    </div>
  )
}
