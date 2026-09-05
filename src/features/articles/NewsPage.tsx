import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from './components/PageHeader'
import { ArticleList } from './components/ArticleList'
import { useArticles } from './hooks/use-articles'
import { useSaveArticle } from './hooks/use-saved-articles'

export function NewsPage() {
  const { articles, loading, error, savedIds, setSavedIds, loadMore, hasMore } = useArticles({
    minRelevance: 40,
  })
  const { toggleSave } = useSaveArticle()

  return (
    <PageContainer wide>
      <PageHeader
        title="News"
        description="Verified technology developments ranked by relevance — not a generic news aggregator."
      />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      <ArticleList
        articles={articles}
        loading={loading}
        savedIds={savedIds}
        onSave={(articleId, isSaved) => {
          void toggleSave(articleId, isSaved, setSavedIds, savedIds)
        }}
        onLoadMore={() => { void loadMore() }}
        hasMore={hasMore}
      />
    </PageContainer>
  )
}
