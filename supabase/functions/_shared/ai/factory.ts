import type { AIProvider } from './types.ts'
import { createGeminiProvider } from './gemini-provider.ts'
import { createGroqProvider } from './groq-provider.ts'
import { FallbackAIProvider } from './fallback-provider.ts'

export function hasAIProviderConfigured(env: Record<string, string | undefined>): boolean {
  return Boolean(env.GROQ_API_KEY || env.GEMINI_API_KEY)
}

export function createAIProvider(env: Record<string, string | undefined>): AIProvider {
  const hasGroq = Boolean(env.GROQ_API_KEY)
  const hasGemini = Boolean(env.GEMINI_API_KEY)

  if (!hasGroq && !hasGemini) {
    throw new Error('GROQ_API_KEY or GEMINI_API_KEY must be configured')
  }

  if (hasGroq && hasGemini) {
    return new FallbackAIProvider(createGroqProvider(env), createGeminiProvider(env))
  }

  if (hasGemini) return createGeminiProvider(env)
  return createGroqProvider(env)
}
