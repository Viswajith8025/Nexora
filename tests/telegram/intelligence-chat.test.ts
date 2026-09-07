// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { generateChatResponse } from '../../supabase/functions/_shared/telegram/intelligence.ts'
import { DEFAULT_GROQ_MODEL_CONFIG } from '../../supabase/functions/_shared/ai/types.ts'

describe('generateChatResponse', () => {
  it('answers casual messages via the model instead of refusing', async () => {
    const complete = vi.fn(async () => ({
      content: 'Hey! I am Nexora — your personal tech intelligence companion.',
      model: 'gemini-2.5-flash',
      provider: 'gemini' as const,
    }))

    const provider = {
      name: 'gemini' as const,
      models: DEFAULT_GROQ_MODEL_CONFIG,
      getModelForTask: () => 'gemini-2.5-flash',
      complete,
    }

    const result = await generateChatResponse(provider, 'Hello', [])

    expect(complete).toHaveBeenCalledTimes(1)
    expect(result.plain).toContain('Nexora')
  })
})
