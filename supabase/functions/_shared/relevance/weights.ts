import type { ScoringWeights } from './types.ts'
import { DEFAULT_SCORING_WEIGHTS } from './types.ts'

export function normalizeWeights(weights: ScoringWeights): ScoringWeights {
  const sum = Object.values(weights).reduce((total, value) => total + value, 0)
  if (sum <= 0) return DEFAULT_SCORING_WEIGHTS

  return {
    importance: weights.importance / sum,
    developerRelevance: weights.developerRelevance / sum,
    userTopicMatch: weights.userTopicMatch / sum,
    urgency: weights.urgency / sum,
    novelty: weights.novelty / sum,
    confidence: weights.confidence / sum,
    sourceQuality: weights.sourceQuality / sum,
    userInterest: weights.userInterest / sum,
  }
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}
