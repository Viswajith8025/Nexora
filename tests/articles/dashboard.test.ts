import { describe, it, expect } from 'vitest'
import { dedupeByCluster } from '@/features/articles/api/articles'
import type { ArticleWithSource } from '@/features/articles/types'
import { formatRelativeTime, getGreeting, getSummary } from '@/features/articles/utils/format'
import { getReadArticleIds, markArticleRead, isArticleRead } from '@/features/articles/utils/read-status'

function makeArticle(overrides: Partial<ArticleWithSource> = {}): ArticleWithSource {
  return {
    id: '1',
    title: 'Test',
    canonical_url: 'https://example.com',
    author: null,
    published_at: null,
    discovered_at: new Date().toISOString(),
    category: 'AI',
    tags: [],
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
    source: { name: 'Source' },
    ...overrides,
  }
}

describe('dedupeByCluster', () => {
  it('keeps highest relevance article per cluster', () => {
    const articles = [
      makeArticle({ id: 'a', cluster_key: 'c1', relevance_score: 60 }),
      makeArticle({ id: 'b', cluster_key: 'c1', relevance_score: 90 }),
      makeArticle({ id: 'c', cluster_key: 'c2', relevance_score: 50 }),
    ]
    const result = dedupeByCluster(articles)
    expect(result).toHaveLength(2)
    expect(result.find((a) => a.cluster_key === 'c1')?.id).toBe('b')
  })
})

describe('format utils', () => {
  it('prefers one sentence takeaway for summary', () => {
    const summary = getSummary({ one_sentence_takeaway: 'Quick', ai_summary: 'Long' })
    expect(summary).toBe('Quick')
  })

  it('returns greeting based on time', () => {
    expect(['Good morning', 'Good afternoon', 'Good evening']).toContain(getGreeting())
  })

  it('formats relative time', () => {
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(recent)).toBe('2h ago')
  })
})

describe('read status', () => {
  it('tracks read articles in localStorage', () => {
    localStorage.clear()
    markArticleRead('article-1')
    expect(isArticleRead('article-1')).toBe(true)
    expect(getReadArticleIds().has('article-1')).toBe(true)
  })
})
