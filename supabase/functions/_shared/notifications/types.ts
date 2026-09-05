export type NotificationType = 'morning_digest' | 'evening_digest' | 'weekly_digest' | 'breaking_alert'

export type NotificationChannel = 'telegram' | 'email' | 'web'

export type NotificationStatus = 'pending' | 'scheduled' | 'sent' | 'failed' | 'cancelled'

export type DigestArticle = {
  id: string
  title: string
  canonical_url: string
  category: string | null
  cluster_key: string | null
  ai_summary: string | null
  what_happened: string | null
  one_sentence_takeaway: string | null
  why_it_matters: string | null
  who_should_care: string | null
  recommended_action: string | null
  relevance_score: number | null
  importance_score: number | null
  novelty_score: number | null
  relevance_decision: string | null
  discovered_at: string
  tags: string[]
}

export type UserDeliveryProfile = {
  id: string
  display_name: string | null
  timezone: string
  telegram_enabled: boolean
  telegram_chat_id: string | null
  gmail_enabled: boolean
  gmail_address: string | null
  gmail_refresh_token?: string | null
  morning_digest_enabled: boolean
  evening_digest_enabled: boolean
  weekly_digest_enabled: boolean
  breaking_alerts_enabled: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  morning_digest_hour: number
  evening_digest_hour: number
  last_morning_digest_at: string | null
  last_evening_digest_at: string | null
  last_weekly_digest_at: string | null
}

export type DeliveryResult = {
  userId: string
  sent: boolean
  skipped: boolean
  reason?: string
  notificationId?: string
  error?: string
}

export type JobResult = {
  cronRunId: string
  jobName: string
  processed: number
  sent: number
  skipped: number
  failed: number
  results: DeliveryResult[]
  durationMs: number
}

export const MIN_DIGEST_RELEVANCE = 55
export const MIN_MUST_KNOW_RELEVANCE = 70
export const MAX_MUST_KNOW = 5
export const MAX_SECTION_ITEMS = 3
export const MAX_MEETING_TOPICS = 3

export const CATEGORY_SECTIONS: Record<string, { emoji: string; label: string }> = {
  AI: { emoji: '🤖', label: 'AI' },
  Development: { emoji: '💻', label: 'DEVELOPMENT' },
  Cloud: { emoji: '☁️', label: 'CLOUD' },
  Security: { emoji: '🔐', label: 'SECURITY' },
  'Developer Tools': { emoji: '🚀', label: 'TOOLS' },
}
