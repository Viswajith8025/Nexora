import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'

export function DevelopmentPage() {
  return <Navigate to={`${ROUTES.news}?category=Development`} replace />
}
