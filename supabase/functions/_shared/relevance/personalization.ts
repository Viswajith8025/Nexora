import type { ArticleContext, FeedbackSignal, UserInterest } from './types.ts'
import { NEUTRAL_SCORE } from './types.ts'

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function textContains(text: string, needle: string): boolean {
  return normalize(text).includes(normalize(needle))
}

function matchInterest(article: ArticleContext, interest: UserInterest): number | null {
  const weight = interest.weight
  const value = interest.value

  switch (interest.interestType) {
    case 'category':
      return article.category && textContains(article.category, value) ? weight : null
    case 'technology':
    case 'project':
      return article.tags.some((tag) => textContains(tag, value)) ||
        textContains(article.title, value) ||
        textContains(article.whatHappened ?? '', value)
        ? weight
        : null
    case 'company':
      return textContains(article.title, value) ||
        textContains(article.whatHappened ?? '', value) ||
        article.tags.some((tag) => textContains(tag, value))
        ? weight
        : null
    case 'topic':
      return textContains(article.title, value) ||
        article.tags.some((tag) => textContains(tag, value))
        ? weight
        : null
    default:
      return null
  }
}

export function computeTopicMatch(
  article: ArticleContext,
  interests: UserInterest[],
  followedTopics: string[],
): number {
  const matches: number[] = []

  for (const interest of interests) {
    const score = matchInterest(article, interest)
    if (score !== null) matches.push(score)
  }

  for (const topic of followedTopics) {
    if (
      textContains(article.title, topic) ||
      article.tags.some((tag) => textContains(tag, topic))
    ) {
      matches.push(70)
    }
  }

  if (matches.length === 0) return NEUTRAL_SCORE
  return Math.min(100, Math.round(matches.reduce((sum, value) => sum + value, 0) / matches.length))
}

export function computeUserInterest(
  article: ArticleContext,
  interests: UserInterest[],
  followedTopics: string[],
): number {
  const topicMatch = computeTopicMatch(article, interests, followedTopics)
  if (topicMatch === NEUTRAL_SCORE) return NEUTRAL_SCORE

  const strongMatches = interests.filter((interest) => matchInterest(article, interest) !== null)
  const boost = Math.min(20, strongMatches.length * 5)
  return Math.min(100, topicMatch + boost)
}

export function computeFeedbackAdjustment(feedback: FeedbackSignal[]): number {
  let adjustment = 0

  for (const signal of feedback) {
    switch (signal) {
      case 'relevant':
        adjustment += 15
        break
      case 'more_like_this':
        adjustment += 20
        break
      case 'save':
        adjustment += 10
        break
      case 'not_relevant':
        adjustment -= 25
        break
      case 'less_like_this':
        adjustment -= 20
        break
      case 'dismiss':
        adjustment -= 15
        break
      case 'too_technical':
        adjustment -= 12
        break
    }
  }

  return Math.max(-40, Math.min(30, adjustment))
}
