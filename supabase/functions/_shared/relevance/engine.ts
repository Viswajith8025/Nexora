import type { RelevanceInput, RelevanceResult, ScoringConfig } from './types.ts'
import { toDbDecision } from './types.ts'
import { evaluateRelevance } from './scoring.ts'

export function evaluateArticleRelevance(
  input: RelevanceInput,
  config?: ScoringConfig,
): RelevanceResult {
  return evaluateRelevance(input, config)
}

export function articleRelevanceToDbUpdate(result: RelevanceResult): Record<string, unknown> {
  return {
    relevance_score: result.finalScore,
    relevance_decision: toDbDecision(result.decision),
    relevance_factors: {
      components: result.components,
      weightedScore: result.weightedScore,
      noisePenalty: result.noisePenalty,
      feedbackAdjustment: result.feedbackAdjustment,
      noise: result.noise,
      overrides: result.overrides,
      explanations: result.explanations,
    },
  }
}
