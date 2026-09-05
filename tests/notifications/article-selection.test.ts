// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  dedupeArticlesByCluster,
  filterMeaningfulArticles,
  hasMeaningfulContent,
} from '../../supabase/functions/_shared/notifications/article-selection.ts'
import type { DigestArticle } from '../../supabase/functions/_shared/notifications/types.ts'

function article(overrides: Partial<DigestArticle> = {}): DigestArticle {
  return {
    id: '1',
    title: 'Test Article',
    canonical_url: 'https://example.com/1',
    category: 'AI',
    cluster_key: null,
    ai_summary: 'Summary',
    what_happened: 'Happened',
    one_sentence_takeaway: 'Takeaway',
    why_it_matters: 'Matters',
    who_should_care: 'Developers',
    recommended_action: 'Review',
    relevance_score: 80,
    importance_score: 80,
    novelty_score: 70,
    relevance_decision: 'digest',
    discovered_at: new Date().toISOString(),
    tags: ['ai'],
    ...overrides,
  }
}

describe('article selection', () => {
  it('dedupes articles by cluster key', () => {
    const result = dedupeArticlesByCluster([
      article({ id: '1', cluster_key: 'gpt-5', relevance_score: 70 }),
      article({ id: '2', cluster_key: 'gpt-5', relevance_score: 90, title: 'Better coverage' }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('2')
  })

  it('filters low relevance articles', () => {
    const result = filterMeaningfulArticles([
      article({ relevance_score: 40 }),
      article({ id: '2', relevance_score: 75 }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('2')
  })

  it('detects when there is no meaningful content', () => {
    expect(hasMeaningfulContent([article({ relevance_score: 30 })])).toBe(false)
    expect(hasMeaningfulContent([article({ relevance_score: 80 })])).toBe(true)
  })
})
