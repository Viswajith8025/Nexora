import { describe, it, expect } from 'vitest'
import { dedupeByCluster } from '@/features/articles/api/articles'
import type { ArticleWithSource } from '@/features/articles/types'

function makeArticle(overrides: Partial<ArticleWithSource> = {}): ArticleWithSource {
  return {
    id: '1',
    title: 'Test',
    canonical_url: 'https://example.com',
    author: null,
    published_at: null,
    discovered_at: new Date().toISOString(),
    category: 'AI',
    tags: ['react', 'typescript'],
    ai_summary: 'Summary',
    one_sentence_takeaway: 'Takeaway',
    what_happened: null,
    why_it_matters: null,
    developer_impact: null,
    technical_impact: null,
    who_should_care: null,
    recommended_action: null,
    importance_score: 80,
    developer_relevance_score: 70,
    relevance_score: 75,
    relevance_decision: 'digest',
    novelty_score: 50,
    cluster_key: null,
    notification_level: 'normal',
    verification_status: 'verified',
    source: { name: 'OpenAI Blog' },
    ...overrides,
  }
}

describe('search helpers', () => {
  it('dedupes clustered articles for search results', () => {
    const articles = [
      makeArticle({ id: 'a', cluster_key: 'cluster-1', relevance_score: 50 }),
      makeArticle({ id: 'b', cluster_key: 'cluster-1', relevance_score: 90 }),
    ]
    const result = dedupeByCluster(articles)
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('b')
  })

  it('filters saved articles by query locally', () => {
    const saved = [
      makeArticle({ id: '1', title: 'React 19 release', tags: ['react'] }),
      makeArticle({ id: '2', title: 'Postgres 17', tags: ['postgres'] }),
    ]
    const term = 'react'
    const matches = saved.filter((article) => {
      const haystack = [article.title, ...(article.tags ?? [])].join(' ').toLowerCase()
      return haystack.includes(term)
    })
    expect(matches).toHaveLength(1)
    expect(matches[0]?.id).toBe('1')
  })
})
