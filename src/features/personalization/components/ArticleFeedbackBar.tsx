import { Button } from '@/components/ui/button'
import { FEEDBACK_OPTIONS } from '../types'
import type { FeedbackSignal } from '../types'
import { cn } from '@/lib/utils'

export function ArticleFeedbackBar({
  activeSignals,
  submitting,
  onSubmit,
}: {
  activeSignals: FeedbackSignal[]
  submitting?: boolean
  onSubmit: (signal: FeedbackSignal) => void
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide">Your feedback</h2>
      <p className="text-xs text-muted-foreground">
        Transparent scoring — your feedback adjusts category, technology, and topic relevance.
      </p>
      <div className="flex flex-wrap gap-2">
        {FEEDBACK_OPTIONS.map((option) => {
          const active = activeSignals.includes(option.signal)
          return (
            <Button
              key={option.signal}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              disabled={submitting}
              className={cn('gap-1.5', active && 'ring-2 ring-primary/30')}
              onClick={() => { onSubmit(option.signal) }}
            >
              <span aria-hidden>{option.emoji}</span>
              {option.label}
            </Button>
          )
        })}
      </div>
    </section>
  )
}
