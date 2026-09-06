import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'

export function AiPage() {
  return <Navigate to={`${ROUTES.news}?category=AI`} replace />
}

export function DevelopmentPage() {
  return <Navigate to={`${ROUTES.news}?category=Development`} replace />
}

export function SecurityPage() {
  return <Navigate to={`${ROUTES.news}?category=Security`} replace />
}

export function ToolsPage() {
  return <Navigate to={`${ROUTES.news}?category=Developer%20Tools`} replace />
}
