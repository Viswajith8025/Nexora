import type { SupabaseClient } from '@supabase/supabase-js'
import type { TelegramClient } from '../telegram/client.ts'
import { excludeAlreadySent, hasMeaningfulContent } from './article-selection.ts'
import { isBreakingArticle, isCriticalBreaking } from './breaking.ts'
import {
  formatBreakingAlert,
  formatEveningDigest,
  formatMorningDigest,
  formatWeeklyDigest,
} from './digest-format.ts'
import { deliverNotification } from './delivery.ts'
import { deliverGmailNotification } from './gmail-delivery.ts'
import { canBypassQuietHours, isQuietHours } from './quiet-hours.ts'
import {
  getSentArticleIds,
  loadBreakingArticles,
  loadDeliveryProfiles,
  loadDigestArticles,
  updateDigestTimestamp,
} from './queries.ts'
import type { DeliveryResult, DigestArticle, JobResult, UserDeliveryProfile } from './types.ts'
import { getLocalTimeInfo, isDigestHour } from './timezone.ts'

async function startCronRun(supabase: SupabaseClient, jobName: string): Promise<string> {
  const { data, error } = await supabase
    .from('cron_runs')
    .insert({ job_name: jobName, status: 'running' })
    .select('id')
    .single()

  if (error || !data) throw new Error(`Failed to create cron run: ${error?.message ?? 'unknown'}`)
  return data.id
}

async function finishCronRun(
  supabase: SupabaseClient,
  cronRunId: string,
  results: DeliveryResult[],
  durationMs: number,
): Promise<void> {
  const sent = results.filter((result) => result.sent).length
  const skipped = results.filter((result) => result.skipped).length
  const failed = results.filter((result) => !result.sent && !result.skipped).length
  const status = failed > 0 && sent === 0 ? 'failed' : 'completed'

  await supabase
    .from('cron_runs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      items_processed: sent,
      error: failed > 0 ? `${failed} delivery failure(s)` : null,
      metadata: { sent, skipped, failed, results, durationMs },
    })
    .eq('id', cronRunId)
}

function isWeeklyDay(localDateKey: string, timezone: string): boolean {
  const date = new Date(`${localDateKey}T12:00:00`)
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(date)
  return weekday.startsWith('Sun')
}

function getGmailConfig(): { clientId: string; clientSecret: string } | undefined {
  const deno = (globalThis as { Deno?: { env: { get: (key: string) => string | undefined } } }).Deno
  if (!deno) return undefined
  const clientId = deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = deno.env.get('GOOGLE_CLIENT_SECRET')
  if (!clientId || !clientSecret) return undefined
  return { clientId, clientSecret }
}

async function deliverDigest(
  supabase: SupabaseClient,
  telegram: TelegramClient,
  user: UserDeliveryProfile,
  notificationType: 'morning_digest' | 'evening_digest' | 'weekly_digest',
  dedupeKey: string,
  title: string,
  body: string,
  articles: DigestArticle[],
  gmailConfig?: { clientId: string; clientSecret: string },
): Promise<DeliveryResult> {
  const articleIds = articles.map((article) => article.id)
  let primary: DeliveryResult = { userId: user.id, sent: false, skipped: true, reason: 'no_channel' }

  if (user.telegram_enabled && user.telegram_chat_id) {
    primary = await deliverNotification({
      supabase,
      telegram,
      user,
      notificationType,
      dedupeKey,
      title,
      body,
      articleIds,
      notificationLevel: notificationType === 'weekly_digest' ? 'normal' : 'high',
    })
  }

  if (
    user.gmail_enabled &&
    user.gmail_address &&
    user.gmail_refresh_token &&
    gmailConfig
  ) {
    const gmailResult = await deliverGmailNotification({
      supabase,
      userId: user.id,
      email: user.gmail_address,
      refreshToken: user.gmail_refresh_token,
      notificationType,
      dedupeKey,
      title,
      body,
      articleIds,
      clientId: gmailConfig.clientId,
      clientSecret: gmailConfig.clientSecret,
    })

    if (gmailResult.sent) {
      return { userId: user.id, sent: true, skipped: false }
    }
  }

  return primary
}

export async function runMorningDigestJob(
  supabase: SupabaseClient,
  telegram: TelegramClient,
): Promise<JobResult> {
  const started = Date.now()
  const jobName = 'dispatch-morning-digest'
  const cronRunId = await startCronRun(supabase, jobName)
  const results: DeliveryResult[] = []

  const profiles = await loadDeliveryProfiles(supabase)
  const articles = await loadDigestArticles(supabase, {
    since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  })

  for (const profile of profiles) {
    if (!profile.morning_digest_enabled) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'disabled' })
      continue
    }

    const local = getLocalTimeInfo(profile.timezone)
    if (!isDigestHour(local.hour, profile.morning_digest_hour)) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'not_digest_hour' })
      continue
    }

    const dedupeKey = `morning:${local.dateKey}`
    const sentIds = await getSentArticleIds(supabase, profile.id, 'morning_digest', profile.last_morning_digest_at ?? undefined)
    const userArticles = excludeAlreadySent(articles, sentIds)

    if (!hasMeaningfulContent(userArticles)) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'no_meaningful_news' })
      continue
    }

    const body = formatMorningDigest(userArticles)
    if (!body) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'no_meaningful_news' })
      continue
    }

    if (isQuietHours(profile)) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'quiet_hours' })
      continue
    }

    const result = await deliverDigest(
      supabase,
      telegram,
      profile,
      'morning_digest',
      dedupeKey,
      'Nexora Daily',
      body,
      userArticles,
      getGmailConfig(),
    )
    if (result.sent) await updateDigestTimestamp(supabase, profile.id, 'last_morning_digest_at')
    results.push(result)
  }

  const durationMs = Date.now() - started
  await finishCronRun(supabase, cronRunId, results, durationMs)

  return {
    cronRunId,
    jobName,
    processed: profiles.length,
    sent: results.filter((result) => result.sent).length,
    skipped: results.filter((result) => result.skipped).length,
    failed: results.filter((result) => !result.sent && !result.skipped).length,
    results,
    durationMs,
  }
}

export async function runEveningDigestJob(
  supabase: SupabaseClient,
  telegram: TelegramClient,
): Promise<JobResult> {
  const started = Date.now()
  const jobName = 'dispatch-evening-digest'
  const cronRunId = await startCronRun(supabase, jobName)
  const results: DeliveryResult[] = []

  const profiles = await loadDeliveryProfiles(supabase)

  for (const profile of profiles) {
    if (!profile.evening_digest_enabled) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'disabled' })
      continue
    }

    const local = getLocalTimeInfo(profile.timezone)
    if (!isDigestHour(local.hour, profile.evening_digest_hour)) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'not_digest_hour' })
      continue
    }

    const since = profile.last_morning_digest_at ??
      new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()

    const articles = await loadDigestArticles(supabase, { since, limit: 20 })
    const sentIds = await getSentArticleIds(supabase, profile.id, 'evening_digest', since)
    const userArticles = excludeAlreadySent(articles, sentIds)

    if (!hasMeaningfulContent(userArticles)) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'no_new_developments' })
      continue
    }

    const body = formatEveningDigest(userArticles)
    if (!body) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'no_new_developments' })
      continue
    }

    if (isQuietHours(profile)) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'quiet_hours' })
      continue
    }

    const dedupeKey = `evening:${local.dateKey}`
    const result = await deliverDigest(
      supabase,
      telegram,
      profile,
      'evening_digest',
      dedupeKey,
      'Nexora Evening Update',
      body,
      userArticles,
      getGmailConfig(),
    )
    if (result.sent) await updateDigestTimestamp(supabase, profile.id, 'last_evening_digest_at')
    results.push(result)
  }

  const durationMs = Date.now() - started
  await finishCronRun(supabase, cronRunId, results, durationMs)

  return {
    cronRunId,
    jobName,
    processed: profiles.length,
    sent: results.filter((result) => result.sent).length,
    skipped: results.filter((result) => result.skipped).length,
    failed: results.filter((result) => !result.sent && !result.skipped).length,
    results,
    durationMs,
  }
}

export async function runWeeklyDigestJob(
  supabase: SupabaseClient,
  telegram: TelegramClient,
): Promise<JobResult> {
  const started = Date.now()
  const jobName = 'dispatch-weekly-digest'
  const cronRunId = await startCronRun(supabase, jobName)
  const results: DeliveryResult[] = []

  const profiles = await loadDeliveryProfiles(supabase)
  const articles = await loadDigestArticles(supabase, {
    since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    limit: 60,
  })

  for (const profile of profiles) {
    if (!profile.weekly_digest_enabled) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'disabled' })
      continue
    }

    const local = getLocalTimeInfo(profile.timezone)
    if (!isWeeklyDay(local.dateKey, profile.timezone) || !isDigestHour(local.hour, profile.morning_digest_hour)) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'not_weekly_window' })
      continue
    }

    const dedupeKey = `weekly:${local.weekKey}`
    const sentIds = await getSentArticleIds(supabase, profile.id, 'weekly_digest')
    const userArticles = excludeAlreadySent(articles, sentIds)

    if (!hasMeaningfulContent(userArticles)) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'no_meaningful_news' })
      continue
    }

    const body = formatWeeklyDigest(userArticles)
    if (!body) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'no_meaningful_news' })
      continue
    }

    const result = await deliverDigest(
      supabase,
      telegram,
      profile,
      'weekly_digest',
      dedupeKey,
      'Nexora Weekly',
      body,
      userArticles,
      getGmailConfig(),
    )
    if (result.sent) await updateDigestTimestamp(supabase, profile.id, 'last_weekly_digest_at')
    results.push(result)
  }

  const durationMs = Date.now() - started
  await finishCronRun(supabase, cronRunId, results, durationMs)

  return {
    cronRunId,
    jobName,
    processed: profiles.length,
    sent: results.filter((result) => result.sent).length,
    skipped: results.filter((result) => result.skipped).length,
    failed: results.filter((result) => !result.sent && !result.skipped).length,
    results,
    durationMs,
  }
}

export async function runBreakingAlertsJob(
  supabase: SupabaseClient,
  telegram: TelegramClient,
): Promise<JobResult> {
  const started = Date.now()
  const jobName = 'dispatch-breaking-alerts'
  const cronRunId = await startCronRun(supabase, jobName)
  const results: DeliveryResult[] = []

  const profiles = await loadDeliveryProfiles(supabase)
  const articles = (await loadBreakingArticles(supabase)).filter(isBreakingArticle)

  for (const profile of profiles) {
    if (!profile.breaking_alerts_enabled) {
      results.push({ userId: profile.id, sent: false, skipped: true, reason: 'disabled' })
      continue
    }

    for (const article of articles) {
      const dedupeKey = `breaking:${article.id}`
      const sentIds = await getSentArticleIds(supabase, profile.id, 'breaking_alert')
      if (sentIds.has(article.id)) {
        results.push({ userId: profile.id, sent: false, skipped: true, reason: 'already_sent' })
        continue
      }

      const critical = isCriticalBreaking(article)
      if (isQuietHours(profile) && !canBypassQuietHours(critical)) {
        results.push({ userId: profile.id, sent: false, skipped: true, reason: 'quiet_hours' })
        continue
      }

      const body = formatBreakingAlert(article)
      const result = await deliverNotification({
        supabase,
        telegram,
        user: profile,
        notificationType: 'breaking_alert',
        dedupeKey,
        title: `Breaking: ${article.title}`,
        body,
        articleIds: [article.id],
        notificationLevel: 'breaking',
      })
      results.push(result)
    }
  }

  const durationMs = Date.now() - started
  await finishCronRun(supabase, cronRunId, results, durationMs)

  return {
    cronRunId,
    jobName,
    processed: profiles.length,
    sent: results.filter((result) => result.sent).length,
    skipped: results.filter((result) => result.skipped).length,
    failed: results.filter((result) => !result.sent && !result.skipped).length,
    results,
    durationMs,
  }
}
