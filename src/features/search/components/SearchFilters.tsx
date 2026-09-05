import type { ContentCategory } from '@/types/database'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const CATEGORIES: ContentCategory[] = [
  'AI',
  'Development',
  'Cloud',
  'Security',
  'Developer Tools',
  'Databases',
  'Technology Industry',
]

export type SearchFilterValues = {
  category?: ContentCategory
  dateFrom?: string
  dateTo?: string
  minImportance?: number
  source?: string
}

export function SearchFilters({
  values,
  onChange,
}: {
  values: SearchFilterValues
  onChange: (values: SearchFilterValues) => void
}) {
  return (
    <fieldset className="grid gap-4 rounded-xl border bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-5">
      <legend className="sr-only">Search filters</legend>

      <div className="space-y-1">
        <Label htmlFor="filter-category">Category</Label>
        <select
          id="filter-category"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={values.category ?? ''}
          onChange={(event) => {
            onChange({ ...values, category: (event.target.value || undefined) as ContentCategory | undefined })
          }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-date-from">From</Label>
        <Input
          id="filter-date-from"
          type="date"
          value={values.dateFrom ?? ''}
          onChange={(event) => { onChange({ ...values, dateFrom: event.target.value || undefined }) }}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-date-to">To</Label>
        <Input
          id="filter-date-to"
          type="date"
          value={values.dateTo ?? ''}
          onChange={(event) => { onChange({ ...values, dateTo: event.target.value || undefined }) }}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-importance">Min importance ({values.minImportance ?? 0})</Label>
        <input
          id="filter-importance"
          type="range"
          min={0}
          max={100}
          step={10}
          value={values.minImportance ?? 0}
          onChange={(event) => {
            const value = Number(event.target.value)
            onChange({ ...values, minImportance: value > 0 ? value : undefined })
          }}
          className="w-full"
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-source">Source</Label>
        <Input
          id="filter-source"
          placeholder="e.g. OpenAI Blog"
          value={values.source ?? ''}
          onChange={(event) => { onChange({ ...values, source: event.target.value || undefined }) }}
        />
      </div>
    </fieldset>
  )
}
