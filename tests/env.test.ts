import { describe, it, expect } from 'vitest'
import { clientEnvSchema } from '@/lib/config/env'

describe('client environment schema', () => {
  it('accepts valid Supabase configuration', () => {
    const result = clientEnvSchema.safeParse({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing anon key', () => {
    const result = clientEnvSchema.safeParse({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: '',
    })
    expect(result.success).toBe(false)
  })
})
