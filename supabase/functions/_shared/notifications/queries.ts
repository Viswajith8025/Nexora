import type { SupabaseClient } from '@supabase/supabase-js'
import type { DigestArticle, NotificationType, UserDeliveryProfile } from './types.ts'

const ARTICLE_FIELDS = `
  id,
  title,
  canonical_url,
  category,
  cluster_key,
  ai_summary,
  what_happened,
  one_sentence_takeaway,
  why_it_matters,
  who_should_care,
  recommended_action,
  relevance_score,
  importance_score,
  novelty_score,
  relevance_decision,
  discovered_at,
  tags
`

export async function loadDeliveryProfiles(
  supabase: SupabaseClient,
): Promise<UserDeliveryProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      timezone,
      telegram_enabled,
      telegram_chat_id,
      gmail_enabled,
      gmail_address,
      morning_digest_enabled,
      evening_digest_enabled,
      weekly_digest_enabled,
      breaking_alerts_enabled,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
      morning_digest_hour,
      evening_digest_hour,
      last_morning_digest_at,
      last_evening_digest_at,
      last_weekly_digest_at
    `)
    .or('telegram_enabled.eq.true,gmail_enabled.eq.true')

  if (error) throw new Error(`Failed to load profiles: ${error.message}`)

  const profiles = (data ?? []) as UserDeliveryProfile[]
  const gmailUserIds = profiles.filter((p) => p.gmail_enabled).map((p) => p.id)

  if (gmailUserIds.length === 0) return profiles

  const { data: connections } = await supabase
    .from('gmail_connections')
    .select('user_id, refresh_token')
    .in('user_id', gmailUserIds)

  const tokenMap = new Map(
    (connections ?? []).map((row) => [row.user_id, row.refresh_token as string]),
  )

  return profiles.map((profile) => ({
    ...profile,
    gmail_refresh_token: tokenMap.get(profile.id) ?? null,
  }))
}

export async function loadDigestArticles(
  supabase: SupabaseClient,
  options: {
    since?: string
    until?: string
    limit?: number
  } = {},
): Promise<DigestArticle[]> {
  let query = supabase
    .from('articles')
    .select(ARTICLE_FIELDS)
    .eq('processing_status', 'published')
    .in('relevance_decision', ['breaking', 'digest'])
    .gte('relevance_score', 55)

  if (options.since) query = query.gte('discovered_at', options.since)
  if (options.until) query = query.lte('discovered_at', options.until)

  query = query
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .order('discovered_at', { ascending: false })
    .limit(options.limit ?? 40)

  const { data, error } = await query
  if (error) throw new Error(`Failed to load digest articles: ${error.message}`)
  return (data ?? []) as DigestArticle[]
}

export async function loadBreakingArticles(
  supabase: SupabaseClient,
  sinceHours = 6,
): Promise<DigestArticle[]> {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('articles')
    .select(ARTICLE_FIELDS)
    .eq('processing_status', 'published')
    .eq('relevance_decision', 'breaking')
    .gte('discovered_at', since)
    .order('discovered_at', { ascending: false })
    .limit(20)

  if (error) throw new Error(`Failed to load breaking articles: ${error.message}`)
  return (data ?? []) as DigestArticle[]
}

export async function getSentArticleIds(
  supabase: SupabaseClient,
  userId: string,
  notificationType: NotificationType,
  since?: string,
): Promise<Set<string>> {
  let query = supabase
    .from('notifications')
    .select('metadata')
    .eq('user_id', userId)
    .eq('notification_type', notificationType)
    .eq('status', 'sent')

  if (since) query = query.gte('sent_at', since)

  const { data, error } = await query
  if (error) throw new Error(`Failed to load notification history: ${error.message}`)

  const ids = new Set<string>()
  for (const row of data ?? []) {
    const articleIds = (row.metadata as { article_ids?: string[] })?.article_ids ?? []
    for (const id of articleIds) ids.add(id)
  }
  return ids
}

export async function hasDeliveredDedupeKey(
  supabase: SupabaseClient,
  userId: string,
  notificationType: NotificationType,
  dedupeKey: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('notification_type', notificationType)
    .eq('dedupe_key', dedupeKey)
    .in('status', ['sent', 'pending', 'scheduled'])
    .maybeSingle()

  if (error) throw new Error(`Dedupe check failed: ${error.message}`)
  return Boolean(data)
}

export async function updateDigestTimestamp(
  supabase: SupabaseClient,
  userId: string,
  field: 'last_morning_digest_at' | 'last_evening_digest_at' | 'last_weekly_digest_at',
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ [field]: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw new Error(`Failed to update digest timestamp: ${error.message}`)
}
