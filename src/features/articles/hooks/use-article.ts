import { useEffect, useState } from 'react'
import { fetchArticleById, fetchRelatedArticles, fetchSavedArticleIds } from '../api/articles'
import type { ArticleWithSource } from '../types'
import { useAuth } from '@/hooks/use-auth'

export function useArticle(id: string | undefined) {
  const [article, setArticle] = useState<ArticleWithSource | null>(null)
  const [related, setRelated] = useState<ArticleWithSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const { user } = useAuth()

  useEffect(() => {
    if (!id) return
    const articleId = id
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchArticleById(articleId)
        if (cancelled) return
        setArticle(result)
        if (result) {
          const relatedArticles = await fetchRelatedArticles(result)
          if (!cancelled) setRelated(relatedArticles)
        }
        if (user) {
          const ids = await fetchSavedArticleIds(user.id)
          if (!cancelled) setSavedIds(ids)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load article')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [id, user])

  return { article, related, loading, error, savedIds, setSavedIds, isSaved: article ? savedIds.has(article.id) : false }
}
