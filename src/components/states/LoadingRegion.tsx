import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export function LoadingRegion({
  loading,
  label = 'Loading',
  children,
  skeleton,
}: {
  loading: boolean
  label?: string
  children: ReactNode
  skeleton?: ReactNode
}) {
  if (loading) {
    return (
      <div aria-busy="true" aria-live="polite" aria-label={label}>
        {skeleton ?? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}
      </div>
    )
  }

  return <>{children}</>
}
