import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ThemeProvider } from '@/hooks/use-theme'
import { createMockAuth } from '../test-utils'

const mockUseDashboardArticles = vi.fn()
const mockToggleSave = vi.fn()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () =>
    createMockAuth({
      isAuthenticated: true,
      profile: { display_name: 'Alex' } as import('@/types/database').Profile,
    }),
}))

vi.mock('@/features/articles/hooks/use-articles', () => ({
  useDashboardArticles: () => mockUseDashboardArticles(),
}))

vi.mock('@/features/articles/hooks/use-saved-articles', () => ({
  useSaveArticle: () => ({ toggleSave: mockToggleSave }),
}))

function renderDashboard() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    mockUseDashboardArticles.mockReturnValue({
      mustKnow: [],
      sections: {},
      learning: [],
      loading: false,
      error: null,
      savedIds: new Set(),
      setSavedIds: vi.fn(),
    })
  })

  it('renders Nexora greeting', () => {
    renderDashboard()
    expect(screen.getByText(/NEXORA/i)).toBeInTheDocument()
    expect(screen.getByText(/Alex/)).toBeInTheDocument()
  })

  it('shows loading skeleton when loading', () => {
    mockUseDashboardArticles.mockReturnValue({
      mustKnow: [],
      sections: {},
      learning: [],
      loading: true,
      error: null,
      savedIds: new Set(),
      setSavedIds: vi.fn(),
    })
    const { container } = renderDashboard()
    expect(container.querySelector('.animate-pulse, [class*="skeleton"]')).toBeTruthy()
  })
})
