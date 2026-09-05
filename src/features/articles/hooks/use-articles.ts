import { useCallback, useEffect, useState } from 'react'
import { fetchArticles, fetchSavedArticleIds } from '../api/articles'
import type { ArticleFilters, ArticleWithSource, PaginatedArticles } from '../types'
import { DEFAULT_PAGE_SIZE } from '../types'
import { useAuth } from '@/hooks/use-auth'

export function useArticles(filters: ArticleFilters = {}) {
  const [data, setData] = useState<PaginatedArticles>({
    articles: [],
    total: 0,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
    hasMore: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const { user } = useAuth()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchArticles(filters)
      setData(result)
      if (user) {
        const ids = await fetchSavedArticleIds(user.id)
        setSavedIds(ids)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles')
    } finally {
      setLoading(false)
    }
  }, [filters.category, filters.search, filters.minRelevance, filters.breakingOnly, filters.page, filters.pageSize, user?.id])

  useEffect(() => {
    void load()
  }, [load])

  const loadMore = useCallback(async () => {
    if (!data.hasMore || loading) return
    setLoading(true)
    try {
      const next = await fetchArticles({ ...filters, page: data.page + 1 })
      setData((current) => ({
        ...next,
        articles: [...current.articles, ...next.articles],
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more')
    } finally {
      setLoading(false)
    }
  }, [data.hasMore, data.page, filters, loading])

  return { ...data, loading, error, savedIds, setSavedIds, reload: load, loadMore }
}

export function useDashboardArticles() {
  const [mustKnow, setMustKnow] = useState<ArticleWithSource[]>([])
  const [sections, setSections] = useState<Record<string, ArticleWithSource[]>>({})
  const [learning, setLearning] = useState<ArticleWithSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { articles } = await fetchArticles({ pageSize: 40, minRelevance: 55 })
        if (cancelled) return

        const must = articles
          .filter((a) => (a.relevance_decision === 'breaking' || (a.relevance_score ?? 0) >= 75))
          .slice(0, 5)

        const byCategory: Record<string, ArticleWithSource[]> = {}
        for (const article of articles) {
          if (!article.category) continue
          const list = byCategory[article.category] ?? []
          if (list.length < 3) list.push(article)
          byCategory[article.category] = list
        }

        const learn = [...articles]
          .sort((a, b) => (b.novelty_score ?? 0) - (a.novelty_score ?? 0))
          .slice(0, 3)

        setMustKnow(must)
        setSections(byCategory)
        setLearning(learn)

        if (user) {
          const ids = await fetchSavedArticleIds(user.id)
          if (!cancelled) setSavedIds(ids)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [user?.id])

  return { mustKnow, sections, learning, loading, error, savedIds, setSavedIds }
}
