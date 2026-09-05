import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ROUTES } from '@/config/constants'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArticleDetail } from './components/ArticleDetail'
import { useArticle } from './hooks/use-article'
import { useSaveArticle } from './hooks/use-saved-articles'
import { useArticleFeedback } from '@/features/personalization/hooks/use-feedback'
import { isArticleRead, markArticleRead } from './utils/read-status'

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { article, related, loading, error, savedIds, setSavedIds, isSaved } = useArticle(id)
  const { toggleSave } = useSaveArticle()
  const [read, setRead] = useState(() => (id ? isArticleRead(id) : false))
  const { signals, relevance, submitting, submitFeedback } = useArticleFeedback(article)

  return (
    <PageContainer>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to={ROUTES.news}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to news
        </Link>
      </Button>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && !article ? (
        <p className="text-sm text-muted-foreground">Article not found or not yet published.</p>
      ) : null}

      {article ? (
        <ArticleDetail
          article={article}
          related={related}
          saved={isSaved}
          read={read}
          onSave={() => {
            void toggleSave(article.id, isSaved, setSavedIds, savedIds)
          }}
          onMarkRead={() => {
            markArticleRead(article.id)
            setRead(true)
          }}
          feedbackSignals={signals}
          submittingFeedback={submitting}
          onFeedback={(signal) => { void submitFeedback(signal) }}
          personalizedRelevance={relevance}
        />
      ) : null}
    </PageContainer>
  )
}
