import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { ROUTES } from '@/config/constants'
import { LoadingRegion } from '@/components/states/LoadingRegion'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <LoadingRegion loading label="Verifying access">
        <div />
      </LoadingRegion>
    )
  }

  if (!isAuthenticated || !profile?.is_admin) {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  return <>{children}</>
}
