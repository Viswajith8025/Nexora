import { useCallback, useEffect, useState } from 'react'
import { fetchSavedArticles, fetchSavedArticleIds, toggleSaveArticle } from '../api/articles'
import type { ArticleWithSource } from '../types'
import { useAuth } from '@/hooks/use-auth'

export function useSavedArticles() {
  const [articles, setArticles] = useState<ArticleWithSource[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchSavedArticles(user.id)
      setArticles(result)
      setSavedIds(new Set(result.map((article) => article.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved articles')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) return

    let cancelled = false
    void (async () => {
      try {
        const result = await fetchSavedArticles(user.id)
        if (cancelled) return
        setArticles(result)
        setSavedIds(new Set(result.map((article) => article.id)))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load saved articles')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [user?.id])

  return {
    articles: user ? articles : [],
    savedIds,
    loading: Boolean(user) && loading,
    error,
    reload: load,
    setSavedIds,
  }
}

export function useSaveArticle() {
  const { user } = useAuth()

  const toggleSave = useCallback(
    async (
      articleId: string,
      isSaved: boolean,
      setSavedIds: (ids: Set<string>) => void,
      currentIds: Set<string>,
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!user) return { ok: false, error: 'Sign in to save articles' }
      try {
        await toggleSaveArticle(user.id, articleId, isSaved)
        const next = new Set(currentIds)
        if (isSaved) next.delete(articleId)
        else next.add(articleId)
        setSavedIds(next)
        return { ok: true }
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Failed to update saved articles',
        }
      }
    },
    [user?.id],
  )

  return { toggleSave, user }
}

export async function refreshSavedIds(userId: string): Promise<Set<string>> {
  return fetchSavedArticleIds(userId)
}
