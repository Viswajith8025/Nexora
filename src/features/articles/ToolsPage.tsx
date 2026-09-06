import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'

export function ToolsPage() {
  return <Navigate to={`${ROUTES.news}?category=Developer%20Tools`} replace />
}
