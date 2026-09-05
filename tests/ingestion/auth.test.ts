// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { validateCronAuth } from '../../supabase/functions/_shared/auth.ts'

describe('ingest-sources authorization', () => {
  it('accepts valid x-cron-secret header', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-cron-secret': 'secret-123' },
    })
    expect(validateCronAuth(req, 'secret-123')).toEqual({ authorized: true })
  })

  it('accepts valid bearer token', () => {
    const req = new Request('https://example.com', {
      headers: { authorization: 'Bearer secret-123' },
    })
    expect(validateCronAuth(req, 'secret-123')).toEqual({ authorized: true })
  })

  it('rejects missing authorization', () => {
    const req = new Request('https://example.com')
    const result = validateCronAuth(req, 'secret-123')
    expect(result.authorized).toBe(false)
  })

  it('rejects invalid secrets', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-cron-secret': 'wrong' },
    })
    const result = validateCronAuth(req, 'secret-123')
    expect(result.authorized).toBe(false)
  })
})
