import type { DecisionThresholds, RelevanceDecision, UserPreferences } from './types.ts'
import { DEFAULT_THRESHOLDS } from './types.ts'

export function scoreToDecision(
  score: number,
  thresholds: DecisionThresholds = DEFAULT_THRESHOLDS,
): RelevanceDecision {
  if (score >= thresholds.breaking) return 'BREAKING'
  if (score >= thresholds.digest) return 'DIGEST'
  if (score >= thresholds.storeOnly) return 'STORE_ONLY'
  return 'IGNORE'
}

export function applyDecisionOverrides(
  decision: RelevanceDecision,
  preferences: UserPreferences,
  overrides: string[],
  explanations: string[],
): RelevanceDecision {
  let result = decision

  if (result === 'BREAKING' && !preferences.breakingAlertsEnabled) {
    result = 'DIGEST'
    overrides.push('breaking_alerts_disabled')
    explanations.push('Breaking alerts disabled — downgraded to DIGEST')
  }

  const digestEnabled =
    preferences.morningDigestEnabled ||
    preferences.eveningDigestEnabled ||
    preferences.weeklyDigestEnabled

  if (result === 'DIGEST' && !digestEnabled) {
    result = 'STORE_ONLY'
    overrides.push('digest_disabled')
    explanations.push('All digests disabled — downgraded to STORE_ONLY')
  }

  return result
}
