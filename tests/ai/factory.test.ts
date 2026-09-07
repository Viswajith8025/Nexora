// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createAIProvider, hasAIProviderConfigured } from '../../supabase/functions/_shared/ai/factory.ts'
import { FallbackAIProvider } from '../../supabase/functions/_shared/ai/fallback-provider.ts'
import { GeminiProvider } from '../../supabase/functions/_shared/ai/gemini-provider.ts'
import { GroqProvider } from '../../supabase/functions/_shared/ai/groq-provider.ts'

describe('createAIProvider', () => {
  it('detects configured providers', () => {
    expect(hasAIProviderConfigured({})).toBe(false)
    expect(hasAIProviderConfigured({ GROQ_API_KEY: 'x' })).toBe(true)
    expect(hasAIProviderConfigured({ GEMINI_API_KEY: 'x' })).toBe(true)
  })

  it('creates fallback provider when both keys exist', () => {
    const provider = createAIProvider({
      GROQ_API_KEY: 'groq',
      GEMINI_API_KEY: 'gemini',
    })
    expect(provider).toBeInstanceOf(FallbackAIProvider)
  })

  it('creates single providers when only one key exists', () => {
    expect(createAIProvider({ GROQ_API_KEY: 'groq' })).toBeInstanceOf(GroqProvider)
    expect(createAIProvider({ GEMINI_API_KEY: 'gemini' })).toBeInstanceOf(GeminiProvider)
  })

  it('throws when no provider keys exist', () => {
    expect(() => createAIProvider({})).toThrow(/GROQ_API_KEY or GEMINI_API_KEY/)
  })
})
