import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { fetchArticles } from '@/features/articles/api/articles'
import type { ArticleWithSource } from '@/features/articles/types'
import { cn } from '@/lib/utils'

type PaletteAction = {
  id: string
  label: string
  hint?: string
  run: () => void
}

const CommandPaletteContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
} | null>(null)

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')
  const [articles, setArticles] = React.useState<ArticleWithSource[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((value) => !value)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  React.useEffect(() => {
    if (!open) {
      setQuery('')
      setArticles([])
      return
    }
    if (!query.trim()) return

    let cancelled = false
    setLoading(true)
    void fetchArticles({ search: query, pageSize: 8 }).then((result) => {
      if (!cancelled) {
        setArticles(result.articles)
        setLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [open, query])

  const actions: PaletteAction[] = [
    { id: 'dash', label: 'Go to Dashboard', run: () => navigate(ROUTES.dashboard) },
    { id: 'news', label: 'Go to News', run: () => navigate(ROUTES.news) },
    { id: 'saved', label: 'Go to Saved', run: () => navigate(ROUTES.saved) },
    { id: 'settings', label: 'Go to Settings', run: () => navigate(ROUTES.settings) },
  ]

  const filteredActions = actions.filter((action) =>
    action.label.toLowerCase().includes(query.toLowerCase()),
  )

  function run(action: () => void) {
    action()
    setOpen(false)
  }

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-ink-900/70 px-4 pt-[12vh] backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close command palette"
            onClick={() => { setOpen(false) }}
          />
          <div className="relative z-10 w-full max-w-xl rounded-xl bg-ink-800 p-2 shadow-2xl ring-1 ring-ink-600/40">
            <input
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value) }}
              placeholder="Search articles or jump to…"
              className="w-full rounded-lg bg-ink-700 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-signal"
            />
            <div className="mt-2 max-h-80 overflow-y-auto">
              {loading ? <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p> : null}
              {articles.length > 0 ? (
                <section className="mb-2">
                  <p className="px-3 py-1 text-xs text-muted-foreground">Articles</p>
                  {articles.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-ink-700"
                      onClick={() => { run(() => navigate(ROUTES.newsDetail(article.id))) }}
                    >
                      <span className="line-clamp-1">{article.title}</span>
                    </button>
                  ))}
                </section>
              ) : null}
              <section>
                <p className="px-3 py-1 text-xs text-muted-foreground">Actions</p>
                {filteredActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className={cn('flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-ink-700')}
                    onClick={() => { run(action.run) }}
                  >
                    {action.label}
                  </button>
                ))}
              </section>
            </div>
            <p className="mt-2 px-2 text-[11px] text-muted-foreground">⌘K to open · Esc to close</p>
          </div>
        </div>
      ) : null}
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPalette() {
  const context = React.useContext(CommandPaletteContext)
  if (!context) throw new Error('useCommandPalette must be used within CommandPaletteProvider')
  return context
}
