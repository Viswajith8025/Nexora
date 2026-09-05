import { getSupabaseClientOrNull } from '@/lib/supabase/client'
import {
  applyFeedbackToInterests,
  buildDeliveryExplanation,
  evaluateArticleRelevance,
  toDbDecision,
} from '@/lib/relevance'
import type { ArticleWithSource } from '@/features/articles/types'
import type { FeedbackSignal, PersonalizationContext, PersonalizedRelevance } from '../types'
import type { Profile } from '@/types/database'

function toEngineUser(context: PersonalizationContext) {
  return {
    interests: context.interests.map((interest) => ({
      interestType: interest.interestType as 'category' | 'technology' | 'company' | 'project' | 'topic',
      value: interest.value,
      weight: interest.weight,
    })),
    followedTopics: context.followedTopics,
    feedback: context.feedback,
    preferences: context.preferences,
  }
}

export function computePersonalizedRelevance(
  article: ArticleWithSource,
  context: PersonalizationContext,
): PersonalizedRelevance {
  const result = evaluateArticleRelevance({
    article: {
      id: article.id,
      title: article.title,
      category: article.category,
      tags: article.tags ?? [],
      verificationStatus: article.verification_status,
      whatHappened: article.what_happened,
      aiSummary: article.ai_summary,
      clusterKey: article.cluster_key,
    },
    scores: {
      importance: article.importance_score ?? 50,
      developerRelevance: article.developer_relevance_score ?? 50,
      urgency: 50,
      novelty: article.novelty_score ?? 50,
      confidence: 70,
    },
    source: {
      name: article.source?.name ?? 'Unknown',
      type: 'rss',
      trustTier: 'unknown',
    },
    user: toEngineUser(context),
  })

  const deliveryExplanation = buildDeliveryExplanation(result, {
    article: {
      id: article.id,
      title: article.title,
      category: article.category,
      tags: article.tags ?? [],
      verificationStatus: article.verification_status,
      whatHappened: article.what_happened,
      aiSummary: article.ai_summary,
    },
    scores: {
      importance: article.importance_score ?? 50,
      developerRelevance: article.developer_relevance_score ?? 50,
      urgency: 50,
      novelty: article.novelty_score ?? 50,
      confidence: 70,
    },
    source: {
      name: article.source?.name ?? 'Unknown',
      type: 'rss',
      trustTier: 'unknown',
    },
    user: toEngineUser(context),
  })

  return {
    finalScore: result.finalScore,
    decision: result.decision,
    explanations: result.explanations,
    deliveryExplanation,
    feedbackAdjustment: result.feedbackAdjustment,
  }
}

export function profileToPreferences(profile: Profile) {
  return {
    breakingAlertsEnabled: profile.breaking_alerts_enabled,
    morningDigestEnabled: profile.morning_digest_enabled,
    eveningDigestEnabled: profile.evening_digest_enabled,
    weeklyDigestEnabled: profile.weekly_digest_enabled,
    notificationThreshold: profile.notification_threshold ?? 55,
  }
}

export async function persistPersonalizedRelevance(
  userId: string,
  articleId: string,
  relevance: PersonalizedRelevance,
): Promise<void> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) return

  const { error } = await supabase.from('article_user_relevance').upsert({
    user_id: userId,
    article_id: articleId,
    final_score: relevance.finalScore,
    relevance_decision: toDbDecision(relevance.decision),
    factors: { feedbackAdjustment: relevance.feedbackAdjustment },
    explanations: relevance.deliveryExplanation,
  })

  if (error) throw new Error(error.message)
}

export async function applyFeedbackAndRescore(
  userId: string,
  article: ArticleWithSource,
  signal: FeedbackSignal,
  context: PersonalizationContext,
): Promise<{ relevance: PersonalizedRelevance; adjustedInterests: ReturnType<typeof applyFeedbackToInterests> }> {
  const adjustedInterests = applyFeedbackToInterests(
    {
      id: article.id,
      title: article.title,
      category: article.category,
      tags: article.tags ?? [],
      verificationStatus: article.verification_status,
      whatHappened: article.what_happened,
      aiSummary: article.ai_summary,
    },
    signal,
    context.interests.map((interest) => ({
      interestType: interest.interestType as 'category' | 'technology' | 'company' | 'project' | 'topic',
      value: interest.value,
      weight: interest.weight,
    })),
  )

  const nextContext: PersonalizationContext = {
    ...context,
    interests: adjustedInterests.interests.map((interest) => ({
      interestType: interest.interestType,
      value: interest.value,
      weight: interest.weight,
    })),
    feedback: [...context.feedback.filter((item) => item !== signal), signal],
  }

  const relevance = computePersonalizedRelevance(article, nextContext)
  await persistPersonalizedRelevance(userId, article.id, relevance)

  return { relevance, adjustedInterests }
}
