import { useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import type { ContentCategory } from '@/types/database'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from './components/PageHeader'
import { RelevanceArticleList } from './components/RelevanceArticleList'
import { CategoryFilterChips } from './components/CategoryFilterChips'
import { useArticles } from './hooks/use-articles'
import { useSaveArticle } from './hooks/use-saved-articles'
import { useFeedKeyboard, KeyboardShortcutsDialog } from '@/hooks/use-feed-keyboard'

export function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') as ContentCategory | null
  const [selectedIndex, setSelectedIndex] = useState(0)

  const { articles, loading, error, savedIds, setSavedIds, loadMore, hasMore } = useArticles({
    minRelevance: 40,
    category: categoryParam ?? undefined,
  })
  const { toggleSave } = useSaveArticle()
  const { helpOpen, setHelpOpen } = useFeedKeyboard({
    articles,
    selectedIndex,
    onSelectIndex: setSelectedIndex,
    savedIds,
    onSave: (articleId, isSaved) => {
      void toggleSave(articleId, isSaved, setSavedIds, savedIds)
    },
  })

  return (
    <PageContainer wide>
      <PageHeader title="News">
        <CategoryFilterChips
          value={categoryParam}
          onChange={(category) => {
            const next = new URLSearchParams(searchParams)
            if (category) next.set('category', category)
            else next.delete('category')
            setSearchParams(next, { replace: true })
          }}
        />
      </PageHeader>
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      <RelevanceArticleList
        articles={articles}
        loading={loading}
        savedIds={savedIds}
        selectedIndex={selectedIndex}
        onSelectIndex={setSelectedIndex}
        onSave={(articleId, isSaved) => {
          void toggleSave(articleId, isSaved, setSavedIds, savedIds)
        }}
        onLoadMore={() => { void loadMore() }}
        hasMore={hasMore}
      />
      <KeyboardShortcutsDialog open={helpOpen} onClose={() => { setHelpOpen(false) }} />
    </PageContainer>
  )
}
