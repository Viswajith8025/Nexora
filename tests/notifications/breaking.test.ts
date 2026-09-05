// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isBreakingArticle, isCriticalBreaking } from '../../supabase/functions/_shared/notifications/breaking.ts'
import type { DigestArticle } from '../../supabase/functions/_shared/notifications/types.ts'

const breakingArticle: DigestArticle = {
  id: '1',
  title: 'Critical CVE-2024-99999 Remote Code Execution',
  canonical_url: 'https://example.com/cve',
  category: 'Security',
  cluster_key: null,
  ai_summary: 'Critical vulnerability.',
  what_happened: 'RCE discovered.',
  one_sentence_takeaway: 'Patch immediately.',
  why_it_matters: 'Active exploitation.',
  who_should_care: 'All backend teams',
  recommended_action: 'Patch now.',
  relevance_score: 95,
  importance_score: 92,
  novelty_score: 80,
  relevance_decision: 'breaking',
  discovered_at: new Date().toISOString(),
  tags: ['security', 'cve'],
}

describe('breaking alerts', () => {
  it('identifies breaking articles', () => {
    expect(isBreakingArticle(breakingArticle)).toBe(true)
  })

  it('identifies critical security for quiet-hour bypass', () => {
    expect(isCriticalBreaking(breakingArticle)).toBe(true)
  })

  it('does not treat ordinary updates as breaking', () => {
    expect(
      isBreakingArticle({
        id: '2',
        title: 'lodash patch release with bug fixes only',
        canonical_url: 'https://example.com/lodash',
        category: 'Development',
        cluster_key: null,
        ai_summary: 'Routine patch.',
        what_happened: 'Minor bug fixes.',
        one_sentence_takeaway: 'Low impact.',
        why_it_matters: 'Minimal.',
        who_should_care: 'Maintainers',
        recommended_action: 'Optional update.',
        relevance_score: 35,
        importance_score: 20,
        novelty_score: 10,
        relevance_decision: 'store_only',
        discovered_at: new Date().toISOString(),
        tags: ['npm'],
      }),
    ).toBe(false)
  })
})
