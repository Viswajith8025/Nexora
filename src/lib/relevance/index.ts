export {
  evaluateArticleRelevance,
  computeFeedbackAdjustment,
  applyFeedbackToInterests,
  buildDeliveryExplanation,
  formatDeliveryExplanation,
  articleRelevanceToDbUpdate,
  toDbDecision,
} from '../../../supabase/functions/_shared/relevance/index.ts'

export type {
  FeedbackSignal,
  RelevanceInput,
  RelevanceResult,
  UserInterest,
  UserPreferences,
} from '../../../supabase/functions/_shared/relevance/types.ts'
