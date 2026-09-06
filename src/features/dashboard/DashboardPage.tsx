import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { PageContainer } from '@/components/layout/PageContainer'
import { RelevanceArticleList } from '@/features/articles/components/RelevanceArticleList'
import { ArticleListSkeleton } from '@/features/articles/components/ArticleList'
import { LearningCard } from '@/features/articles/components/ArticleCard'
import { useDashboardArticles } from '@/features/articles/hooks/use-articles'
import { useSaveArticle } from '@/features/articles/hooks/use-saved-articles'

export function DashboardPage() {
  const { mustKnow, sections, learning, loading, error, savedIds, setSavedIds } = useDashboardArticles()
  const { toggleSave } = useSaveArticle()

  const categoryArticles = Object.entries(sections).flatMap(([, items]) => items)

  return (
    <PageContainer wide className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <Link to={ROUTES.news} className="text-sm text-signal hover:underline">
          All news
        </Link>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <ArticleListSkeleton count={4} />
      ) : (
        <>
          {mustKnow.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">Must know</h2>
              <RelevanceArticleList
                articles={mustKnow}
                savedIds={savedIds}
                onSave={(articleId, isSaved) => {
                  void toggleSave(articleId, isSaved, setSavedIds, savedIds)
                }}
                animate={false}
              />
            </section>
          ) : null}

          {categoryArticles.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">By category</h2>
              <RelevanceArticleList
                articles={categoryArticles}
                savedIds={savedIds}
                onSave={(articleId, isSaved) => {
                  void toggleSave(articleId, isSaved, setSavedIds, savedIds)
                }}
                animate={false}
              />
            </section>
          ) : null}

          {learning.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">Worth learning</h2>
                <Link to={ROUTES.learning} className="text-xs text-signal hover:underline">
                  View learning
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {learning.map((article) => (
                  <LearningCard
                    key={article.id}
                    title={article.title}
                    description={article.one_sentence_takeaway ?? article.ai_summary}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {mustKnow.length === 0 && categoryArticles.length === 0 ? (
            <RelevanceArticleList articles={[]} loading={false} />
          ) : null}
        </>
      )}
    </PageContainer>
  )
}
