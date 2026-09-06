import type { PersonalizedRelevance } from '@/features/personalization/types'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import * as React from 'react'

export function RelevanceWhy({
  score,
  relevance,
  className,
}: {
  score: number
  relevance: PersonalizedRelevance | null
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const reasons = relevance?.deliveryExplanation ?? []

  return (
    <div className={cn('text-sm', className)}>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-ink-700 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => { setOpen((value) => !value) }}
        aria-expanded={open}
      >
        <span className="font-medium text-signal">{score}</span>
        <span>· why</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <ul className="mt-2 space-y-1 rounded-lg bg-ink-700/60 p-3 text-xs text-muted-foreground">
          {reasons.length > 0 ? (
            reasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="text-signal">·</span>
                <span>{reason}</span>
              </li>
            ))
          ) : (
            <li>Ranked by source quality, recency, and developer relevance.</li>
          )}
        </ul>
      ) : null}
    </div>
  )
}
