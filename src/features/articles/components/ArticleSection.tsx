import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ArticleCardMini } from './ArticleCard'
import type { ArticleWithSource } from '../types'

export function ArticleSection({
  emoji,
  title,
  href,
  articles,
  className,
}: {
  emoji: string
  title: string
  href?: string
  articles: ArticleWithSource[]
  className?: string
}) {
  if (articles.length === 0) return null

  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-foreground">
          <span className="mr-2">{emoji}</span>
          {title}
        </h2>
        {href ? (
          <Link to={href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCardMini key={article.id} article={article} />
        ))}
      </div>
    </section>
  )
}

export function DashboardHero({ children }: { children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      {children}
    </div>
  )
}
