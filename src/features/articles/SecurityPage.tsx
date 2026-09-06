import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'

export function SecurityPage() {
  return <Navigate to={`${ROUTES.news}?category=Security`} replace />
}
