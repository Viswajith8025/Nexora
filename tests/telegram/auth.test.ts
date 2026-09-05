// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { validateTelegramWebhook } from '../../supabase/functions/_shared/telegram/auth.ts'

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/telegram-webhook', {
    method: 'POST',
    headers,
  })
}

describe('validateTelegramWebhook', () => {
  it('rejects when secret is not configured', () => {
    const result = validateTelegramWebhook(createRequest(), undefined)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/not configured/i)
  })

  it('rejects missing header', () => {
    const result = validateTelegramWebhook(createRequest(), 'secret-123')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/Missing/i)
  })

  it('rejects invalid secret', () => {
    const result = validateTelegramWebhook(
      createRequest({ 'x-telegram-bot-api-secret-token': 'wrong' }),
      'secret-123',
    )
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/Invalid/i)
  })

  it('accepts valid secret', () => {
    const result = validateTelegramWebhook(
      createRequest({ 'x-telegram-bot-api-secret-token': 'secret-123' }),
      'secret-123',
    )
    expect(result.valid).toBe(true)
  })
})
