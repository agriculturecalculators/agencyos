import { supabase } from './supabase'
import type { Profile } from './auth'

export const fetchProfiles = async (): Promise<Profile[]> => {
  const { data } = await supabase.from('profiles').select('*').eq('active', true).order('full_name')
  return (data as Profile[]) ?? []
}

export const fetchClientOptions = async () => {
  const { data } = await supabase.from('clients').select('id,name').order('name')
  return (data as { id: string; name: string }[]) ?? []
}

export const fetchProjectOptions = async () => {
  const { data } = await supabase.from('projects').select('id,name').order('name')
  return (data as { id: string; name: string }[]) ?? []
}

export async function logActivity(action: string, entity: string, entityId?: string) {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return
  await supabase.from('activity_logs').insert({ actor_id: data.user.id, action, entity, entity_id: entityId ?? null })
}

export async function uploadFile(file: File, link: { client_id?: string; project_id?: string; task_id?: string; tender_id?: string }) {
  const { data: u } = await supabase.auth.getUser()
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${u.user!.id}/${Date.now()}_${safe}`
  const up = await supabase.storage.from('agency-files').upload(path, file)
  if (up.error) throw up.error
  const { error } = await supabase.from('documents').insert({ ...link, name: file.name, path, uploaded_by: u.user!.id })
  if (error) throw error
}

export async function openFile(path: string) {
  const { data } = await supabase.storage.from('agency-files').createSignedUrl(path, 60)
  if (data?.signedUrl) window.open(data.signedUrl, '_blank')
}
