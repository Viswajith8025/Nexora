import { Link } from 'react-router-dom'
import { APP_NAME, APP_TAGLINE, ROUTES } from '@/config/constants'
import { NexoraMark } from '@/components/brand/NexoraMark'
import { cn } from '@/lib/utils'

function getInitials(displayName?: string | null, email?: string | null): string {
  const source = displayName?.trim() || email?.split('@')[0] || '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

function BrandMark({ className }: { className?: string }) {
  const size = className?.includes('h-8') ? 32 : 36
  return <NexoraMark className={className} size={size} />
}

type SidebarHeaderProps = {
  displayName?: string | null
  email?: string | null
  compact?: boolean
}

export function SidebarHeader({ displayName, email, compact = false }: SidebarHeaderProps) {
  const label = displayName?.trim() || email?.split('@')[0] || 'Member'
  const initials = getInitials(displayName, email)
  const showEmail = Boolean(email && displayName && email !== displayName)

  return (
    <div className="relative overflow-hidden border-b border-ink-600/25">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-signal/10 via-signal/5 to-transparent" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-signal/10 blur-2xl" />

      <div className={cn('relative', compact ? 'px-4 py-4' : 'px-4 pb-4 pt-5')}>
        <Link
          to={ROUTES.dashboard}
          className="group flex items-center gap-3 rounded-lg outline-offset-4 transition-opacity hover:opacity-90"
        >
          <BrandMark className="shadow-[0_0_24px_-6px] shadow-signal/50" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold tracking-[0.12em] text-foreground uppercase">
              {APP_NAME}
            </p>
            <p className="truncate text-[10px] font-medium tracking-wide text-signal/90">
              {APP_TAGLINE}
            </p>
          </div>
        </Link>

        {(displayName || email) && (
          <div
            className={cn(
              'mt-4 flex items-center gap-3 rounded-xl border border-ink-600/30 bg-ink-800/80 p-3',
              'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm',
            )}
          >
            <div
              className={cn(
                'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                'bg-gradient-to-br from-ink-700 to-ink-600 ring-2 ring-signal/25',
              )}
              aria-hidden
            >
              <span className="text-xs font-semibold tracking-wide text-foreground">{initials}</span>
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-800 bg-signal"
                title="Active"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{label}</p>
              {showEmail ? (
                <p className="truncate text-[11px] text-muted-foreground">{email}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Personal feed</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { BrandMark, getInitials }
