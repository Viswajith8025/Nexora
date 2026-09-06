import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from './components/PageHeader'
import { RelevanceArticleList } from './components/RelevanceArticleList'
import { ErrorState } from '@/components/states/ErrorState'
import { useSaveArticle } from './hooks/use-saved-articles'
import { searchSavedArticles } from '@/features/search/api/search'
import { useAuth } from '@/hooks/use-auth'
import type { ArticleWithSource } from './types'

export function SavedPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [articles, setArticles] = useState<ArticleWithSource[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const { toggleSave } = useSaveArticle()

  useEffect(() => {
    if (!user) {
      setArticles([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void searchSavedArticles(user.id, '', page)
      .then((result) => {
        if (cancelled) return
        setArticles((current) => {
          const next = page === 1 ? result.articles : [...current, ...result.articles]
          setSavedIds(new Set(next.map((article) => article.id)))
          return next
        })
        setHasMore(result.hasMore)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load saved articles')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [user?.id, page])

  return (
    <PageContainer wide>
      <PageHeader title="Saved" />

      {error ? (
        <ErrorState type="generic" description={error} onRetry={() => setPage(1)} />
      ) : (
        <RelevanceArticleList
          articles={articles}
          loading={loading && page === 1}
          savedIds={savedIds}
          onSave={(articleId, isSaved) => {
            void toggleSave(articleId, isSaved, setSavedIds, savedIds).then(() => {
              setArticles((current) => current.filter((article) => article.id !== articleId))
            })
          }}
          hasMore={hasMore}
          onLoadMore={() => setPage((current) => current + 1)}
          animate={false}
        />
      )}
    </PageContainer>
  )
}
