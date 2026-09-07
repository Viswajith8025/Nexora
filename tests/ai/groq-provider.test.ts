// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  GroqProvider,
} from '../../supabase/functions/_shared/ai/groq-provider.ts'
import { AIAPIError, AIRateLimitError, DEFAULT_MODEL_CONFIG } from '../../supabase/functions/_shared/ai/types.ts'

const mockFetch = vi.fn()

describe('GroqProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  const provider = new GroqProvider({
    apiKey: 'test-key',
    models: DEFAULT_MODEL_CONFIG,
    fetchFn: mockFetch as typeof fetch,
  })

  it('returns valid AI output on success', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          choices: [{ message: { content: '{"ok":true}' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
        { status: 200 },
      ),
    )

    const result = await provider.complete({
      model: provider.getModelForTask('summary'),
      messages: [{ role: 'user', content: 'test' }],
      responseFormat: 'json',
    })

    expect(result.content).toBe('{"ok":true}')
    expect(result.usage?.promptTokens).toBe(10)
  })

  it('throws on API failure', async () => {
    mockFetch.mockResolvedValue(new Response('Server error', { status: 500 }))

    await expect(
      provider.complete({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'test' }],
      }),
    ).rejects.toBeInstanceOf(AIAPIError)
  })

  it('throws on rate limit', async () => {
    mockFetch.mockResolvedValue(new Response('Too many requests', { status: 429 }))

    await expect(
      provider.complete({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'test' }],
      }),
    ).rejects.toBeInstanceOf(AIRateLimitError)
  })

  it('throws on timeout', async () => {
    mockFetch.mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('Aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })
    })

    const fastProvider = new GroqProvider({
      apiKey: 'test-key',
      models: DEFAULT_MODEL_CONFIG,
      fetchTimeoutMs: 50,
      fetchFn: mockFetch as typeof fetch,
    })

    await expect(
      fastProvider.complete({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'test' }],
      }),
    ).rejects.toBeInstanceOf(AIAPIError)
  })

  it('selects economical model for classification', () => {
    expect(provider.getModelForTask('classification')).toBe(DEFAULT_MODEL_CONFIG.classification)
  })
})
