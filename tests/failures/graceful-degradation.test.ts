// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { analyzeArticle } from '../../supabase/functions/_shared/ai/analyzer.ts'
import { GroqAPIError, GroqRateLimitError } from '../../supabase/functions/_shared/ai/groq-provider.ts'
import { DEFAULT_GROQ_MODEL_CONFIG } from '../../supabase/functions/_shared/ai/types.ts'
import { sampleArticle } from '../ai/fixtures.ts'
import { parseFeed } from '../../supabase/functions/_shared/ingestion/rss-parser.ts'

describe('graceful degradation', () => {
  it('marks article failed when Groq is unavailable', async () => {
    const provider = {
      name: 'groq' as const,
      models: DEFAULT_GROQ_MODEL_CONFIG,
      getModelForTask: () => 'llama-3.3-70b-versatile',
      complete: vi.fn(async () => {
        throw new GroqAPIError('Service unavailable')
      }),
    }

    const result = await analyzeArticle(provider, sampleArticle)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('unavailable')
    }
  })

  it('handles Groq rate limiting without crashing', async () => {
    const provider = {
      name: 'groq' as const,
      models: DEFAULT_GROQ_MODEL_CONFIG,
      getModelForTask: () => 'llama-3.3-70b-versatile',
      complete: vi.fn(async () => {
        throw new GroqRateLimitError('Rate limit exceeded')
      }),
    }

    const result = await analyzeArticle(provider, sampleArticle)
    expect(result.success).toBe(false)
  })

  it('retries on invalid AI JSON then fails gracefully', async () => {
    const provider = {
      name: 'groq' as const,
      models: DEFAULT_GROQ_MODEL_CONFIG,
      getModelForTask: () => 'llama-3.3-70b-versatile',
      complete: vi.fn(async () => ({
        content: '{"invalid": true}',
        model: 'llama-3.3-70b-versatile',
        provider: 'groq' as const,
      })),
    }

    const result = await analyzeArticle(provider, sampleArticle)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
    }
    expect(provider.complete).toHaveBeenCalledTimes(3)
  })

  it('parses malformed RSS without throwing', () => {
    const result = parseFeed('not valid xml at all', 'https://example.com/feed', 'rss')
    expect(result.items).toEqual([])
  })

  it('telegram delivery failure returns error without throwing', async () => {
    const { deliverNotification } = await import(
      '../../supabase/functions/_shared/notifications/delivery.ts'
    )

    const telegram = {
      sendMessages: vi.fn(async () => {
        throw new Error('Telegram API down')
      }),
      sendMessage: vi.fn(),
    }

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'notifications') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    in: vi.fn(() => ({
                      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                    })),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({ data: { id: 'n-1' }, error: null })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null })),
            })),
          }
        }
        if (table === 'notification_deliveries') {
          return { insert: vi.fn(async () => ({ error: null })) }
        }
        return {}
      }),
    }

    const result = await deliverNotification({
      supabase: supabase as unknown as SupabaseClient,
      telegram: telegram as unknown as import('../../supabase/functions/_shared/telegram/client.ts').TelegramClient,
      user: {
        id: 'u1',
        display_name: 'Dev',
        timezone: 'UTC',
        telegram_enabled: true,
        telegram_chat_id: '123',
        gmail_enabled: false,
        gmail_address: null,
        morning_digest_enabled: true,
        evening_digest_enabled: true,
        weekly_digest_enabled: true,
        breaking_alerts_enabled: true,
        quiet_hours_enabled: false,
        quiet_hours_start: null,
        quiet_hours_end: null,
        morning_digest_hour: 8,
        evening_digest_hour: 19,
        last_morning_digest_at: null,
        last_evening_digest_at: null,
        last_weekly_digest_at: null,
      },
      notificationType: 'breaking_alert',
      dedupeKey: 'breaking:1',
      title: 'Alert',
      body: 'Test',
      articleIds: ['a1'],
      notificationLevel: 'breaking',
    })

    expect(result.sent).toBe(false)
    expect(result.error).toContain('Telegram')
  })
})
