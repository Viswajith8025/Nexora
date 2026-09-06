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

function persistReadIds(ids: Set<string>): void {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]))
}

export function markArticleRead(articleId: string): void {
  const ids = getReadArticleIds()
  ids.add(articleId)
  persistReadIds(ids)
}

export function markAllArticlesRead(articleIds: string[]): void {
  const ids = getReadArticleIds()
  for (const id of articleIds) ids.add(id)
  persistReadIds(ids)
}

export function clearAllReadArticles(): void {
  localStorage.removeItem(READ_KEY)
}

export function isArticleRead(articleId: string): boolean {
  return getReadArticleIds().has(articleId)
}
