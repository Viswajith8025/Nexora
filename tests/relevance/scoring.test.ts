// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { scoreToDecision } from '../../supabase/functions/_shared/relevance/decision.ts'
import { normalizeWeights, clampScore } from '../../supabase/functions/_shared/relevance/weights.ts'
import { computeWeightedScore } from '../../supabase/functions/_shared/relevance/scoring.ts'
import { DEFAULT_SCORING_WEIGHTS } from '../../supabase/functions/_shared/relevance/types.ts'

describe('scoring weights', () => {
  it('normalizes weights to sum to 1', () => {
    const normalized = normalizeWeights({
      importance: 30,
      developerRelevance: 25,
      userTopicMatch: 15,
      urgency: 10,
      novelty: 10,
      confidence: 10,
      sourceQuality: 5,
      userInterest: 5,
    })

    const sum = Object.values(normalized).reduce((total, value) => total + value, 0)
    expect(sum).toBeCloseTo(1, 5)
  })

  it('uses default conceptual weighting proportions', () => {
    const sum = Object.values(DEFAULT_SCORING_WEIGHTS).reduce((total, value) => total + value, 0)
    expect(sum).toBeCloseTo(1, 5)
    expect(DEFAULT_SCORING_WEIGHTS.importance).toBe(0.3)
    expect(DEFAULT_SCORING_WEIGHTS.developerRelevance).toBe(0.25)
    expect(DEFAULT_SCORING_WEIGHTS.userTopicMatch).toBe(0.15)
  })

  it('clamps scores between 0 and 100', () => {
    expect(clampScore(150)).toBe(100)
    expect(clampScore(-10)).toBe(0)
    expect(clampScore(72.6)).toBe(73)
  })
})

describe('decision thresholds', () => {
  it('maps scores to notification levels', () => {
    expect(scoreToDecision(95)).toBe('BREAKING')
    expect(scoreToDecision(90)).toBe('BREAKING')
    expect(scoreToDecision(85)).toBe('DIGEST')
    expect(scoreToDecision(70)).toBe('DIGEST')
    expect(scoreToDecision(55)).toBe('STORE_ONLY')
    expect(scoreToDecision(50)).toBe('STORE_ONLY')
    expect(scoreToDecision(49)).toBe('IGNORE')
  })
})

describe('weighted score calculation', () => {
  it('produces normalized 0-100 composite score', () => {
    const score = computeWeightedScore({
      importance: 80,
      developerRelevance: 80,
      userTopicMatch: 50,
      urgency: 80,
      novelty: 80,
      confidence: 80,
      sourceQuality: 90,
      userInterest: 50,
    })

    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
    expect(score).toBe(76)
  })
})
