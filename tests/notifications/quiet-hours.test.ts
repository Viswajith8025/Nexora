// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isQuietHours, canBypassQuietHours } from '../../supabase/functions/_shared/notifications/quiet-hours.ts'
import type { UserDeliveryProfile } from '../../supabase/functions/_shared/notifications/types.ts'

const profile: UserDeliveryProfile = {
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
  quiet_hours_enabled: true,
  quiet_hours_start: '22:00:00',
  quiet_hours_end: '07:00:00',
  morning_digest_hour: 8,
  evening_digest_hour: 19,
  last_morning_digest_at: null,
  last_evening_digest_at: null,
  last_weekly_digest_at: null,
}

describe('quiet hours', () => {
  it('detects quiet hours overnight window', () => {
    const lateNight = new Date('2025-09-05T23:30:00Z')
    const morning = new Date('2025-09-05T06:30:00Z')
    const afternoon = new Date('2025-09-05T14:00:00Z')

    expect(isQuietHours(profile, lateNight)).toBe(true)
    expect(isQuietHours(profile, morning)).toBe(true)
    expect(isQuietHours(profile, afternoon)).toBe(false)
  })

  it('allows critical alerts to bypass quiet hours', () => {
    expect(canBypassQuietHours(true)).toBe(true)
    expect(canBypassQuietHours(false)).toBe(false)
  })
})
