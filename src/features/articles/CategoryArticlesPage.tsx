import { Link } from 'react-router-dom'
import type { ContentCategory } from '@/types/database'
import { ROUTES } from '@/config/constants'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from './components/PageHeader'
import { ArticleList } from './components/ArticleList'
import { useArticles } from './hooks/use-articles'
import { useSaveArticle } from './hooks/use-saved-articles'

export function CategoryArticlesPage({
  title,
  description,
  category,
}: {
  title: string
  description: string
  category?: ContentCategory
}) {
  const { articles, loading, error, savedIds, setSavedIds, loadMore, hasMore } = useArticles({
    category,
    minRelevance: 45,
  })
  const { toggleSave } = useSaveArticle()

  return (
    <PageContainer wide>
      <PageHeader title={title} description={description}>
        <Link to={ROUTES.news} className="text-sm font-medium text-primary hover:underline">
          All news
        </Link>
      </PageHeader>

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
        emptyDescription={`No ${title.toLowerCase()} intelligence published yet.`}
      />
    </PageContainer>
  )
}
