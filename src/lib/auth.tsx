import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Role = 'admin' | 'manager' | 'team_leader' | 'employee'

export interface Profile {
  id: string
  full_name: string
  username: string | null
  email: string | null
  role: Role
  department: string | null
  job_title: string | null
  phone: string | null
  avatar_url: string | null
  active: boolean
}

interface AuthCtx {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<string>
  sendReset: (email: string) => Promise<void>
  recovery: boolean
  clearRecovery: () => void
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)

  async function loadProfile(userId: string | undefined) {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile((data as Profile) ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(s)
      loadProfile(s?.user.id)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(identifier: string, password: string) {
    let email = identifier.trim()
    if (!email.includes('@')) {
      const { data } = await supabase.rpc('login_email', { p_username: email })
      if (!data) throw new Error('Username or password is wrong.')
      email = data as string
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Username or password is wrong.')
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim(), username: fullName.trim() } } })
    if (error) throw new Error(/not been invited/i.test(error.message) ? 'This email has not been invited. Ask the Admin to invite you first.' : error.message)
    return data.session ? 'signed-in' : 'confirm-email'
  }

  async function sendReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    if (error) throw new Error(error.message)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <Ctx.Provider
      value={{ session, profile, loading, signIn, signOut, signUp, sendReset, recovery, clearRecovery: () => setRecovery(false), refreshProfile: () => loadProfile(session?.user.id) }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)

export const canManage = (r?: Role) => r === 'admin' || r === 'manager'
export const canLead = (r?: Role) => r === 'admin' || r === 'manager' || r === 'team_leader'
