// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWithLimits } from '../../supabase/functions/_shared/ingestion/fetch.ts'

describe('fetchWithLimits', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns feed body for successful responses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('<rss></rss>', {
        status: 200,
        headers: { 'content-type': 'application/rss+xml' },
      }),
    )

    const result = await fetchWithLimits('https://example.com/feed.xml')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.body).toContain('<rss>')
    }
  })

  it('handles source HTTP failures', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Not Found', { status: 404 }))

    const result = await fetchWithLimits('https://example.com/feed.xml')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('404')
    }
  })

  it('handles source timeouts', async () => {
    vi.mocked(fetch).mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('Aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })
    })

    const result = await fetchWithLimits('https://example.com/feed.xml', { timeoutMs: 20 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('timed out')
    }
  })

  it('rejects oversized responses', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(2048))
        controller.close()
      },
    })

    vi.mocked(fetch).mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'content-length': '99999999' },
      }),
    )

    const result = await fetchWithLimits('https://example.com/feed.xml', { maxBytes: 1024 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('too large')
    }
  })
})
