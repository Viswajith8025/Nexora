import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { dismissArticle } from '@/features/articles/utils/dismissed'
import { markArticleRead } from '@/features/articles/utils/read-status'
import type { ArticleWithSource } from '@/features/articles/types'

export function KeyboardShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-ink-900/70 p-4">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-ink-800 p-6 ring-1 ring-ink-600/40">
        <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt>⌘K</dt><dd className="text-muted-foreground">Command palette</dd></div>
          <div className="flex justify-between"><dt>j / k</dt><dd className="text-muted-foreground">Move selection</dd></div>
          <div className="flex justify-between"><dt>o / Enter</dt><dd className="text-muted-foreground">Open article</dd></div>
          <div className="flex justify-between"><dt>s</dt><dd className="text-muted-foreground">Save article</dd></div>
          <div className="flex justify-between"><dt>e</dt><dd className="text-muted-foreground">Dismiss article</dd></div>
          <div className="flex justify-between"><dt>?</dt><dd className="text-muted-foreground">This help</dd></div>
        </dl>
      </div>
    </div>
  )
}

export function useFeedKeyboard({
  articles,
  selectedIndex,
  onSelectIndex,
  onSave,
  savedIds,
}: {
  articles: ArticleWithSource[]
  selectedIndex: number
  onSelectIndex: (index: number) => void
  onSave?: (articleId: string, isSaved: boolean) => void
  savedIds?: Set<string>
}) {
  const navigate = useNavigate()
  const [helpOpen, setHelpOpen] = React.useState(false)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') return

      if (event.key === '?') {
        event.preventDefault()
        setHelpOpen(true)
        return
      }

      if (articles.length === 0) return

      if (event.key === 'j') {
        event.preventDefault()
        onSelectIndex(Math.min(selectedIndex + 1, articles.length - 1))
      }
      if (event.key === 'k') {
        event.preventDefault()
        onSelectIndex(Math.max(selectedIndex <= 0 ? 0 : selectedIndex - 1, 0))
      }
      if (event.key === 'o' || event.key === 'Enter') {
        const article = articles[selectedIndex]
        if (!article) return
        event.preventDefault()
        markArticleRead(article.id)
        void navigate(ROUTES.newsDetail(article.id))
      }
      if (event.key === 's') {
        const article = articles[selectedIndex]
        if (!article || !onSave) return
        event.preventDefault()
        onSave(article.id, savedIds?.has(article.id) ?? false)
      }
      if (event.key === 'e') {
        const article = articles[selectedIndex]
        if (!article) return
        event.preventDefault()
        dismissArticle(article.id)
        window.location.reload()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [articles, selectedIndex, onSelectIndex, onSave, savedIds, navigate])

  return { helpOpen, setHelpOpen }
}
