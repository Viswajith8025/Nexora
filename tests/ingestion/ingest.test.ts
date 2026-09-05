// @vitest-environment node
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ingestSource } from '../../supabase/functions/_shared/ingestion/ingest.ts'
import type { SourceRecord } from '../../supabase/functions/_shared/ingestion/types.ts'

const source: SourceRecord = {
  id: 'source-1',
  name: 'Test Feed',
  type: 'rss',
  url: 'https://example.com/feed.xml',
  category: 'AI',
  is_active: true,
  fetch_interval_minutes: 60,
  last_fetched_at: null,
  metadata: {},
}

const VALID_RSS = `<?xml version="1.0"?><rss version="2.0"><channel>
  <item>
    <title>Launch</title>
    <link>https://example.com/launch</link>
    <description>Details</description>
  </item>
</channel></rss>`

function createMockSupabase(options: {
  insertError?: { code: string; message: string } | null
  existingArticle?: { id: string; canonical_url: string } | null
} = {}) {
  const articleStore = options.existingArticle ? [options.existingArticle] : []

  return {
    from: vi.fn((table: string) => {
      if (table === 'articles') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn(async () => {
                if (options.insertError) {
                  return { data: null, error: options.insertError }
                }
                const row = { id: 'article-1', canonical_url: 'https://example.com/launch' }
                articleStore.push(row)
                return { data: row, error: null }
              }),
            })),
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: articleStore[0] ?? null,
                error: null,
              })),
            })),
          })),
        }
      }

      if (table === 'article_sources') {
        return {
          upsert: vi.fn(async () => ({ error: null })),
        }
      }

      if (table === 'sources') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }

      return {}
    }),
  }
}

describe('ingestSource', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(VALID_RSS, {
          status: 200,
          headers: { 'content-type': 'application/rss+xml' },
        }),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('inserts new articles from valid RSS', async () => {
    const supabase = createMockSupabase()
    const result = await ingestSource(supabase as unknown as SupabaseClient, source, [])

    expect(result.inserted).toBe(1)
    expect(result.errors).toHaveLength(0)
  })

  it('deduplicates existing canonical URLs', async () => {
    const supabase = createMockSupabase()
    const existing = [
      {
        id: 'existing-1',
        canonical_url: 'https://example.com/launch',
        content_hash: 'hash',
        normalized_title: 'launch',
        title: 'Launch',
        published_at: null,
      },
    ]

    const result = await ingestSource(supabase as unknown as SupabaseClient, source, existing)
    expect(result.duplicates).toBe(1)
    expect(result.inserted).toBe(0)
  })

  it('continues when a source fetch fails', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('error', { status: 500 }))

    const supabase = createMockSupabase()
    const result = await ingestSource(supabase as unknown as SupabaseClient, source, [])

    expect(result.inserted).toBe(0)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('handles race-condition unique violations idempotently', async () => {
    const supabase = createMockSupabase({
      insertError: { code: '23505', message: 'duplicate key value' },
      existingArticle: { id: 'existing-1', canonical_url: 'https://example.com/launch' },
    })

    const result = await ingestSource(supabase as unknown as SupabaseClient, source, [])
    expect(result.duplicates).toBe(1)
  })
})
