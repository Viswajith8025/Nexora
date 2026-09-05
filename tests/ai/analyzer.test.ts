// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { analyzeArticle } from '../../supabase/functions/_shared/ai/analyzer.ts'
import type { AIProvider } from '../../supabase/functions/_shared/ai/types.ts'
import { validAnalysisJson, malformedAnalysisJson, sampleArticle } from './fixtures.ts'

function createMockProvider(responses: string[]) {
  let call = 0
  const complete = vi.fn(async () => {
    const content = responses[call] ?? responses[responses.length - 1] ?? ''
    call++
    return {
      content,
      model: 'llama-3.3-70b-versatile',
      provider: 'groq' as const,
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
    }
  })

  return {
    name: 'groq' as const,
    getModelForTask: () => 'llama-3.3-70b-versatile',
    complete,
  }
}

describe('analyzeArticle', () => {
  it('returns valid analysis for well-formed AI output', async () => {
    const provider = createMockProvider([validAnalysisJson])
    const result = await analyzeArticle(provider, sampleArticle)
    expect(result.success).toBe(true)
  })

  it('retries with stricter prompt on malformed JSON', async () => {
    const provider = createMockProvider([malformedAnalysisJson, validAnalysisJson])
    const result = await analyzeArticle(provider, sampleArticle)
    expect(result.success).toBe(true)
    expect(provider.complete).toHaveBeenCalledTimes(2)
  })

  it('fails after exhausting retries', async () => {
    const provider = createMockProvider([malformedAnalysisJson, malformedAnalysisJson, malformedAnalysisJson])
    const result = await analyzeArticle(provider, sampleArticle)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.length).toBeGreaterThan(0)
    }
  })

  it('fails immediately on API error without storing output', async () => {
    const provider: AIProvider = {
      name: 'groq',
      complete: vi.fn(async () => {
        throw new Error('API down')
      }),
    }
    const result = await analyzeArticle(provider, sampleArticle)
    expect(result.success).toBe(false)
  })
})
