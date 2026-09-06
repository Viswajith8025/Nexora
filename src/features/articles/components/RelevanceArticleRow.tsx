import { Link } from 'react-router-dom'
import { Bookmark, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/config/constants'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/contexts/toast-context'
import { feedbackEffectMessage } from '@/lib/feedback-messages'
import { computePersonalizedRelevance } from '@/features/personalization/api/relevance'
import { usePersonalizationContext } from '@/features/personalization/hooks/use-feedback'
import { submitArticleFeedback } from '@/features/personalization/api/feedback'
import type { ArticleWithSource } from '../types'
import { categoryLabel, CATEGORY_STYLES } from '../utils/category'
import { formatRelativeTime, getSummary } from '../utils/format'
import { isArticleRead } from '../utils/read-status'
import { RelevanceWhy } from './RelevanceWhy'
import { cn } from '@/lib/utils'
import * as React from 'react'

export type ArticleTier = 'feature' | 'standard' | 'compact'

export function articleScore(article: ArticleWithSource): number {
  return article.relevance_score ?? article.importance_score ?? 0
}

export function articleTier(article: ArticleWithSource): ArticleTier {
  const score = articleScore(article)
  if (score >= 85) return 'feature'
  if (score >= 60) return 'standard'
  return 'compact'
}

export function RelevanceArticleRow({
  article,
  tier,
  saved = false,
  selected = false,
  sourceCount = 1,
  onSave,
  onOpen,
}: {
  article: ArticleWithSource
  tier: ArticleTier
  saved?: boolean
  selected?: boolean
  sourceCount?: number
  onSave?: () => void
  onOpen?: () => void
}) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { context } = usePersonalizationContext()
  const [submitting, setSubmitting] = React.useState(false)
  const read = isArticleRead(article.id)
  const score = articleScore(article)
  const relevance = context ? computePersonalizedRelevance(article, context) : null
  const displayScore = relevance?.finalScore ?? score
  const summary = getSummary(article)

  async function sendFeedback(signal: 'more_like_this' | 'less_like_this') {
    if (!user) return
    setSubmitting(true)
    try {
      await submitArticleFeedback(user.id, article.id, signal)
      showToast(feedbackEffectMessage(signal, article))
    } finally {
      setSubmitting(false)
    }
  }

  if (tier === 'feature') {
    return (
      <article
        data-rank-item
        className={cn(
          'rounded-xl bg-ink-800 p-6 transition-colors',
          selected && 'ring-2 ring-signal/60',
          read && 'opacity-75',
        )}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {article.category ? (
            <span className={cn('rounded-md px-2 py-0.5', CATEGORY_STYLES[article.category])}>
              {categoryLabel(article.category)}
            </span>
          ) : null}
          {article.relevance_decision === 'breaking' ? (
            <span className="rounded-md bg-breaking/15 px-2 py-0.5 text-breaking">Breaking</span>
          ) : null}
          <span>{article.source?.name ?? 'Unknown'} · {formatRelativeTime(article.published_at ?? article.discovered_at)}</span>
          {sourceCount > 1 ? (
            <span className="text-signal">Covered by {sourceCount} sources</span>
          ) : null}
        </div>
        <Link
          to={ROUTES.newsDetail(article.id)}
          onClick={onOpen}
          className="font-article block text-2xl font-medium leading-tight text-foreground hover:text-signal"
        >
          {article.title}
        </Link>
        <p className="font-article mt-4 max-w-[68ch] text-[17px] leading-[1.6] text-muted-foreground">
          {summary}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <RelevanceWhy score={displayScore} relevance={relevance} />
          {user ? (
            <>
              <Button size="sm" variant="ghost" disabled={submitting} onClick={() => { void sendFeedback('more_like_this') }}>
                <ThumbsUp className="h-4 w-4" /> More
              </Button>
              <Button size="sm" variant="ghost" disabled={submitting} onClick={() => { void sendFeedback('less_like_this') }}>
                <ThumbsDown className="h-4 w-4" /> Less
              </Button>
            </>
          ) : null}
          {onSave ? (
            <Button size="sm" variant="ghost" onClick={onSave} aria-label={saved ? 'Unsave' : 'Save'}>
              <Bookmark className={cn('h-4 w-4', saved && 'fill-current text-signal')} />
            </Button>
          ) : null}
        </div>
      </article>
    )
  }

  if (tier === 'standard') {
    return (
      <article
        data-rank-item
        className={cn(
          'flex flex-col gap-2 rounded-lg bg-ink-800/80 px-4 py-3 transition-colors hover:bg-ink-700/80',
          selected && 'ring-2 ring-signal/60',
          read && 'opacity-70',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <Link
            to={ROUTES.newsDetail(article.id)}
            onClick={onOpen}
            className="font-article text-base font-medium leading-snug hover:text-signal"
          >
            {article.title}
          </Link>
          <span className="shrink-0 text-sm font-medium text-signal">{displayScore}</span>
        </div>
        <p className="line-clamp-2 font-article text-sm leading-relaxed text-muted-foreground">{summary}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {article.category ? <span>{categoryLabel(article.category)}</span> : null}
          <span>·</span>
          <span>{article.source?.name}</span>
          {sourceCount > 1 ? <span className="text-signal">· {sourceCount} sources</span> : null}
          <RelevanceWhy score={displayScore} relevance={relevance} />
        </div>
      </article>
    )
  }

  return (
    <article
      data-rank-item
      className={cn(
        'flex items-center justify-between gap-3 px-2 py-1.5 text-sm text-muted-foreground',
        selected && 'rounded-md bg-ink-700/50 ring-2 ring-signal/40',
        read && 'opacity-50',
      )}
    >
      <Link to={ROUTES.newsDetail(article.id)} onClick={onOpen} className="truncate hover:text-foreground">
        {article.title}
      </Link>
      <span className="shrink-0 text-xs text-muted-foreground">{displayScore}</span>
    </article>
  )
}
