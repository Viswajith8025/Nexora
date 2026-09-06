const DISMISSED_KEY = 'nexora-dismissed-articles'

export function getDismissedArticleIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function dismissArticle(articleId: string): void {
  const ids = getDismissedArticleIds()
  ids.add(articleId)
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]))
}

export function isArticleDismissed(articleId: string): boolean {
  return getDismissedArticleIds().has(articleId)
}
