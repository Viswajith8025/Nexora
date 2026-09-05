import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { fetchUserInterests, fetchFollowedTopics, saveInterestWeights } from '../api/interests'
import { fetchArticleFeedback, removeConflictingFeedback, submitArticleFeedback } from '../api/feedback'
import { applyFeedbackAndRescore, computePersonalizedRelevance, profileToPreferences } from '../api/relevance'
import type { ArticleWithSource } from '@/features/articles/types'
import type { FeedbackSignal, PersonalizationContext, PersonalizedRelevance } from '../types'

export function usePersonalizationContext() {
  const { user, profile } = useAuth()
  const [interests, setInterests] = useState<PersonalizationContext['interests']>([])
  const [followedTopics, setFollowedTopics] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) {
      setInterests([])
      setFollowedTopics([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [nextInterests, topics] = await Promise.all([
        fetchUserInterests(user.id),
        fetchFollowedTopics(user.id),
      ])
      setInterests(
        nextInterests.map((interest) => ({
          interestType: interest.interest_type,
          value: interest.value,
          weight: interest.weight,
        })),
      )
      setFollowedTopics(topics)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  const context: PersonalizationContext | null =
    user && profile
      ? {
          interests,
          followedTopics,
          feedback: [],
          preferences: profileToPreferences(profile),
        }
      : null

  return { context, interests, followedTopics, loading, reload: load, setInterests }
}

export function useArticleFeedback(article: ArticleWithSource | null) {
  const { user, profile } = useAuth()
  const { context, reload: reloadInterests, setInterests } = usePersonalizationContext()
  const [signals, setSignals] = useState<FeedbackSignal[]>([])
  const [relevance, setRelevance] = useState<PersonalizedRelevance | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user || !article) {
      setSignals([])
      setRelevance(null)
      return
    }

    let cancelled = false
    void fetchArticleFeedback(user.id, article.id).then((result) => {
      if (!cancelled) setSignals(result)
    })

    return () => { cancelled = true }
  }, [user?.id, article?.id])

  useEffect(() => {
    if (!article || !context || !profile) {
      setRelevance(null)
      return
    }

    const fullContext: PersonalizationContext = {
      ...context,
      feedback: signals,
    }
    setRelevance(computePersonalizedRelevance(article, fullContext))
  }, [article, context, profile, signals])

  const submitFeedback = useCallback(
    async (signal: FeedbackSignal) => {
      if (!user || !article || !context) return

      setSubmitting(true)
      try {
        await removeConflictingFeedback(user.id, article.id, signal)
        await submitArticleFeedback(user.id, article.id, signal)

        const fullContext: PersonalizationContext = {
          ...context,
          feedback: [...signals.filter((item) => item !== signal), signal],
        }

        const { relevance: nextRelevance, adjustedInterests } = await applyFeedbackAndRescore(
          user.id,
          article,
          signal,
          fullContext,
        )

        setSignals((current) => [...current.filter((item) => item !== signal), signal])
        setRelevance(nextRelevance)

        if (adjustedInterests.adjustments.length > 0) {
          const engineInterests = adjustedInterests.interests.map((interest) => ({
            interestType: interest.interestType,
            value: interest.value,
            weight: interest.weight,
          }))
          setInterests(engineInterests)

          const existing = await fetchUserInterests(user.id)
          const toSave = engineInterests
            .map((interest) => {
              const row = existing.find(
                (item) =>
                  item.interest_type === interest.interestType &&
                  item.value.toLowerCase() === interest.value.toLowerCase(),
              )
              return row ? { id: row.id, weight: interest.weight } : null
            })
            .filter((item): item is { id: string; weight: number } => Boolean(item))

          if (toSave.length > 0) {
            await saveInterestWeights(user.id, toSave)
          }
          await reloadInterests()
        }
      } finally {
        setSubmitting(false)
      }
    },
    [user, article, context, signals, reloadInterests, setInterests],
  )

  return { signals, relevance, submitting, submitFeedback }
}
