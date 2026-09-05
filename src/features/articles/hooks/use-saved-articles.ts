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
    if (!user) {
      setArticles([])
      setLoading(false)
      return
    }
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
    void load()
  }, [load])

  return { articles, savedIds, loading, error, reload: load, setSavedIds }
}

export function useSaveArticle() {
  const { user } = useAuth()

  const toggleSave = useCallback(
    async (articleId: string, isSaved: boolean, setSavedIds: (ids: Set<string>) => void, currentIds: Set<string>) => {
      if (!user) return
      await toggleSaveArticle(user.id, articleId, isSaved)
      const next = new Set(currentIds)
      if (isSaved) next.delete(articleId)
      else next.add(articleId)
      setSavedIds(next)
    },
    [user?.id],
  )

  return { toggleSave, user }
}

export async function refreshSavedIds(userId: string): Promise<Set<string>> {
  return fetchSavedArticleIds(userId)
}
