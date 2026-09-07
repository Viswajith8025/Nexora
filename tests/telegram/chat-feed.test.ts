import { describe, expect, it } from 'vitest'
import {
  articlesRelevantToQuery,
  buildFeedGuidance,
  extractSearchTerms,
  isCasualMessage,
} from '../../supabase/functions/_shared/telegram/chat-feed.ts'
import type { ArticleSummary } from '../../supabase/functions/_shared/telegram/types.ts'

function article(partial: Partial<ArticleSummary> & { title: string }): ArticleSummary {
  return {
    id: '1',
    title: partial.title,
    canonical_url: 'https://example.com',
    category: partial.category ?? null,
    published_at: partial.published_at ?? null,
    ai_summary: partial.ai_summary ?? null,
    what_happened: partial.what_happened ?? null,
    one_sentence_takeaway: partial.one_sentence_takeaway ?? null,
    why_it_matters: partial.why_it_matters ?? null,
    developer_impact: partial.developer_impact ?? null,
    recommended_action: partial.recommended_action ?? null,
    importance_score: partial.importance_score ?? null,
    developer_relevance_score: partial.developer_relevance_score ?? null,
    relevance_score: partial.relevance_score ?? null,
    relevance_decision: partial.relevance_decision ?? null,
    discovered_at: partial.discovered_at ?? new Date().toISOString(),
    tags: partial.tags ?? [],
  }
}

describe('extractSearchTerms', () => {
  it('drops stop words and short tokens', () => {
    expect(extractSearchTerms('when did astra release')).toEqual(['astra'])
    expect(extractSearchTerms('gpt 6 released')).toEqual(['gpt'])
  })
})

describe('isCasualMessage', () => {
  it('detects greetings and identity questions', () => {
    expect(isCasualMessage('Hello')).toBe(true)
    expect(isCasualMessage('Who are you')).toBe(true)
    expect(isCasualMessage('Nvidia')).toBe(false)
  })
})

describe('articlesRelevantToQuery', () => {
  const reactArticle = article({
    title: 'React 19 is here',
    ai_summary: 'React 19 ships with new compiler features.',
    tags: ['react'],
  })

  it('returns false when feed is empty', () => {
    expect(articlesRelevantToQuery('gpt astra', [])).toBe(false)
  })

  it('returns false for casual messages even with articles', () => {
    expect(articlesRelevantToQuery('Hello', [reactArticle])).toBe(false)
  })

  it('returns false when query terms do not match feed', () => {
    expect(articlesRelevantToQuery('nvidia', [reactArticle])).toBe(false)
  })

  it('returns true when query matches feed content', () => {
    expect(articlesRelevantToQuery('what is react', [reactArticle])).toBe(true)
  })
})

describe('buildFeedGuidance', () => {
  it('allows general knowledge for casual chat', () => {
    expect(buildFeedGuidance('Hello', [])).toContain('casual')
  })

  it('allows general knowledge when feed has no match', () => {
    expect(buildFeedGuidance('nvidia', [])).toContain('general knowledge')
  })
})
