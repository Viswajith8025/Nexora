import type { ArticleContext, RelevanceInput, RelevanceResult, SourceContext } from './types.ts'
import { NEUTRAL_SCORE } from './types.ts'
import { isMajorAiModelRelease } from './noise-filter.ts'

function formatList(values: string[]): string {
  return values.map((value) => `* ${value}`).join('\n')
}

export function buildDeliveryExplanation(
  result: RelevanceResult,
  input: RelevanceInput,
): string[] {
  const bullets: string[] = []
  const { article, scores, source, user } = input

  if (user) {
    const categoryInterest = user.interests.find(
      (interest) =>
        interest.interestType === 'category' &&
        article.category &&
        interest.value.toLowerCase() === article.category.toLowerCase(),
    )
    if (categoryInterest) {
      bullets.push(`you follow ${categoryInterest.value}`)
    }

    const techMatches = user.interests.filter(
      (interest) =>
        (interest.interestType === 'technology' || interest.interestType === 'topic') &&
        (article.tags.some((tag) => tag.toLowerCase().includes(interest.value.toLowerCase())) ||
          article.title.toLowerCase().includes(interest.value.toLowerCase())),
    )
    for (const match of techMatches.slice(0, 2)) {
      bullets.push(`you track ${match.value}`)
    }

    for (const topic of user.followedTopics.slice(0, 2)) {
      if (
        article.title.toLowerCase().includes(topic.toLowerCase()) ||
        article.tags.some((tag) => tag.toLowerCase().includes(topic.toLowerCase()))
      ) {
        bullets.push(`you follow the topic "${topic}"`)
      }
    }
  }

  if (isMajorAiModelRelease(article, scores)) {
    bullets.push('this is a major model release')
  }

  if (scores.developerRelevance >= 80) {
    bullets.push(`developer relevance is ${scores.developerRelevance}`)
  }

  if (scores.importance >= 85) {
    bullets.push(`importance score is ${scores.importance}`)
  }

  if (source.trustTier === 'official_announcement' || source.trustTier === 'official_doc') {
    bullets.push('source confidence is high')
  } else if (result.components.sourceQuality >= 70) {
    bullets.push('source confidence is high')
  }

  if (result.components.userTopicMatch > NEUTRAL_SCORE) {
    bullets.push(`topic match score is ${result.components.userTopicMatch}`)
  }

  if (result.feedbackAdjustment > 0) {
    bullets.push(`your positive feedback boosted this by ${result.feedbackAdjustment}`)
  } else if (result.feedbackAdjustment < 0) {
    bullets.push(`your negative feedback reduced this by ${Math.abs(result.feedbackAdjustment)}`)
  }

  if (user && result.finalScore >= user.preferences.notificationThreshold) {
    bullets.push(`score ${result.finalScore} meets your notification threshold (${user.preferences.notificationThreshold})`)
  }

  return bullets
}

export function formatDeliveryExplanation(bullets: string[]): string {
  if (bullets.length === 0) return 'Nexora ranked this based on global relevance signals.'
  return `Because:\n${formatList(bullets)}`
}

export function articleToContext(article: {
  id: string
  title: string
  category: string | null
  tags: string[]
  verification_status: string
  what_happened?: string | null
  ai_summary?: string | null
  cluster_key?: string | null
}): ArticleContext {
  return {
    id: article.id,
    title: article.title,
    category: article.category,
    tags: article.tags ?? [],
    verificationStatus: article.verification_status,
    whatHappened: article.what_happened,
    aiSummary: article.ai_summary,
    clusterKey: article.cluster_key,
  }
}

export function sourceToContext(source: { name: string; type?: string; trust_tier?: string }): SourceContext {
  return {
    name: source.name,
    type: source.type ?? 'rss',
    trustTier: (source.trust_tier as SourceContext['trustTier']) ?? 'unknown',
  }
}
