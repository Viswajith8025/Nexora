import { describe, it, expect } from 'vitest'
import { sanitizeSearchTerm } from '@/lib/security/sanitize-search'

describe('sanitizeSearchTerm', () => {
  it('removes PostgREST filter metacharacters', () => {
    expect(sanitizeSearchTerm('react,%test')).toBe('react test')
  })

  it('limits length', () => {
    const long = 'a'.repeat(300)
    expect(sanitizeSearchTerm(long).length).toBe(200)
  })

  it('preserves normal search terms', () => {
    expect(sanitizeSearchTerm('OpenAI GPT-5')).toBe('OpenAI GPT-5')
  })
})
