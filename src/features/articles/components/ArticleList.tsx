import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArticleCard } from './ArticleCard'
import { EmptyState } from './EmptyState'
import type { ArticleWithSource } from '../types'
import { Newspaper } from 'lucide-react'

export function ArticleListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border p-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  )
}

export function ArticleList({
  articles,
  loading,
  savedIds,
  onSave,
  emptyTitle = 'No articles yet',
  emptyDescription = 'Published intelligence will appear here after ingestion and analysis.',
  onLoadMore,
  hasMore,
}: {
  articles: ArticleWithSource[]
  loading?: boolean
  savedIds?: Set<string>
  onSave?: (articleId: string, isSaved: boolean) => void
  emptyTitle?: string
  emptyDescription?: string
  onLoadMore?: () => void
  hasMore?: boolean
}) {
  if (loading && articles.length === 0) {
    return <ArticleListSkeleton />
  }

  if (!loading && articles.length === 0) {
    return <EmptyState icon={Newspaper} title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            saved={savedIds?.has(article.id)}
            onSave={onSave ? () => onSave(article.id, savedIds?.has(article.id) ?? false) : undefined}
          />
        ))}
      </div>
      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={onLoadMore} disabled={loading}>
            {loading ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
