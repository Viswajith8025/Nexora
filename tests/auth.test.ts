import { describe, it, expect } from 'vitest'
import { loginSchema, signupSchema } from '@/schemas/auth'

describe('auth schemas', () => {
  it('validates login input', () => {
    const result = loginSchema.safeParse({
      email: 'dev@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short passwords on signup', () => {
    const result = signupSchema.safeParse({
      displayName: 'Dev User',
      email: 'dev@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid signup input', () => {
    const result = signupSchema.safeParse({
      displayName: 'Dev User',
      email: 'dev@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })
})
