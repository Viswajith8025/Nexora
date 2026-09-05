export type RelevanceDecision = 'BREAKING' | 'DIGEST' | 'STORE_ONLY' | 'IGNORE'

export type DbRelevanceDecision = 'breaking' | 'digest' | 'store_only' | 'ignore'

export type SourceTrustTier =
  | 'official_doc'
  | 'official_announcement'
  | 'github'
  | 'reputable_publication'
  | 'community'
  | 'unknown'

export type FeedbackSignal =
  | 'relevant'
  | 'not_relevant'
  | 'save'
  | 'dismiss'
  | 'more_like_this'
  | 'less_like_this'
  | 'too_technical'

export type UserInterest = {
  interestType: 'category' | 'technology' | 'company' | 'project' | 'topic'
  value: string
  weight: number
}

export type UserPreferences = {
  breakingAlertsEnabled: boolean
  morningDigestEnabled: boolean
  eveningDigestEnabled: boolean
  weeklyDigestEnabled: boolean
  notificationThreshold: number
}

export type ScoringWeights = {
  importance: number
  developerRelevance: number
  userTopicMatch: number
  urgency: number
  novelty: number
  confidence: number
  sourceQuality: number
  userInterest: number
}

export type DecisionThresholds = {
  breaking: number
  digest: number
  storeOnly: number
}

export type ScoringConfig = {
  weights: ScoringWeights
  thresholds: DecisionThresholds
  maxNoisePenalty: number
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  importance: 0.3,
  developerRelevance: 0.25,
  userTopicMatch: 0.15,
  urgency: 0.1,
  novelty: 0.1,
  confidence: 0.1,
  sourceQuality: 0,
  userInterest: 0,
}

export const DEFAULT_THRESHOLDS: DecisionThresholds = {
  breaking: 90,
  digest: 70,
  storeOnly: 50,
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: DEFAULT_SCORING_WEIGHTS,
  thresholds: DEFAULT_THRESHOLDS,
  maxNoisePenalty: 40,
}

export const NEUTRAL_SCORE = 50

export type ArticleScores = {
  importance: number
  developerRelevance: number
  urgency: number
  novelty: number
  confidence: number
}

export type ArticleContext = {
  id: string
  title: string
  category: string | null
  tags: string[]
  verificationStatus: string
  whatHappened?: string | null
  aiSummary?: string | null
  clusterKey?: string | null
  isDuplicate?: boolean
}

export type SourceContext = {
  name: string
  type: string
  trustTier: SourceTrustTier
  metadata?: Record<string, unknown>
}

export type RelevanceInput = {
  article: ArticleContext
  scores: ArticleScores
  source: SourceContext
  user?: {
    interests: UserInterest[]
    followedTopics: string[]
    feedback: FeedbackSignal[]
    preferences: UserPreferences
  }
}

export type ScoreComponents = {
  importance: number
  developerRelevance: number
  userTopicMatch: number
  urgency: number
  novelty: number
  confidence: number
  sourceQuality: number
  userInterest: number
}

export type NoiseFilterResult = {
  isNoise: boolean
  penalty: number
  reasons: string[]
  bypassed: boolean
  exception?: string
}

export type RelevanceResult = {
  finalScore: number
  decision: RelevanceDecision
  components: ScoreComponents
  weightedScore: number
  noisePenalty: number
  feedbackAdjustment: number
  noise: NoiseFilterResult
  explanations: string[]
  overrides: string[]
}

export function toDbDecision(decision: RelevanceDecision): DbRelevanceDecision {
  switch (decision) {
    case 'BREAKING':
      return 'breaking'
    case 'DIGEST':
      return 'digest'
    case 'STORE_ONLY':
      return 'store_only'
    case 'IGNORE':
      return 'ignore'
  }
}

export function fromDbDecision(decision: DbRelevanceDecision): RelevanceDecision {
  switch (decision) {
    case 'breaking':
      return 'BREAKING'
    case 'digest':
      return 'DIGEST'
    case 'store_only':
      return 'STORE_ONLY'
    case 'ignore':
      return 'IGNORE'
  }
}
