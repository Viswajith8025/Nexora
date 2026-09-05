/**
 * Relevance types for the browser — scoring logic lives in Edge Functions only.
 */
export type {
  RelevanceDecision,
  ScoringWeights,
  DecisionThresholds,
  ScoringConfig,
} from '../../../supabase/functions/_shared/relevance/types.ts'

export {
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_THRESHOLDS,
  DEFAULT_SCORING_CONFIG,
} from '../../../supabase/functions/_shared/relevance/types.ts'
