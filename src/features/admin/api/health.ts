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

function invokeErrorMessage(error: unknown, context?: 'gmail'): string {
  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('FunctionsFetchError')) {
      if (context === 'gmail') {
        return 'Gmail connect is unavailable. The gmail-oauth function may not be deployed yet.'
      }
      return 'Could not reach the server. Check your connection and try again.'
    }
    return error.message
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = Reflect.get(error, 'message')
    if (typeof message === 'string') return message
  }
  return 'Request failed'
}

export async function fetchSystemHealth(): Promise<SystemHealth> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  const response = await supabase.functions.invoke<SystemHealth>('system-health')
  if (response.error) throw new Error(invokeErrorMessage(response.error))
  if (!response.data) throw new Error('No health data returned')
  return response.data
}

export async function startGmailOAuth(): Promise<string> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  const response = await supabase.functions.invoke<GmailOAuthResponse>('gmail-oauth')
  if (response.error) throw new Error(invokeErrorMessage(response.error, 'gmail'))
  if (!response.data?.authUrl) {
    throw new Error('Gmail is not configured on the server yet (missing Google OAuth secrets).')
  }
  return response.data.authUrl
}

export async function disconnectGmail(userId: string): Promise<void> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  const response = await supabase.functions.invoke('gmail-oauth', { method: 'DELETE' })
  if (response.error) throw new Error(invokeErrorMessage(response.error))

  await supabase.from('profiles').update({ gmail_enabled: false }).eq('id', userId)
}
