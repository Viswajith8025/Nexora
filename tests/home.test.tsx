import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HomePage } from '@/features/home/HomePage'
import { ThemeProvider } from '@/hooks/use-theme'
import { createMockAuth } from './test-utils'

const mockUseAuth = vi.fn()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderHome() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(createMockAuth())
  })

  it('renders Nexora branding', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: 'Nexora' })).toBeInTheDocument()
    expect(screen.getByText('Discover. Understand. Stay Ahead.')).toBeInTheDocument()
  })

  it('shows auth CTAs for guests', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/signup')
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })

  it('shows dashboard link for authenticated users', () => {
    mockUseAuth.mockReturnValue(createMockAuth({ isAuthenticated: true }))
    renderHome()
    expect(screen.getByRole('link', { name: /open dashboard/i })).toHaveAttribute('href', '/dashboard')
  })
})
