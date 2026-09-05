import type {
  RelevanceDecision,
  RelevanceInput,
  ScoreComponents,
  ScoringConfig,
} from './types.ts'
import { DEFAULT_SCORING_CONFIG, NEUTRAL_SCORE } from './types.ts'
import { applyNoiseFilter, isCriticalSecurityIssue, isMajorAiModelRelease } from './noise-filter.ts'
import {
  computeFeedbackAdjustment,
  computeTopicMatch,
  computeUserInterest,
} from './personalization.ts'
import { resolveSourceQuality } from './source-quality.ts'
import { clampScore, normalizeWeights } from './weights.ts'
import { applyDecisionOverrides, scoreToDecision } from './decision.ts'

export function buildScoreComponents(
  input: RelevanceInput,
): ScoreComponents {
  const user = input.user
  const sourceQuality = resolveSourceQuality(input.source)

  return {
    importance: input.scores.importance,
    developerRelevance: input.scores.developerRelevance,
    urgency: input.scores.urgency,
    novelty: input.scores.novelty,
    confidence: input.scores.confidence,
    sourceQuality,
    userTopicMatch: user
      ? computeTopicMatch(input.article, user.interests, user.followedTopics)
      : NEUTRAL_SCORE,
    userInterest: user
      ? computeUserInterest(input.article, user.interests, user.followedTopics)
      : NEUTRAL_SCORE,
  }
}

export function computeWeightedScore(
  components: ScoreComponents,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): number {
  const weights = normalizeWeights(config.weights)

  const weighted =
    components.importance * weights.importance +
    components.developerRelevance * weights.developerRelevance +
    components.userTopicMatch * weights.userTopicMatch +
    components.urgency * weights.urgency +
    components.novelty * weights.novelty +
    components.confidence * weights.confidence +
    components.sourceQuality * weights.sourceQuality +
    components.userInterest * weights.userInterest

  return clampScore(weighted)
}

export function evaluateRelevance(
  input: RelevanceInput,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): {
  finalScore: number
  decision: RelevanceDecision
  components: ScoreComponents
  weightedScore: number
  noisePenalty: number
  feedbackAdjustment: number
  noise: ReturnType<typeof applyNoiseFilter>
  explanations: string[]
  overrides: string[]
} {
  const components = buildScoreComponents(input)
  const weightedScore = computeWeightedScore(components, config)
  const noise = applyNoiseFilter(input.article, input.scores, input.source)

  const noisePenalty = noise.bypassed
    ? 0
    : Math.min(config.maxNoisePenalty, noise.penalty)

  const feedbackAdjustment = input.user
    ? computeFeedbackAdjustment(input.user.feedback)
    : 0

  let finalScore = clampScore(weightedScore - noisePenalty + feedbackAdjustment)
  const explanations: string[] = []
  const overrides: string[] = []

  explanations.push(`Weighted base score: ${weightedScore}`)
  if (noisePenalty > 0) explanations.push(`Noise penalty: -${noisePenalty} (${noise.reasons.join(', ')})`)
  if (feedbackAdjustment !== 0) {
    explanations.push(`Feedback adjustment: ${feedbackAdjustment > 0 ? '+' : ''}${feedbackAdjustment}`)
  }

  if (components.userTopicMatch > NEUTRAL_SCORE) {
    explanations.push(`Topic match boost: ${components.userTopicMatch}`)
  }

  const thresholds = input.user?.preferences
    ? {
        ...config.thresholds,
        digest: Math.max(config.thresholds.storeOnly, input.user.preferences.notificationThreshold),
      }
    : config.thresholds

  let decision = scoreToDecision(finalScore, thresholds)

  if (isCriticalSecurityIssue(input.article, input.scores)) {
    if (decision !== 'BREAKING') {
      decision = 'BREAKING'
      overrides.push('critical_security_override')
      finalScore = Math.max(finalScore, config.thresholds.breaking)
      explanations.push('Critical security issue elevated to BREAKING')
    }
  }

  if (isMajorAiModelRelease(input.article, input.scores) && finalScore >= config.thresholds.digest) {
    if (decision === 'STORE_ONLY' || decision === 'IGNORE') {
      decision = 'DIGEST'
      overrides.push('major_ai_release_override')
      finalScore = Math.max(finalScore, config.thresholds.digest)
      explanations.push('Major AI model release elevated to DIGEST')
    }
  }

  if (input.user?.preferences) {
    decision = applyDecisionOverrides(decision, input.user.preferences, overrides, explanations)
  }

  if (noise.isNoise && !noise.bypassed && decision !== 'IGNORE' && finalScore < config.thresholds.storeOnly) {
    decision = 'IGNORE'
    overrides.push('noise_filter_override')
    explanations.push('Noise filter forced IGNORE')
  }

  return {
    finalScore,
    decision,
    components,
    weightedScore,
    noisePenalty,
    feedbackAdjustment,
    noise,
    explanations,
    overrides,
  }
}
