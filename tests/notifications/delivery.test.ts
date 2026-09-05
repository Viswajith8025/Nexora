// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deliverNotification } from '../../supabase/functions/_shared/notifications/delivery.ts'
import type { TelegramClient } from '../../supabase/functions/_shared/telegram/client.ts'
import type { UserDeliveryProfile } from '../../supabase/functions/_shared/notifications/types.ts'

const user: UserDeliveryProfile = {
  id: 'user-1',
  display_name: 'Dev',
  timezone: 'UTC',
  telegram_enabled: true,
  telegram_chat_id: '12345',
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
}

function createMockSupabase(options?: { existingDedupe?: boolean; failTelegram?: boolean }) {
  const notifications: Record<string, unknown>[] = []
  const deliveries: Record<string, unknown>[] = []

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'notifications') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({
                      data: options?.existingDedupe ? { id: 'existing' } : null,
                      error: null,
                    })),
                  })),
                })),
              })),
            })),
          })),
          insert: vi.fn((row: Record<string, unknown>) => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => {
                const record = { id: `notification-${String(notifications.length + 1)}`, ...row }
                notifications.push(record)
                return { data: record, error: null }
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }
      if (table === 'notification_deliveries') {
        return {
          insert: vi.fn(async (row: Record<string, unknown>) => {
            deliveries.push(row)
            return { error: null }
          }),
        }
      }
      return {}
    }),
    _notifications: () => notifications,
    _deliveries: () => deliveries,
  }

  return supabase
}

describe('deliverNotification', () => {
  it('delivers and records notification history', async () => {
    const supabase = createMockSupabase()
    const telegram = {
      sendMessages: vi.fn(async () => undefined),
      sendMessage: vi.fn(async () => ({})),
    } as unknown as TelegramClient

    const result = await deliverNotification({
      supabase: supabase as unknown as SupabaseClient,
      telegram,
      user,
      notificationType: 'morning_digest',
      dedupeKey: 'morning:2025-09-05',
      title: 'Nexora Daily',
      body: 'Digest body',
      articleIds: ['article-1'],
      notificationLevel: 'high',
    })

    expect(result.sent).toBe(true)
    expect(supabase._notifications()).toHaveLength(1)
    expect(supabase._deliveries()).toHaveLength(1)
  })

  it('prevents duplicate delivery via dedupe key', async () => {
    const supabase = createMockSupabase({ existingDedupe: true })
    const sendMessages = vi.fn(async () => undefined)
    const telegram = {
      sendMessages,
      sendMessage: vi.fn(async () => ({})),
    } as unknown as TelegramClient

    const result = await deliverNotification({
      supabase: supabase as unknown as SupabaseClient,
      telegram,
      user,
      notificationType: 'morning_digest',
      dedupeKey: 'morning:2025-09-05',
      title: 'Nexora Daily',
      body: 'Digest body',
      articleIds: ['article-1'],
      notificationLevel: 'high',
    })

    expect(result.sent).toBe(false)
    expect(result.skipped).toBe(true)
    expect(result.reason).toBe('duplicate_dedupe_key')
    expect(sendMessages).not.toHaveBeenCalled()
  })

  it('records failure when Telegram API fails', async () => {
    const supabase = createMockSupabase()
    const telegram = {
      sendMessages: vi.fn(async () => {
        throw new Error('Telegram API down')
      }),
      sendMessage: vi.fn(async () => ({})),
    } as unknown as TelegramClient

    const result = await deliverNotification({
      supabase: supabase as unknown as SupabaseClient,
      telegram,
      user,
      notificationType: 'breaking_alert',
      dedupeKey: 'breaking:article-1',
      title: 'Breaking',
      body: 'Alert body',
      articleIds: ['article-1'],
      notificationLevel: 'breaking',
    })

    expect(result.sent).toBe(false)
    expect(result.error).toMatch(/Telegram API down/)
    expect(supabase._deliveries()[0]).toMatchObject({ status: 'failure' })
  })
})
