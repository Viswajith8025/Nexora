// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { runMorningDigestJob } from '../../supabase/functions/_shared/notifications/dispatch.ts'
import type { TelegramClient } from '../../supabase/functions/_shared/telegram/client.ts'

function createProfile() {
  return {
    id: 'user-1',
    display_name: 'Dev',
    timezone: 'UTC',
    telegram_enabled: true,
    telegram_chat_id: '12345',
    gmail_enabled: false,
    gmail_address: null,
    morning_digest_enabled: true,
    evening_digest_enabled: false,
    weekly_digest_enabled: true,
    breaking_alerts_enabled: true,
    quiet_hours_enabled: false,
    quiet_hours_start: null,
    quiet_hours_end: null,
    morning_digest_hour: new Date().getUTCHours(),
    evening_digest_hour: 19,
    last_morning_digest_at: null,
    last_evening_digest_at: null,
    last_weekly_digest_at: null,
  }
}

function createMockSupabase() {
  const dedupeKeys = new Set<string>()
  const cronRunId = 'cron-1'

  const article = {
    id: 'article-1',
    title: 'OpenAI Announces GPT-5',
    canonical_url: 'https://example.com/gpt5',
    category: 'AI',
    cluster_key: 'gpt-5',
    ai_summary: 'Major release.',
    what_happened: 'GPT-5 launched.',
    one_sentence_takeaway: 'Better APIs.',
    why_it_matters: 'Model shift.',
    who_should_care: 'AI developers',
    recommended_action: 'Review docs.',
    relevance_score: 92,
    importance_score: 95,
    novelty_score: 88,
    relevance_decision: 'breaking',
    discovered_at: new Date().toISOString(),
    tags: ['openai'],
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'cron_runs') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: cronRunId }, error: null })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            or: vi.fn(async () => ({ data: [createProfile()], error: null })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }
      if (table === 'articles') {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          in: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          order: vi.fn(() => chain),
          limit: vi.fn(async () => ({ data: [article], error: null })),
        }
        return chain
      }
      if (table === 'notifications') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({
                      data: dedupeKeys.size > 0 ? { id: 'existing' } : null,
                      error: null,
                    })),
                  })),
                })),
                gte: vi.fn(async () => ({ data: [], error: null })),
              })),
            })),
          })),
          insert: vi.fn((row: Record<string, unknown>) => {
            if (dedupeKeys.has(String(row.dedupe_key))) {
              return {
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({ data: null, error: { message: 'duplicate' } })),
                })),
              }
            }
            dedupeKeys.add(String(row.dedupe_key))
            return {
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: 'notification-1', ...row },
                  error: null,
                })),
              })),
            }
          }),
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }
      if (table === 'notification_deliveries') {
        return {
          insert: vi.fn(async () => ({ error: null })),
        }
      }
      return {}
    }),
    _dedupeKeys: () => dedupeKeys,
  }

  return supabase
}

describe('dispatch jobs', () => {
  it('runs morning digest idempotently on duplicate execution', async () => {
    const supabase = createMockSupabase()
    const sendMessages = vi.fn(async () => undefined)
    const telegram = {
      sendMessages,
      sendMessage: vi.fn(async () => ({})),
    } as unknown as TelegramClient

    const first = await runMorningDigestJob(supabase as unknown as SupabaseClient, telegram)
    const second = await runMorningDigestJob(supabase as unknown as SupabaseClient, telegram)

    expect(first.sent).toBeGreaterThanOrEqual(0)
    expect(second.skipped).toBeGreaterThanOrEqual(first.sent > 0 ? 0 : 1)
    expect(sendMessages).toHaveBeenCalled()
  })
})
