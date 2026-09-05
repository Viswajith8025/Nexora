// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { evaluateArticleRelevance } from '../../supabase/functions/_shared/relevance/engine.ts'
import { applyDecisionOverrides } from '../../supabase/functions/_shared/relevance/decision.ts'
import {
  celebrityTechArticle,
  consumerGadgetArticle,
  criticalSecurityVulnerability,
  defaultPreferences,
  duplicateNews,
  majorAiModelRelease,
  majorNextJsRelease,
  minorNpmPatch,
} from './fixtures.ts'

describe('notification decision scenarios', () => {
  it('major AI model release → BREAKING', () => {
    const result = evaluateArticleRelevance(majorAiModelRelease)
    expect(result.decision).toBe('BREAKING')
    expect(result.finalScore).toBeGreaterThanOrEqual(90)
  })

  it('critical security vulnerability → BREAKING', () => {
    const result = evaluateArticleRelevance(criticalSecurityVulnerability)
    expect(result.decision).toBe('BREAKING')
    expect(result.overrides).toContain('critical_security_override')
  })

  it('minor npm patch → IGNORE', () => {
    const result = evaluateArticleRelevance(minorNpmPatch)
    expect(result.decision).toBe('IGNORE')
    expect(result.noise.reasons).toContain('minor_release')
  })

  it('celebrity technology article → IGNORE', () => {
    const result = evaluateArticleRelevance(celebrityTechArticle)
    expect(result.decision).toBe('IGNORE')
    expect(result.noise.isNoise).toBe(true)
  })

  it('major Next.js release → DIGEST or BREAKING', () => {
    const result = evaluateArticleRelevance(majorNextJsRelease)
    expect(['DIGEST', 'BREAKING']).toContain(result.decision)
    expect(result.finalScore).toBeGreaterThanOrEqual(70)
    expect(result.noise.bypassed).toBe(true)
  })

  it('random consumer gadget article → IGNORE', () => {
    const result = evaluateArticleRelevance(consumerGadgetArticle)
    expect(result.decision).toBe('IGNORE')
    expect(result.noise.reasons).toContain('consumer_gadget')
  })

  it('duplicate news → STORE_ONLY or IGNORE', () => {
    const original = evaluateArticleRelevance(majorAiModelRelease)
    const result = evaluateArticleRelevance(duplicateNews)
    expect(['STORE_ONLY', 'IGNORE']).toContain(result.decision)
    expect(result.noise.reasons).toContain('duplicate_announcement')
    expect(result.finalScore).toBeLessThan(original.finalScore)
  })
})

describe('user preference overrides', () => {
  it('downgrades BREAKING when breaking alerts disabled', () => {
    const overrides: string[] = []
    const explanations: string[] = []
    const decision = applyDecisionOverrides(
      'BREAKING',
      { ...defaultPreferences, breakingAlertsEnabled: false },
      overrides,
      explanations,
    )
    expect(decision).toBe('DIGEST')
    expect(overrides).toContain('breaking_alerts_disabled')
  })

  it('downgrades DIGEST when all digests disabled', () => {
    const overrides: string[] = []
    const explanations: string[] = []
    const decision = applyDecisionOverrides(
      'DIGEST',
      {
        ...defaultPreferences,
        morningDigestEnabled: false,
        eveningDigestEnabled: false,
        weeklyDigestEnabled: false,
      },
      overrides,
      explanations,
    )
    expect(decision).toBe('STORE_ONLY')
  })
})

describe('personalization', () => {
  it('increases relevance when user interests match', () => {
    const withoutUser = evaluateArticleRelevance({
      article: majorNextJsRelease.article,
      scores: majorNextJsRelease.scores,
      source: majorNextJsRelease.source,
    })
    const withUser = evaluateArticleRelevance(majorNextJsRelease)
    expect(withUser.finalScore).toBeGreaterThan(withoutUser.finalScore)
    expect(withUser.components.userTopicMatch).toBeGreaterThan(50)
  })

  it('decreases relevance after negative feedback', () => {
    const base = evaluateArticleRelevance(majorNextJsRelease)
    const withNegative = evaluateArticleRelevance({
      ...majorNextJsRelease,
      user: {
        interests: majorNextJsRelease.user?.interests ?? [],
        followedTopics: majorNextJsRelease.user?.followedTopics ?? [],
        feedback: ['not_relevant', 'dismiss'],
        preferences: defaultPreferences,
      },
    })
    expect(withNegative.finalScore).toBeLessThan(base.finalScore)
  })
})
