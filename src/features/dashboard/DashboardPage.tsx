import { Link } from 'react-router-dom'
import { APP_NAME, ROUTES } from '@/config/constants'
import { DASHBOARD_CATEGORIES } from '@/features/articles/api/articles'
import { PageContainer } from '@/components/layout/PageContainer'
import { ArticleCard } from '@/features/articles/components/ArticleCard'
import { ArticleSection, DashboardHero } from '@/features/articles/components/ArticleSection'
import { ArticleListSkeleton } from '@/features/articles/components/ArticleList'
import { LearningCard } from '@/features/articles/components/ArticleCard'
import { useDashboardArticles } from '@/features/articles/hooks/use-articles'
import { useSaveArticle } from '@/features/articles/hooks/use-saved-articles'
import { getGreeting } from '@/features/articles/utils/format'
import { useAuth } from '@/hooks/use-auth'

export function DashboardPage() {
  const { profile } = useAuth()
  const { mustKnow, sections, learning, loading, error, savedIds, setSavedIds } = useDashboardArticles()
  const { toggleSave } = useSaveArticle()
  const name = profile?.display_name?.split(' ')[0]

  return (
    <PageContainer wide className="space-y-8">
      <DashboardHero>
        <div className="relative space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{APP_NAME}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {getGreeting()}{name ? `, ${name}` : ''} 👋
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Your personal intelligence command center — ranked developments, not noise.
          </p>
        </div>
      </DashboardHero>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <ArticleListSkeleton count={4} />
      ) : (
        <>
          {mustKnow.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-wide">
                  <span className="mr-2">🔥</span>
                  MUST KNOW
                </h2>
                <Link to={ROUTES.news} className="text-xs font-medium text-primary hover:underline">
                  View all news
                </Link>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {mustKnow.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    compact
                    saved={savedIds.has(article.id)}
                    onSave={() => {
                      void toggleSave(article.id, savedIds.has(article.id), setSavedIds, savedIds)
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {DASHBOARD_CATEGORIES.map(({ category, emoji, label }) => {
            const routeMap: Record<string, string> = {
              AI: ROUTES.ai,
              Development: ROUTES.development,
              Cloud: ROUTES.news,
              Security: ROUTES.security,
              'Developer Tools': ROUTES.tools,
            }
            return (
              <ArticleSection
                key={category}
                emoji={emoji}
                title={label}
                href={routeMap[category]}
                articles={sections[category] ?? []}
              />
            )
          })}

          {learning.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-wide">
                  <span className="mr-2">🧠</span>
                  LEARNING
                </h2>
                <Link to={ROUTES.learning} className="text-xs font-medium text-primary hover:underline">
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
        </>
      )}
    </PageContainer>
  )
}
