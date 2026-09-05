import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ROUTES } from '@/config/constants'

export function SearchBar({
  defaultValue = '',
  autoFocus = false,
  placeholder = 'Search articles, tags, technologies…',
  'aria-label': ariaLabel = 'Search',
  onSearch,
}: {
  defaultValue?: string
  autoFocus?: boolean
  placeholder?: string
  'aria-label'?: string
  onSearch?: (query: string) => void
}) {
  const [query, setQuery] = useState(defaultValue)
  const navigate = useNavigate()

  function submit() {
    const trimmed = query.trim()
    if (onSearch) {
      onSearch(trimmed)
      return
    }
    void navigate(trimmed ? `${ROUTES.search}?q=${encodeURIComponent(trimmed)}` : ROUTES.search)
  }

  return (
    <form
      className="relative w-full"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        key={defaultValue}
        defaultValue={defaultValue}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="h-11 bg-card pl-10"
        autoFocus={autoFocus}
        aria-label={ariaLabel}
      />
    </form>
  )
}
