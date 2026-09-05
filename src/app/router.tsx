import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/app/layouts/RootLayout'
import { AppLayout } from '@/app/layouts/AppLayout'
import { ProtectedRoute, GuestRoute } from '@/app/ProtectedRoute'
import { AdminRoute } from '@/app/AdminRoute'
import { ROUTES } from '@/config/constants'
import { LoadingRegion } from '@/components/states/LoadingRegion'
import { ArticleListSkeleton } from '@/features/articles/components/ArticleList'

const HomePage = lazy(() => import('@/features/home/HomePage').then((m) => ({ default: m.HomePage })))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const NewsPage = lazy(() => import('@/features/articles/NewsPage').then((m) => ({ default: m.NewsPage })))
const NewsDetailPage = lazy(() => import('@/features/articles/NewsDetailPage').then((m) => ({ default: m.NewsDetailPage })))
const AiPage = lazy(() => import('@/features/articles/AiPage').then((m) => ({ default: m.AiPage })))
const DevelopmentPage = lazy(() => import('@/features/articles/DevelopmentPage').then((m) => ({ default: m.DevelopmentPage })))
const SecurityPage = lazy(() => import('@/features/articles/SecurityPage').then((m) => ({ default: m.SecurityPage })))
const ToolsPage = lazy(() => import('@/features/articles/ToolsPage').then((m) => ({ default: m.ToolsPage })))
const LearningPage = lazy(() => import('@/features/learning/LearningPage').then((m) => ({ default: m.LearningPage })))
const SavedPage = lazy(() => import('@/features/articles/SavedPage').then((m) => ({ default: m.SavedPage })))
const SearchPage = lazy(() => import('@/features/articles/SearchPage').then((m) => ({ default: m.SearchPage })))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('@/features/auth/SignupPage').then((m) => ({ default: m.SignupPage })))
const AdminHealthPage = lazy(() => import('@/features/admin/AdminHealthPage').then((m) => ({ default: m.AdminHealthPage })))

function PageFallback() {
  return (
    <LoadingRegion loading label="Loading page" skeleton={<ArticleListSkeleton count={4} />}>
      <div />
    </LoadingRegion>
  )
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: ROUTES.home,
        element: withSuspense(<HomePage />),
      },
      {
        path: ROUTES.login,
        element: withSuspense(
          <GuestRoute>
            <LoginPage />
          </GuestRoute>,
        ),
      },
      {
        path: ROUTES.signup,
        element: withSuspense(
          <GuestRoute>
            <SignupPage />
          </GuestRoute>,
        ),
      },
      {
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: ROUTES.dashboard, element: withSuspense(<DashboardPage />) },
          { path: ROUTES.news, element: withSuspense(<NewsPage />) },
          { path: '/news/:id', element: withSuspense(<NewsDetailPage />) },
          { path: ROUTES.ai, element: withSuspense(<AiPage />) },
          { path: ROUTES.development, element: withSuspense(<DevelopmentPage />) },
          { path: ROUTES.security, element: withSuspense(<SecurityPage />) },
          { path: ROUTES.tools, element: withSuspense(<ToolsPage />) },
          { path: ROUTES.learning, element: withSuspense(<LearningPage />) },
          { path: ROUTES.saved, element: withSuspense(<SavedPage />) },
          { path: ROUTES.search, element: withSuspense(<SearchPage />) },
          { path: ROUTES.settings, element: withSuspense(<SettingsPage />) },
          {
            path: ROUTES.admin,
            element: withSuspense(
              <AdminRoute>
                <AdminHealthPage />
              </AdminRoute>,
            ),
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to={ROUTES.home} replace />,
      },
    ],
  },
])
