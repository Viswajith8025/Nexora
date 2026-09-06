import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/features/articles/components/PageHeader'
import { SearchBar } from '@/features/articles/components/SearchBar'
import { ArticleList } from '@/features/articles/components/ArticleList'
import { LearningCard } from '@/features/articles/components/ArticleCard'
import { ErrorState } from '@/components/states/ErrorState'
import { LoadingRegion } from '@/components/states/LoadingRegion'
import { SearchFilters, type SearchFilterValues } from '@/features/search/components/SearchFilters'
import { globalSearch } from '@/features/search/api/search'
import { useAuth } from '@/hooks/use-auth'
import { useSaveArticle, refreshSavedIds } from '@/features/articles/hooks/use-saved-articles'
import type { ArticleWithSource } from '@/features/articles/types'
import type { ContentCategory } from '@/types/database'
import { Badge } from '@/components/ui/badge'

function parseFilters(params: URLSearchParams): SearchFilterValues {
  const category = params.get('category')
  return {
    category: category ? (category as ContentCategory) : undefined,
    dateFrom: params.get('from') ?? undefined,
    dateTo: params.get('to') ?? undefined,
    minImportance: params.get('importance') ? Number(params.get('importance')) : undefined,
    source: params.get('source') ?? undefined,
  }
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const filters = useMemo(() => parseFilters(params), [params])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const filterKey = [
    query,
    filters.category,
    filters.dateFrom,
    filters.dateTo,
    filters.minImportance,
    filters.source,
  ].join('|')
  const [page, setPage] = useState(1)
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setPage(1)
  }
  const [articles, setArticles] = useState<ArticleWithSource[]>([])
  const [savedArticles, setSavedArticles] = useState<ArticleWithSource[]>([])
  const [learningTopics, setLearningTopics] = useState<
    Array<{ id: string; title: string; description: string | null; category: string | null }>
  >([])
  const [sources, setSources] = useState<Array<{ id: string; name: string; category: string }>>([])
  const [technologies, setTechnologies] = useState<string[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const { user } = useAuth()
  const { toggleSave } = useSaveArticle()


  useEffect(() => {
    if (!user) return

    let cancelled = false
    void refreshSavedIds(user.id).then((ids) => {
      if (!cancelled) setSavedIds(ids)
    })
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    if (!query.trim()) return

    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })

    void globalSearch(
      {
        query,
        category: filters.category,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo ? `${filters.dateTo}T23:59:59Z` : undefined,
        minImportance: filters.minImportance,
        source: filters.source,
        page,
      },
      user?.id,
    )
      .then((result) => {
        if (cancelled) return
        setArticles((current) => (page === 1 ? result.articles : [...current, ...result.articles]))
        setSavedArticles(result.savedArticles)
        setLearningTopics(result.learningTopics)
        setSources(result.sources)
        setTechnologies(result.technologies)
        setHasMore(result.hasMore)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Search failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [query, filters, page, user?.id])

  const hasQuery = query.trim().length > 0
  const noResults =
    hasQuery &&
    !loading &&
    !error &&
    articles.length === 0 &&
    savedArticles.length === 0 &&
    learningTopics.length === 0 &&
    sources.length === 0 &&
    technologies.length === 0

  function updateFilters(next: SearchFilterValues) {
    const nextParams: Record<string, string> = {}
    if (query) nextParams.q = query
    if (next.category) nextParams.category = next.category
    if (next.dateFrom) nextParams.from = next.dateFrom
    if (next.dateTo) nextParams.to = next.dateTo
    if (next.minImportance) nextParams.importance = String(next.minImportance)
    if (next.source) nextParams.source = next.source
    setParams(nextParams)
  }

  return (
    <PageContainer wide>
      <PageHeader
        title="Search"
        description="Search articles, topics, technologies, sources, saved content, and learning."
      />
      <div className="mb-4">
        <SearchBar
          defaultValue={query}
          autoFocus
          onSearch={(value) => {
            const nextParams: Record<string, string> = {}
            if (value) nextParams.q = value
            if (filters.category) nextParams.category = filters.category
            if (filters.dateFrom) nextParams.from = filters.dateFrom
            if (filters.dateTo) nextParams.to = filters.dateTo
            if (filters.minImportance) nextParams.importance = String(filters.minImportance)
            if (filters.source) nextParams.source = filters.source
            setParams(nextParams)
          }}
        />
      </div>

      {hasQuery ? (
        <div className="space-y-6">
          <SearchFilters values={filters} onChange={updateFilters} />

          <LoadingRegion loading={loading && page === 1} label="Searching">
            {error ? (
              <ErrorState type="generic" description={error} onRetry={() => setPage(1)} />
            ) : noResults ? (
              <ErrorState type="no_results" />
            ) : (
              <div className="space-y-8">
                {technologies.length > 0 ? (
                  <section aria-labelledby="search-technologies">
                    <h2 id="search-technologies" className="mb-2 text-sm font-semibold tracking-wide">
                      Technologies
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {technologies.map((tag) => (
                        <Badge key={tag} className="bg-secondary text-secondary-foreground">{tag}</Badge>
                      ))}
                    </div>
                  </section>
                ) : null}

                {sources.length > 0 ? (
                  <section aria-labelledby="search-sources">
                    <h2 id="search-sources" className="mb-2 text-sm font-semibold tracking-wide">Sources</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {sources.map((source) => (
                        <li key={source.id} className="rounded-lg border bg-card/50 px-3 py-2 text-sm">
                          <span className="font-medium">{source.name}</span>
                          <span className="ml-2 text-muted-foreground">{source.category}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {savedArticles.length > 0 ? (
                  <section aria-labelledby="search-saved">
                    <h2 id="search-saved" className="mb-2 text-sm font-semibold tracking-wide">Saved matches</h2>
                    <ArticleList
                      articles={savedArticles}
                      savedIds={user ? savedIds : new Set()}
                      onSave={(articleId, isSaved) => {
                        void toggleSave(articleId, isSaved, setSavedIds, savedIds)
                      }}
                    />
                  </section>
                ) : null}

                {learningTopics.length > 0 ? (
                  <section aria-labelledby="search-learning">
                    <h2 id="search-learning" className="mb-2 text-sm font-semibold tracking-wide">Learning topics</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {learningTopics.map((topic) => (
                        <LearningCard key={topic.id} title={topic.title} description={topic.description} />
                      ))}
                    </div>
                  </section>
                ) : null}

                <section aria-labelledby="search-articles">
                  <h2 id="search-articles" className="mb-2 text-sm font-semibold tracking-wide">Articles</h2>
                  <ArticleList
                    articles={articles}
                    loading={loading && articles.length === 0}
                    savedIds={user ? savedIds : new Set()}
                    onSave={(articleId, isSaved) => {
                      void toggleSave(articleId, isSaved, setSavedIds, savedIds)
                    }}
                    hasMore={hasMore}
                    onLoadMore={() => setPage((current) => current + 1)}
                  />
                </section>
              </div>
            )}
          </LoadingRegion>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Enter a query to search across your intelligence feed, saved articles, and learning content.
        </p>
      )}
    </PageContainer>
  )
}
