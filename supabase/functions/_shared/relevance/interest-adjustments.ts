import type { ArticleContext, FeedbackSignal, UserInterest } from './types.ts'

export const INTEREST_BOOST = 10
export const INTEREST_PENALTY = 10
export const MAX_INTEREST_WEIGHT = 100
export const MIN_INTEREST_WEIGHT = 0

function clampWeight(weight: number): number {
  return Math.max(MIN_INTEREST_WEIGHT, Math.min(MAX_INTEREST_WEIGHT, weight))
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function interestsForArticle(article: ArticleContext): UserInterest[] {
  const interests: UserInterest[] = []

  if (article.category) {
    interests.push({ interestType: 'category', value: article.category, weight: 50 })
  }

  for (const tag of article.tags) {
    interests.push({ interestType: 'technology', value: tag, weight: 50 })
  }

  return interests
}

function findMatchingInterest(
  interests: UserInterest[],
  candidate: UserInterest,
): UserInterest | undefined {
  return interests.find(
    (interest) =>
      interest.interestType === candidate.interestType &&
      normalize(interest.value) === normalize(candidate.value),
  )
}

export function applyFeedbackToInterests(
  article: ArticleContext,
  signal: FeedbackSignal,
  currentInterests: UserInterest[],
): { interests: UserInterest[]; adjustments: string[] } {
  const adjustments: string[] = []
  const next = currentInterests.map((interest) => ({ ...interest }))
  const derived = interestsForArticle(article)

  const positive = signal === 'relevant' || signal === 'more_like_this' || signal === 'save'
  const negative =
    signal === 'not_relevant' ||
    signal === 'less_like_this' ||
    signal === 'dismiss' ||
    signal === 'too_technical'

  if (!positive && !negative) {
    return { interests: next, adjustments }
  }

  const delta = positive ? INTEREST_BOOST : -INTEREST_PENALTY
  const penaltyOnlyTech = signal === 'too_technical'

  for (const candidate of derived) {
    if (penaltyOnlyTech && candidate.interestType === 'category') continue

    const existing = findMatchingInterest(next, candidate)
    if (existing) {
      const before = existing.weight
      existing.weight = clampWeight(existing.weight + delta)
      if (existing.weight !== before) {
        adjustments.push(
          `${existing.interestType}:${existing.value} ${existing.weight > before ? '+' : ''}${existing.weight - before} → ${existing.weight}`,
        )
      }
      continue
    }

    if (positive) {
      next.push({
        interestType: candidate.interestType,
        value: candidate.value,
        weight: clampWeight(50 + INTEREST_BOOST),
      })
      adjustments.push(`added ${candidate.interestType}:${candidate.value} at ${clampWeight(50 + INTEREST_BOOST)}`)
    }
  }

  return { interests: next, adjustments }
}
