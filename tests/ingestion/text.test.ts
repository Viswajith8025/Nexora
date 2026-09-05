// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  normalizeTitle,
  titleSimilarity,
  computeContentHash,
  stripHtml,
  truncateText,
} from '../../supabase/functions/_shared/ingestion/text.ts'

describe('text utilities', () => {
  it('normalizes titles for comparison', () => {
    expect(normalizeTitle('OpenAI Releases GPT-5!')).toBe('openai releases gpt 5')
  })

  it('detects similar titles', () => {
    const score = titleSimilarity(
      'OpenAI releases GPT-5 model',
      'OpenAI Releases GPT-5 Model Today',
    )
    expect(score).toBeGreaterThan(0.85)
  })

  it('produces stable content hashes', async () => {
    const hash = await computeContentHash({
      canonicalUrl: 'https://example.com/a',
      normalizedTitle: 'openai releases gpt 5',
      publishedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(hash).toHaveLength(64)
  })

  it('strips HTML from excerpts', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
  })

  it('truncates oversized text', () => {
    const long = 'a'.repeat(100)
    expect(truncateText(long, 20)?.length).toBeLessThanOrEqual(20)
  })
})
