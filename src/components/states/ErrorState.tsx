import type { LucideIcon } from 'lucide-react'
import { AlertCircle, Bot, Inbox, Newspaper, Rss, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ErrorStateType =
  | 'generic'
  | 'source_unavailable'
  | 'ai_unavailable'
  | 'telegram_failed'
  | 'no_results'
  | 'no_updates'
  | 'offline'

const ERROR_CONFIG: Record<
  ErrorStateType,
  { icon: LucideIcon; title: string; description: string }
> = {
  generic: {
    icon: AlertCircle,
    title: 'Something went wrong',
    description: 'We could not load this content. Please try again.',
  },
  source_unavailable: {
    icon: Rss,
    title: 'Source temporarily unavailable',
    description: 'One or more feeds could not be reached. Nexora will retry automatically.',
  },
  ai_unavailable: {
    icon: Bot,
    title: 'AI service unavailable',
    description: 'Intelligence analysis is temporarily offline. Articles remain available.',
  },
  telegram_failed: {
    icon: WifiOff,
    title: 'Telegram delivery failed',
    description: 'Your digest could not be delivered. Check your Telegram link in Settings.',
  },
  no_results: {
    icon: Inbox,
    title: 'No results',
    description: 'Try different keywords or adjust your filters.',
  },
  no_updates: {
    icon: Newspaper,
    title: 'No important updates',
    description: 'Nothing met your relevance threshold right now. Check back later.',
  },
  offline: {
    icon: WifiOff,
    title: 'You are offline',
    description: 'Reconnect to sync the latest intelligence.',
  },
}

export function ErrorState({
  type = 'generic',
  title,
  description,
  onRetry,
}: {
  type?: ErrorStateType
  title?: string
  description?: string
  onRetry?: () => void
}) {
  const config = ERROR_CONFIG[type]
  const Icon = config.icon

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center"
      role="alert"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="text-base font-medium">{title ?? config.title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description ?? config.description}</p>
      {onRetry ? (
        <Button className="mt-6" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
