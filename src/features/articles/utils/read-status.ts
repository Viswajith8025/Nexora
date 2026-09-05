const READ_KEY = 'nexora-read-articles'

export function getReadArticleIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(parsed)
  } catch {
    return new Set()
  }
}

export function markArticleRead(articleId: string): void {
  const ids = getReadArticleIds()
  ids.add(articleId)
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]))
}

export function isArticleRead(articleId: string): boolean {
  return getReadArticleIds().has(articleId)
}
