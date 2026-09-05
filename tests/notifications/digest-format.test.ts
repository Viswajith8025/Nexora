// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  formatEveningDigest,
  formatMorningDigest,
  formatWeeklyDigest,
} from '../../supabase/functions/_shared/notifications/digest-format.ts'
import type { DigestArticle } from '../../supabase/functions/_shared/notifications/types.ts'

const articles: DigestArticle[] = [
  {
    id: '1',
    title: 'OpenAI Announces GPT-5',
    canonical_url: 'https://example.com/gpt5',
    category: 'AI',
    cluster_key: 'gpt-5',
    ai_summary: 'Major model release.',
    what_happened: 'GPT-5 launched.',
    one_sentence_takeaway: 'Better coding APIs.',
    why_it_matters: 'Changes model selection.',
    who_should_care: 'AI application developers',
    recommended_action: 'Review release notes.',
    relevance_score: 92,
    importance_score: 95,
    novelty_score: 88,
    relevance_decision: 'breaking',
    discovered_at: new Date().toISOString(),
    tags: ['openai', 'gpt-5'],
  },
  {
    id: '2',
    title: 'Next.js 15 Released',
    canonical_url: 'https://example.com/next15',
    category: 'Development',
    cluster_key: 'next-15',
    ai_summary: 'Major framework release.',
    what_happened: 'Next.js 15 shipped.',
    one_sentence_takeaway: 'App router changes.',
    why_it_matters: 'Migration impact.',
    who_should_care: 'Frontend teams',
    recommended_action: 'Plan upgrade.',
    relevance_score: 85,
    importance_score: 86,
    novelty_score: 80,
    relevance_decision: 'digest',
    discovered_at: new Date().toISOString(),
    tags: ['nextjs'],
  },
]

describe('digest formatting', () => {
  const baseArticle = articles[0]!

  it('formats morning digest with required sections', () => {
    const digest = formatMorningDigest(articles)
    expect(digest).toContain('NEXORA DAILY')
    expect(digest).toContain('MUST KNOW')
    expect(digest).toContain('AI')
    expect(digest).toContain('DEVELOPMENT')
    expect(digest).toContain('ONE THING TO LEARN')
    expect(digest).toContain('MEETING KNOWLEDGE')
  })

  it('returns null when there is no meaningful news', () => {
    const lowValue: DigestArticle = { ...baseArticle, relevance_score: 30, importance_score: 20 }
    expect(formatMorningDigest([lowValue])).toBeNull()
  })

  it('formats evening digest only with meaningful items', () => {
    const digest = formatEveningDigest(articles)
    expect(digest).toContain('EVENING UPDATE')
    const lowValue: DigestArticle = { ...baseArticle, relevance_score: 20 }
    expect(formatEveningDigest([lowValue])).toBeNull()
  })

  it('formats weekly digest with what changed section', () => {
    const digest = formatWeeklyDigest(articles)
    expect(digest).toContain('NEXORA WEEKLY')
    expect(digest).toContain('What changed this week?')
  })
})
