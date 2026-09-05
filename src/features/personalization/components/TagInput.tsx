import { useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function TagInput({
  label,
  description,
  values,
  onChange,
  placeholder,
}: {
  label: string
  description?: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')

  function addValue() {
    const trimmed = draft.trim()
    if (!trimmed || values.includes(trimmed)) return
    onChange([...values, trimmed])
    setDraft('')
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addValue()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addValue}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value} className="gap-1 pr-1">
            {value}
            <button
              type="button"
              className="rounded-sm p-0.5 hover:bg-muted"
              onClick={() => { onChange(values.filter((item) => item !== value)) }}
              aria-label={`Remove ${value}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}
