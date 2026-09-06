// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { mapAuthError } from '@/lib/auth-errors'

describe('mapAuthError', () => {
  it('maps invalid credentials', () => {
    expect(mapAuthError('Invalid login credentials')).toContain('Wrong email or password')
  })

  it('maps email not confirmed', () => {
    expect(mapAuthError('Email not confirmed')).toContain('Confirm your email')
  })
})
