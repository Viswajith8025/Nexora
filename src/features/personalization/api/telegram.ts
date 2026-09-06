import { getSupabaseClientOrNull } from '@/lib/supabase/client'

const TOKEN_TTL_MINUTES = 15

function generateToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export type TelegramLinkToken = {
  token: string
  expiresAt: string
  botUsername: string | null
}

export function getTelegramBotUsername(): string | null {
  const env = import.meta.env as Record<string, string | undefined>
  const username = env.VITE_TELEGRAM_BOT_USERNAME
  if (typeof username !== 'string' || !username.trim()) return null
  return username.replace(/^@/, '')
}

export async function createTelegramLinkToken(userId: string): Promise<TelegramLinkToken> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  const token = generateToken()
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString()

  const { error } = await supabase.from('telegram_link_tokens').insert({
    user_id: userId,
    token,
    expires_at: expiresAt,
  })

  if (error) throw new Error(error.message)

  return {
    token,
    expiresAt,
    botUsername: getTelegramBotUsername(),
  }
}

export function buildTelegramStartUrl(token: string, botUsername: string | null): string | null {
  if (!botUsername) return null
  return `https://t.me/${botUsername}?start=${token}`
}
