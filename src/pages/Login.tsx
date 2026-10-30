import { useState, type FormEvent } from 'react'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { isConfigured } from '../lib/supabase'
import { ErrorBox } from '../components/ui'

export default function Login() {
  const { signIn, signUp, sendReset } = useAuth()
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in')
  const [name, setName] = useState('')
  const [info, setInfo] = useState('')
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(''); setInfo('')
    if (mode === 'reset') {
      if (!id.includes('@')) return setErr('Enter the email you signed up with.')
      setBusy(true)
      try { await sendReset(id); setInfo('Reset link sent. Check your inbox.') } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
      return
    }
    if (!id.trim() || !pw) return setErr(mode === 'up' ? 'Enter your email and a password.' : 'Enter your username and password.')
    if (mode === 'up') {
      if (!id.includes('@')) return setErr('Use your invited email address.')
      if (!name.trim()) return setErr('Enter your full name.')
      if (pw.length < 8) return setErr('Use at least 8 characters for the password.')
    }
    setBusy(true)
    try {
      if (mode === 'up') {
        const r = await signUp(id, pw, name)
        if (r === 'confirm-email') { setInfo('Account created. Confirm your email, then sign in.'); setMode('in') }
      } else await signIn(id, pw)
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
        <h2 className="text-lg font-semibold">{mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create your account' : 'Reset password'}</h2>
        {info && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{info}</div>}
        {!isConfigured && <ErrorBox message="Supabase keys are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild." />}
        {err && <ErrorBox message={err} />}
        {mode === 'up' && <label className="block"><span className="label">Full name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>}
        <label className="block">
          <span className="label">{mode === 'in' ? 'Username or email' : 'Email'}</span>
          <input className="input" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" placeholder="Abu Bakar Altaf" />
        </label>
        {mode !== 'reset' && <label className="block">
          <span className="label">Password</span>
          <div className="relative">
            <input className="input pr-10" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-2.5 text-slate-400" aria-label="Show password">
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </label>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link'}</button>
        <div className="flex justify-between text-xs text-brand-600">
          {mode === 'in' ? <><button type="button" onClick={() => { setMode('up'); setErr('') }}>Have an invite? Sign up</button><button type="button" onClick={() => { setMode('reset'); setErr('') }}>Forgot password?</button></> : <button type="button" onClick={() => { setMode('in'); setErr('') }}>Back to sign in</button>}
        </div>
        <p className="text-center text-xs text-slate-500">Google sign-in jaldi aayega.</p>
      </form>
    </div>
  )
}
