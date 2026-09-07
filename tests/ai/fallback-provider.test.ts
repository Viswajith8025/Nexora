// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FallbackAIProvider } from '../../supabase/functions/_shared/ai/fallback-provider.ts'
import { GroqProvider } from '../../supabase/functions/_shared/ai/groq-provider.ts'
import { GeminiProvider } from '../../supabase/functions/_shared/ai/gemini-provider.ts'
import {
  DEFAULT_GEMINI_MODEL_CONFIG,
  DEFAULT_GROQ_MODEL_CONFIG,
} from '../../supabase/functions/_shared/ai/types.ts'
import { AIAPIError } from '../../supabase/functions/_shared/ai/types.ts'

const mockFetch = vi.fn()

describe('FallbackAIProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  const primary = new GroqProvider({
    apiKey: 'groq-key',
    models: DEFAULT_GROQ_MODEL_CONFIG,
    fetchFn: mockFetch as typeof fetch,
  })

  const fallback = new GeminiProvider({
    apiKey: 'gemini-key',
    models: DEFAULT_GEMINI_MODEL_CONFIG,
    fetchFn: mockFetch as typeof fetch,
  })

  const provider = new FallbackAIProvider(primary, fallback)

  it('uses primary provider on success', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          model: DEFAULT_GROQ_MODEL_CONFIG.summary,
          choices: [{ message: { content: '{"ok":true}' } }],
        }),
        { status: 200 },
      ),
    )

    const result = await provider.complete({
      model: primary.getModelForTask('summary'),
      messages: [{ role: 'user', content: 'test' }],
      responseFormat: 'json',
    })

    expect(result.provider).toBe('groq')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('falls back to Gemini when Groq rate limits', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('Too many requests', { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            model: DEFAULT_GEMINI_MODEL_CONFIG.summary,
            choices: [{ message: { content: '{"ok":true}' } }],
          }),
          { status: 200 },
        ),
      )

    const result = await provider.complete({
      model: primary.getModelForTask('summary'),
      messages: [{ role: 'user', content: 'test' }],
      responseFormat: 'json',
    })

    expect(result.provider).toBe('gemini')
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[1]?.[1]?.body).toContain(DEFAULT_GEMINI_MODEL_CONFIG.summary)
  })

  it('rethrows non-retryable primary errors', async () => {
    mockFetch.mockResolvedValueOnce(new Response('Bad request', { status: 400 }))

    await expect(
      provider.complete({
        model: primary.getModelForTask('summary'),
        messages: [{ role: 'user', content: 'test' }],
      }),
    ).rejects.toBeInstanceOf(AIAPIError)
  })
})
