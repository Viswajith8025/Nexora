import { Link } from 'react-router-dom'
import { Bookmark, Bot, Check, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArticleCardMini } from './ArticleCard'
import type { ArticleWithSource } from '../types'
import { categoryLabel, CATEGORY_STYLES } from '../utils/category'
import { formatPublishedDate } from '../utils/format'
import { ArticleFeedbackBar } from '@/features/personalization/components/ArticleFeedbackBar'
import { RelevanceExplanation } from '@/features/personalization/components/RelevanceExplanation'
import type { PersonalizedRelevance, FeedbackSignal } from '@/features/personalization/types'
import { cn } from '@/lib/utils'

function DetailBlock({ title, content }: { title: string; content: string | null }) {
  if (!content) return null
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold tracking-wide text-foreground">{title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{content}</p>
    </section>
  )
}

export function ArticleDetail({
  article,
  related,
  saved,
  read,
  onSave,
  onMarkRead,
  feedbackSignals = [],
  submittingFeedback = false,
  onFeedback,
  personalizedRelevance = null,
}: {
  article: ArticleWithSource
  related: ArticleWithSource[]
  saved: boolean
  read: boolean
  onSave: () => void
  onMarkRead: () => void
  feedbackSignals?: FeedbackSignal[]
  submittingFeedback?: boolean
  onFeedback?: (signal: FeedbackSignal) => void
  personalizedRelevance?: PersonalizedRelevance | null
}) {
  const technicalImpact = article.technical_impact ?? article.developer_impact

  return (
    <article className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {article.category ? (
            <Badge className={cn('border-0 font-medium', CATEGORY_STYLES[article.category])}>
              {categoryLabel(article.category)}
            </Badge>
          ) : null}
          {article.relevance_decision === 'breaking' ? (
            <Badge className="border-0 bg-destructive/10 text-destructive">Breaking</Badge>
          ) : null}
          {read ? <Badge className="border-0 bg-muted text-muted-foreground">Read</Badge> : null}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{article.title}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{article.source?.name ?? 'Unknown source'}</span>
          <span>{formatPublishedDate(article.published_at ?? article.discovered_at)}</span>
          {article.importance_score !== null ? <span>Importance {article.importance_score}</span> : null}
          {article.developer_relevance_score !== null ? (
            <span>Dev relevance {article.developer_relevance_score}</span>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onSave}>
          <Bookmark className={cn('mr-1.5 h-4 w-4', saved && 'fill-current text-primary')} />
          {saved ? 'Saved' : 'Save'}
        </Button>
        <Button variant="outline" size="sm" onClick={onMarkRead} disabled={read}>
          <Check className="mr-1.5 h-4 w-4" />
          {read ? 'Marked read' : 'Mark read'}
        </Button>
        <Button asChild size="sm">
          <a href={article.canonical_url} target="_blank" rel="noreferrer">
            Learn more <ExternalLink className="ml-1.5 h-4 w-4" />
          </a>
        </Button>
        <Button asChild variant="secondary" size="sm" id="ask">
          <Link to={`/news/${article.id}#ask`}>
            <Bot className="mr-1.5 h-4 w-4" />
            Ask AI
          </Link>
        </Button>
      </div>

      <RelevanceExplanation relevance={personalizedRelevance} />

      {onFeedback ? (
        <ArticleFeedbackBar
          activeSignals={feedbackSignals}
          submitting={submittingFeedback}
          onSubmit={onFeedback}
        />
      ) : null}

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="pb-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Intelligence brief</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <DetailBlock title="What happened" content={article.what_happened ?? article.one_sentence_takeaway} />
          <DetailBlock title="Why it matters" content={article.why_it_matters} />
          <DetailBlock title="Technical impact" content={technicalImpact} />
          <DetailBlock title="Who should care" content={article.who_should_care} />
          <DetailBlock title="Recommended action" content={article.recommended_action} />
        </CardContent>
      </Card>

      {related.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide">Related stories</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {related.map((item) => (
              <ArticleCardMini key={item.id} article={item} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-wide">Sources</h2>
        <a
          href={article.canonical_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          {article.source?.name ?? 'Original article'}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </section>

      <Card className="border-primary/20 bg-primary/5" id="ask-panel">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Ask AI about this story</p>
            <p className="text-sm text-muted-foreground">
              Get a deeper technical breakdown via Telegram or the upcoming in-app assistant.
            </p>
          </div>
          <Button asChild variant="secondary">
            <a href={article.canonical_url} target="_blank" rel="noreferrer">Read source first</a>
          </Button>
        </CardContent>
      </Card>
    </article>
  )
}
