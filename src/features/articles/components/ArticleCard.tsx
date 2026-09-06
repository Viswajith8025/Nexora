import { Link } from 'react-router-dom'
import { Bookmark, Bot, ExternalLink, GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { ROUTES } from '@/config/constants'
import type { ArticleWithSource } from '../types'
import { categoryLabel, CATEGORY_STYLES } from '../utils/category'
import { formatRelativeTime, getSummary } from '../utils/format'
import { cn } from '@/lib/utils'

function ScorePill({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {label} {value}
    </span>
  )
}

export function ArticleCard({
  article,
  saved = false,
  onSave,
  compact = false,
}: {
  article: ArticleWithSource
  saved?: boolean
  onSave?: () => void
  compact?: boolean
}) {
  const summary = getSummary(article)
  const category = article.category

  return (
    <Card className="group overflow-hidden border-0 bg-ink-800 transition-colors hover:bg-ink-700">
      <CardHeader className={cn('space-y-3', compact ? 'p-4 pb-2' : 'p-5 pb-3')}>
        <div className="flex flex-wrap items-center gap-2">
          {category ? (
            <Badge className={cn('border-0 font-medium', CATEGORY_STYLES[category])}>
              {categoryLabel(category)}
            </Badge>
          ) : null}
          {article.relevance_decision === 'breaking' ? (
            <Badge className="border-0 bg-destructive/10 font-medium text-destructive">Breaking</Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {article.source?.name ?? 'Unknown source'} · {formatRelativeTime(article.published_at ?? article.discovered_at)}
          </span>
        </div>
        <Link to={ROUTES.newsDetail(article.id)} className="block">
          <h3 className={cn('font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary', compact ? 'text-base' : 'text-lg')}>
            {article.title}
          </h3>
        </Link>
      </CardHeader>
      <CardContent className={cn('space-y-3', compact ? 'px-4 pb-3' : 'px-5 pb-4')}>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{summary}</p>
        <div className="flex flex-wrap gap-2">
          <ScorePill label="Importance" value={article.importance_score} />
          <ScorePill label="Dev" value={article.developer_relevance_score} />
        </div>
      </CardContent>
      <CardFooter className={cn('flex flex-wrap gap-2 bg-ink-700/40', compact ? 'p-3' : 'p-4')}>
        <Button asChild size="sm" variant="default">
          <Link to={ROUTES.newsDetail(article.id)}>Learn More</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={article.canonical_url} target="_blank" rel="noreferrer">
            Read <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </a>
        </Button>
        {onSave ? (
          <Button size="sm" variant="ghost" onClick={onSave} aria-label={saved ? 'Unsave article' : 'Save article'}>
            <Bookmark className={cn('h-4 w-4', saved && 'fill-current text-primary')} />
            Save
          </Button>
        ) : null}
        <Button asChild size="sm" variant="ghost">
          <Link to={`${ROUTES.newsDetail(article.id)}#ask`}>
            <Bot className="mr-1 h-4 w-4" />
            Ask AI
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export function ArticleCardMini({ article }: { article: ArticleWithSource }) {
  return (
    <Link
      to={ROUTES.newsDetail(article.id)}
      className="block rounded-lg bg-ink-800 p-3 transition-colors hover:bg-ink-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{article.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{getSummary(article)}</p>
        </div>
        {article.relevance_score ? (
          <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            {article.relevance_score}
          </span>
        ) : null}
      </div>
    </Link>
  )
}

export function LearningCard({ title, description }: { title: string; description?: string | null }) {
  return (
    <div className="rounded-lg bg-ink-800 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <GraduationCap className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium">{title}</p>
          {description ? <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p> : null}
        </div>
      </div>
    </div>
  )
}
