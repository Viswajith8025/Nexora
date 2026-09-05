import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ErrorState } from '@/components/states/ErrorState'

describe('ErrorState', () => {
  it('renders no results state', () => {
    render(<ErrorState type="no_results" />)
    expect(screen.getByRole('alert')).toHaveTextContent('No results')
  })

  it('renders retry action', () => {
    const onRetry = vi.fn()
    render(<ErrorState type="generic" onRetry={onRetry} />)
    screen.getByRole('button', { name: 'Try again' }).click()
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders source unavailable message', () => {
    render(<ErrorState type="source_unavailable" />)
    expect(screen.getByText('Source temporarily unavailable')).toBeInTheDocument()
  })
})
