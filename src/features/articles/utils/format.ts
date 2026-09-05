export function formatRelativeTime(value: string | null): string {
  if (!value) return 'Recently'
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${String(diffHours)}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${String(diffDays)}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatPublishedDate(value: string | null): string {
  if (!value) return 'Date unknown'
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function getSummary(article: {
  one_sentence_takeaway?: string | null
  ai_summary?: string | null
  raw_excerpt?: string | null
}): string {
  return article.one_sentence_takeaway ?? article.ai_summary ?? article.raw_excerpt ?? 'No summary available.'
}
