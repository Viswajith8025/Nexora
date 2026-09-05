import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { ROUTES } from '@/config/constants'

type ProtectedRouteProps = {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, isConfigured } = useAuth()
  const location = useLocation()

  if (!isConfigured) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold">Supabase not configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">VITE_SUPABASE_URL</code>{' '}
            and <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>{' '}
            to your <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env</code> file.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Verifying session…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />
  }

  return children
}

type GuestRouteProps = {
  children: ReactNode
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, loading, isConfigured } = useAuth()

  if (!isConfigured) {
    return children
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  return children
}
