import type { ContentCategory } from '@/types/database'
import { cn } from '@/lib/utils'

const FILTERS: Array<{ label: string; value: ContentCategory | null }> = [
  { label: 'All', value: null },
  { label: 'AI', value: 'AI' },
  { label: 'Development', value: 'Development' },
  { label: 'Security', value: 'Security' },
  { label: 'Tools', value: 'Developer Tools' },
  { label: 'Cloud', value: 'Cloud' },
]

export function CategoryFilterChips({
  value,
  onChange,
}: {
  value: ContentCategory | null
  onChange: (category: ContentCategory | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <button
          key={filter.label}
          type="button"
          onClick={() => { onChange(filter.value) }}
          className={cn(
            'rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === filter.value
              ? 'bg-signal text-primary-foreground'
              : 'bg-ink-700 text-muted-foreground hover:bg-ink-600 hover:text-foreground',
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
