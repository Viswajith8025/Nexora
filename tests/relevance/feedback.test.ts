// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computeFeedbackAdjustment } from '../../supabase/functions/_shared/relevance/personalization.ts'
import { applyFeedbackToInterests } from '../../supabase/functions/_shared/relevance/interest-adjustments.ts'
import { evaluateArticleRelevance } from '../../supabase/functions/_shared/relevance/engine.ts'
import { majorNextJsRelease, defaultPreferences } from './fixtures.ts'

describe('feedback signals', () => {
  it('boosts score for useful and more_like_this', () => {
    expect(computeFeedbackAdjustment(['relevant'])).toBe(15)
    expect(computeFeedbackAdjustment(['more_like_this'])).toBe(20)
    expect(computeFeedbackAdjustment(['relevant', 'more_like_this'])).toBe(30)
  })

  it('reduces score for negative feedback', () => {
    expect(computeFeedbackAdjustment(['not_relevant'])).toBe(-25)
    expect(computeFeedbackAdjustment(['less_like_this'])).toBe(-20)
    expect(computeFeedbackAdjustment(['too_technical'])).toBe(-12)
  })
})

describe('interest adjustments from feedback', () => {
  it('boosts matching technology interest after more_like_this', () => {
    const article = majorNextJsRelease.article
    const before = [{ interestType: 'technology' as const, value: 'nextjs', weight: 60 }]
    const { interests, adjustments } = applyFeedbackToInterests(article, 'more_like_this', before)

    expect(interests[0]?.weight).toBe(70)
    expect(adjustments.length).toBeGreaterThan(0)
  })

  it('reduces matching interest after less_like_this', () => {
    const article = majorNextJsRelease.article
    const before = [{ interestType: 'technology' as const, value: 'nextjs', weight: 60 }]
    const { interests } = applyFeedbackToInterests(article, 'less_like_this', before)

    expect(interests[0]?.weight).toBe(50)
  })
})

describe('feedback changes future scoring', () => {
  it('increases personalized score after positive feedback on similar content', () => {
    const base = evaluateArticleRelevance(majorNextJsRelease)
    const afterPositive = evaluateArticleRelevance({
      ...majorNextJsRelease,
      user: {
        interests: majorNextJsRelease.user?.interests ?? [],
        followedTopics: majorNextJsRelease.user?.followedTopics ?? [],
        feedback: ['more_like_this'],
        preferences: defaultPreferences,
      },
    })

    expect(afterPositive.finalScore).toBeGreaterThan(base.finalScore)
    expect(afterPositive.feedbackAdjustment).toBeGreaterThan(0)
  })

  it('decreases personalized score after negative feedback', () => {
    const base = evaluateArticleRelevance({
      ...majorNextJsRelease,
      user: {
        interests: majorNextJsRelease.user?.interests ?? [],
        followedTopics: majorNextJsRelease.user?.followedTopics ?? [],
        feedback: [],
        preferences: defaultPreferences,
      },
    })

    const afterNegative = evaluateArticleRelevance({
      ...majorNextJsRelease,
      user: {
        interests: majorNextJsRelease.user?.interests ?? [],
        followedTopics: majorNextJsRelease.user?.followedTopics ?? [],
        feedback: ['not_relevant', 'too_technical'],
        preferences: defaultPreferences,
      },
    })

    expect(afterNegative.finalScore).toBeLessThan(base.finalScore)
  })

  it('respects user notification threshold for digest eligibility', () => {
    const strict = evaluateArticleRelevance({
      ...majorNextJsRelease,
      user: {
        interests: majorNextJsRelease.user?.interests ?? [],
        followedTopics: majorNextJsRelease.user?.followedTopics ?? [],
        feedback: [],
        preferences: { ...defaultPreferences, notificationThreshold: 85 },
      },
    })

    const relaxed = evaluateArticleRelevance({
      ...majorNextJsRelease,
      user: {
        interests: majorNextJsRelease.user?.interests ?? [],
        followedTopics: majorNextJsRelease.user?.followedTopics ?? [],
        feedback: [],
        preferences: { ...defaultPreferences, notificationThreshold: 55 },
      },
    })

    expect(strict.decision).not.toBe('IGNORE')
    expect(relaxed.finalScore).toBeGreaterThanOrEqual(strict.finalScore)
  })
})
