import type { SupabaseClient } from '@supabase/supabase-js'
import type { ArticleSummary } from './types.ts'
import { extractSearchTerms } from './chat-feed.ts'

const ARTICLE_FIELDS = `
  id,
  title,
  canonical_url,
  category,
  ai_summary,
  what_happened,
  one_sentence_takeaway,
  why_it_matters,
  developer_impact,
  recommended_action,
  importance_score,
  developer_relevance_score,
  relevance_score,
  relevance_decision,
  published_at,
  discovered_at,
  tags
`

export async function findProfileByChatId(
  supabase: SupabaseClient,
  chatId: string,
): Promise<{
  id: string
  display_name: string | null
  timezone: string
  telegram_enabled: boolean
  telegram_chat_id: string | null
  morning_digest_enabled: boolean
  evening_digest_enabled: boolean
  weekly_digest_enabled: boolean
  breaking_alerts_enabled: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
} | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      timezone,
      telegram_enabled,
      telegram_chat_id,
      morning_digest_enabled,
      evening_digest_enabled,
      weekly_digest_enabled,
      breaking_alerts_enabled,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end
    `)
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (error) throw new Error(`Profile lookup failed: ${error.message}`)
  return data
}

export async function linkTelegramAccount(
  supabase: SupabaseClient,
  chatId: string,
  token: string,
): Promise<{ success: boolean; message: string }> {
  const { data: linkToken, error } = await supabase
    .from('telegram_link_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (error) return { success: false, message: 'Link failed. Please try again.' }
  if (!linkToken) return { success: false, message: 'Invalid or expired link token.' }
  if (linkToken.used_at) return { success: false, message: 'This link has already been used.' }
  if (new Date(linkToken.expires_at) < new Date()) {
    return { success: false, message: 'This link has expired. Generate a new one in Nexora Settings.' }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      telegram_chat_id: chatId,
      telegram_enabled: true,
    })
    .eq('id', linkToken.user_id)

  if (profileError) return { success: false, message: 'Failed to link account.' }

  await supabase
    .from('telegram_link_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', linkToken.id)

  return { success: true, message: 'Your Nexora account is now linked. Try /today or /latest.' }
}

export async function getPublishedArticles(
  supabase: SupabaseClient,
  options: {
    limit?: number
    category?: string
    minScore?: number
    sinceHours?: number
    search?: string
  } = {},
): Promise<ArticleSummary[]> {
  const limit = options.limit ?? 5
  let query = supabase
    .from('articles')
    .select(ARTICLE_FIELDS)
    .eq('processing_status', 'published')
    .neq('relevance_decision', 'ignore')

  if (options.category) {
    query = query.eq('category', options.category)
  }

  if (options.minScore !== undefined) {
    query = query.gte('relevance_score', options.minScore)
  }

  if (options.sinceHours !== undefined) {
    const since = new Date(Date.now() - options.sinceHours * 60 * 60 * 1000).toISOString()
    query = query.gte('discovered_at', since)
  }

  if (options.search) {
    query = query.or(
      `title.ilike.%${options.search}%,ai_summary.ilike.%${options.search}%,tags.cs.{${options.search}}`,
    )
  }

  query = query
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .order('discovered_at', { ascending: false })
    .limit(limit)

  const { data, error } = await query
  if (error) throw new Error(`Article query failed: ${error.message}`)
  return (data ?? []) as ArticleSummary[]
}

export async function resolveChatArticles(
  supabase: SupabaseClient,
  query: string,
  limit = 8,
): Promise<ArticleSummary[]> {
  const trimmed = query.trim()
  if (trimmed) {
    const byFullQuery = await getPublishedArticles(supabase, { limit, search: trimmed })
    if (byFullQuery.length > 0) return byFullQuery
  }

  for (const term of extractSearchTerms(query)) {
    const byTerm = await getPublishedArticles(supabase, { limit, search: term })
    if (byTerm.length > 0) return byTerm
  }

  return getPublishedArticles(supabase, { limit, minScore: 55 })
}

export async function getSavedArticles(
  supabase: SupabaseClient,
  userId: string,
  limit = 5,
): Promise<ArticleSummary[]> {
  const { data, error } = await supabase
    .from('saved_articles')
    .select(`
      article:articles (
        ${ARTICLE_FIELDS}
      )
    `)
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Saved articles query failed: ${error.message}`)

  return (data ?? [])
    .map((row) => {
      const article = Array.isArray(row.article) ? row.article[0] : row.article
      return article as ArticleSummary | undefined
    })
    .filter((article): article is ArticleSummary => Boolean(article))
}

export async function toggleQuietHours(
  supabase: SupabaseClient,
  userId: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ quiet_hours_enabled: enabled })
    .eq('id', userId)

  if (error) throw new Error(`Failed to update quiet hours: ${error.message}`)
}
