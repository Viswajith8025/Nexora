import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProtectedRoute } from '@/app/ProtectedRoute'
import { ROUTES } from '@/config/constants'
import { createMockAuth } from './test-utils'

const mockUseAuth = vi.fn()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}))

function ProtectedTestApp({ initialRoute = '/dashboard' }: { initialRoute?: string }) {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path={ROUTES.login} element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('redirects unauthenticated users to login', () => {
    mockUseAuth.mockReturnValue(createMockAuth({ isAuthenticated: false, loading: false }))

    render(<ProtectedTestApp />)

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children for authenticated users', () => {
    mockUseAuth.mockReturnValue(
      createMockAuth({
        isAuthenticated: true,
        user: { id: 'user-1', email: 'dev@example.com' } as never,
      }),
    )

    render(<ProtectedTestApp />)

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('shows loading state while session is resolving', () => {
    mockUseAuth.mockReturnValue(createMockAuth({ loading: true }))

    render(<ProtectedTestApp />)

    expect(screen.getByText('Verifying session…')).toBeInTheDocument()
  })

  it('shows configuration message when Supabase is not configured', () => {
    mockUseAuth.mockReturnValue(createMockAuth({ isConfigured: false }))

    render(<ProtectedTestApp />)

    expect(screen.getByText('Supabase not configured')).toBeInTheDocument()
  })
})
