import type { SupabaseClient } from '@supabase/supabase-js'

export type ChatTurn = {
  role: 'user' | 'assistant'
  content: string
}

const MAX_TURNS = 10
const MAX_CONTENT_LENGTH = 2000

export async function loadChatHistory(
  supabase: SupabaseClient,
  chatId: string,
): Promise<ChatTurn[]> {
  const { data, error } = await supabase
    .from('telegram_chat_history')
    .select('role, content')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(MAX_TURNS)

  if (error || !data) return []

  return data
    .reverse()
    .map((row) => ({
      role: row.role as ChatTurn['role'],
      content: String(row.content).slice(0, MAX_CONTENT_LENGTH),
    }))
}

export async function appendChatTurn(
  supabase: SupabaseClient,
  chatId: string,
  userId: string | null | undefined,
  role: ChatTurn['role'],
  content: string,
): Promise<void> {
  const trimmed = content.trim().slice(0, MAX_CONTENT_LENGTH)
  if (!trimmed) return

  await supabase.from('telegram_chat_history').insert({
    chat_id: chatId,
    user_id: userId ?? null,
    role,
    content: trimmed,
  })

  const { data: stale } = await supabase
    .from('telegram_chat_history')
    .select('id')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .range(MAX_TURNS, MAX_TURNS + 50)

  const staleIds = (stale ?? []).map((row) => row.id)
  if (staleIds.length > 0) {
    await supabase.from('telegram_chat_history').delete().in('id', staleIds)
  }
}

export async function clearChatHistory(supabase: SupabaseClient, chatId: string): Promise<void> {
  await supabase.from('telegram_chat_history').delete().eq('chat_id', chatId)
}
