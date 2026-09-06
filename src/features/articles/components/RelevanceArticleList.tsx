import * as React from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from './EmptyState'
import { ArticleListSkeleton } from './ArticleList'
import type { ArticleWithSource } from '../types'
import { Newspaper } from 'lucide-react'
import {
  RelevanceArticleRow,
  articleScore,
  articleTier,
} from './RelevanceArticleRow'
import { getDismissedArticleIds } from '../utils/dismissed'
import { markAllArticlesRead, getReadArticleIds } from '../utils/read-status'
import { cn } from '@/lib/utils'

function clusterCounts(articles: ArticleWithSource[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const article of articles) {
    if (!article.cluster_key) continue
    counts.set(article.cluster_key, (counts.get(article.cluster_key) ?? 0) + 1)
  }
  return counts
}

export function RelevanceArticleList({
  articles,
  loading,
  savedIds,
  onSave,
  onLoadMore,
  hasMore,
  selectedIndex = -1,
  onSelectIndex,
  animate = true,
}: {
  articles: ArticleWithSource[]
  loading?: boolean
  savedIds?: Set<string>
  onSave?: (articleId: string, isSaved: boolean) => void
  onLoadMore?: () => void
  hasMore?: boolean
  selectedIndex?: number
  onSelectIndex?: (index: number) => void
  animate?: boolean
}) {
  const [lowOpen, setLowOpen] = React.useState(false)
  const [readIds, setReadIds] = React.useState(() => getReadArticleIds())
  const dismissed = getDismissedArticleIds()

  const visible = articles.filter((article) => !dismissed.has(article.id))
  const clusters = clusterCounts(visible)

  const feature = visible.filter((a) => articleTier(a) === 'feature')
  const standard = visible.filter((a) => articleTier(a) === 'standard')
  const compact = visible.filter((a) => articleTier(a) === 'compact')

  const ordered = [...feature, ...standard, ...compact]

  if (loading && articles.length === 0) {
    return <ArticleListSkeleton />
  }

  if (!loading && visible.length === 0) {
    return (
      <EmptyState
        icon={Newspaper}
        title="No articles yet"
        description="Ingestion runs on a schedule. Articles appear after sources are fetched and analyzed — usually within 30 minutes."
        actionLabel="Check latest"
        onAction={() => { window.location.href = '/news' }}
      />
    )
  }

  let runningIndex = 0

  function renderRow(article: ArticleWithSource, tier: 'feature' | 'standard' | 'compact') {
    const index = runningIndex++
    const sourceCount = article.cluster_key ? clusters.get(article.cluster_key) ?? 1 : 1
    return (
      <RelevanceArticleRow
        key={article.id}
        article={article}
        tier={tier}
        sourceCount={sourceCount}
        saved={savedIds?.has(article.id)}
        selected={selectedIndex === index}
        onSave={onSave ? () => onSave(article.id, savedIds?.has(article.id) ?? false) : undefined}
        onOpen={() => onSelectIndex?.(index)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            markAllArticlesRead(ordered.map((a) => a.id))
            setReadIds(getReadArticleIds())
          }}
        >
          Mark all read
        </Button>
        {readIds.size > 0 ? (
          <span className="text-xs text-muted-foreground">{readIds.size} read</span>
        ) : null}
      </div>

      <div className={cn('space-y-6', animate && 'article-rank-settle')}>
        {feature.length > 0 ? (
          <section className="space-y-4">{feature.map((a) => renderRow(a, 'feature'))}</section>
        ) : null}

        {standard.length > 0 ? (
          <section className="space-y-2">{standard.map((a) => renderRow(a, 'standard'))}</section>
        ) : null}

        {compact.length > 0 ? (
          <section className="space-y-2">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => { setLowOpen((v) => !v) }}
            >
              {lowOpen ? 'Hide' : 'Show'} {compact.length} more, lower signal
            </button>
            {lowOpen ? (
              <div className="space-y-1 border-t border-ink-600/30 pt-2">
                {compact.map((a) => renderRow(a, 'compact'))}
              </div>
            ) : null}
          </section>
        ) : null}
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

export { articleScore, articleTier }
