import { getSupabaseClientOrNull } from '@/lib/supabase/client'

export type SystemHealth = {
  lastIngestion: { completed_at: string; status: string; job_name: string } | null
  lastAiProcessing: { completed_at: string; status: string } | null
  lastTelegramDelivery: string | null
  lastGmailDelivery: string | null
  failedSources: Array<{ name: string; metadata: Record<string, unknown> }>
  failedJobs: Array<{ job_name: string; completed_at: string; error: string | null }>
  articlesProcessedToday: number
  notificationsSentToday: number
  aiUsage: { calls: number; failures: number; avgDurationMs: number }
}

type GmailOAuthResponse = { authUrl?: string }

export async function fetchSystemHealth(): Promise<SystemHealth> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase.functions.invoke<SystemHealth>('system-health')
  if (error) throw new Error(error.message)
  if (!data) throw new Error('No health data returned')
  return data
}

export async function startGmailOAuth(): Promise<string> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase.functions.invoke<GmailOAuthResponse>('gmail-oauth')
  if (error) throw new Error(error.message)
  if (!data?.authUrl) throw new Error('Gmail OAuth URL not returned')
  return data.authUrl
}

export async function disconnectGmail(userId: string): Promise<void> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  const { error } = await supabase.functions.invoke('gmail-oauth', { method: 'DELETE' })
  if (error) throw new Error(error.message)

  await supabase.from('profiles').update({ gmail_enabled: false, gmail_address: null }).eq('id', userId)
}
