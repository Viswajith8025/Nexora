// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { findDuplicate } from '../../supabase/functions/_shared/ingestion/dedupe.ts'

const existing = [
  {
    id: '1',
    canonical_url: 'https://example.com/a',
    content_hash: 'hash-a',
    normalized_title: 'openai releases gpt 5',
    title: 'OpenAI Releases GPT-5',
    published_at: '2026-09-01T00:00:00.000Z',
  },
]

describe('deduplication', () => {
  it('matches canonical URLs', () => {
    const match = findDuplicate(
      {
        canonicalUrl: 'https://example.com/a',
        contentHash: 'different',
        normalizedTitle: 'other',
        title: 'Other',
        publishedAt: null,
      },
      existing,
    )
    expect(match?.type).toBe('canonical_url')
  })

  it('matches content hashes', () => {
    const match = findDuplicate(
      {
        canonicalUrl: 'https://example.com/b',
        contentHash: 'hash-a',
        normalizedTitle: 'other',
        title: 'Other',
        publishedAt: null,
      },
      existing,
    )
    expect(match?.type).toBe('content_hash')
  })

  it('matches similar titles', () => {
    const match = findDuplicate(
      {
        canonicalUrl: 'https://other.com/gpt5',
        contentHash: 'hash-b',
        normalizedTitle: 'openai releases gpt 5',
        title: 'OpenAI Releases GPT-5 Today',
        publishedAt: '2026-09-01T12:00:00.000Z',
      },
      existing,
    )
    expect(match?.type).toBe('title_similarity')
  })

  it('returns null when no duplicate exists', () => {
    const match = findDuplicate(
      {
        canonicalUrl: 'https://example.com/new',
        contentHash: 'hash-new',
        normalizedTitle: 'kubernetes 2 ships',
        title: 'Kubernetes 2 Ships',
        publishedAt: '2026-09-01T00:00:00.000Z',
      },
      existing,
    )
    expect(match).toBeNull()
  })
})
