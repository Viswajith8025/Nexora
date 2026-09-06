import type { ContentCategory } from '@/types/database'
import { getSupabaseClientOrNull } from '@/lib/supabase/client'
import { sanitizeSearchTerm } from '@/lib/security/sanitize-search'
import type { ArticleWithSource } from '@/features/articles/types'
import { dedupeByCluster, ARTICLE_SOURCE_EMBED } from '@/features/articles/api/articles'

export type SearchFilters = {
  query: string
  category?: ContentCategory
  dateFrom?: string
  dateTo?: string
  minImportance?: number
  source?: string
  page?: number
  pageSize?: number
}

export type GlobalSearchResult = {
  articles: ArticleWithSource[]
  savedArticles: ArticleWithSource[]
  learningTopics: Array<{ id: string; title: string; description: string | null; category: string | null }>
  sources: Array<{ id: string; name: string; category: string }>
  technologies: string[]
  total: number
  hasMore: boolean
}

const ARTICLE_SELECT = `
  id, title, canonical_url, author, published_at, discovered_at, category, tags,
  ai_summary, one_sentence_takeaway, what_happened, why_it_matters, developer_impact,
  technical_impact, who_should_care, recommended_action, importance_score,
  developer_relevance_score, relevance_score, relevance_decision, novelty_score,
  cluster_key, notification_level, verification_status, ${ARTICLE_SOURCE_EMBED}
`

function normalizeArticle(row: unknown): ArticleWithSource {
  const record = row as Record<string, unknown>
  const source = record.source
  return {
    ...(record as ArticleWithSource),
    source: Array.isArray(source) ? (source[0] as { name: string }) ?? null : (source as { name: string } | null),
  }
}

export async function globalSearch(
  filters: SearchFilters,
  userId?: string,
): Promise<GlobalSearchResult> {
  const supabase = getSupabaseClientOrNull()
  const term = sanitizeSearchTerm(filters.query)
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 12
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  if (!supabase || !term) {
    return { articles: [], savedArticles: [], learningTopics: [], sources: [], technologies: [], total: 0, hasMore: false }
  }

  let articleQuery = supabase
    .from('articles')
    .select(ARTICLE_SELECT, { count: 'exact' })
    .eq('processing_status', 'published')
    .neq('relevance_decision', 'ignore')
    .or(
      `title.ilike.%${term}%,ai_summary.ilike.%${term}%,one_sentence_takeaway.ilike.%${term}%,what_happened.ilike.%${term}%`,
    )
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .range(from, to)

  if (filters.category) articleQuery = articleQuery.eq('category', filters.category)
  if (filters.dateFrom) articleQuery = articleQuery.gte('discovered_at', filters.dateFrom)
  if (filters.dateTo) articleQuery = articleQuery.lte('discovered_at', filters.dateTo)
  if (filters.minImportance) articleQuery = articleQuery.gte('importance_score', filters.minImportance)

  const [articlesRes, learningRes, sourcesRes] = await Promise.all([
    articleQuery,
    supabase
      .from('learning_topics')
      .select('id, title, description, category')
      .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
      .limit(8),
    supabase
      .from('sources')
      .select('id, name, category')
      .eq('is_active', true)
      .ilike('name', `%${term}%`)
      .limit(8),
  ])

  if (articlesRes.error) throw new Error(articlesRes.error.message)

  let articles = (articlesRes.data ?? []).map((row) => normalizeArticle(row))

  if (filters.source) {
    const sourceFilter = filters.source.toLowerCase()
    articles = articles.filter((article) =>
      article.source?.name?.toLowerCase().includes(sourceFilter),
    )
  }

  articles = dedupeByCluster(articles)

  const technologies = new Set<string>()
  for (const article of articles) {
    for (const tag of article.tags ?? []) {
      if (tag.toLowerCase().includes(term.toLowerCase())) technologies.add(tag)
    }
  }

  let savedArticles: ArticleWithSource[] = []
  if (userId) {
    const { data: savedData } = await supabase
      .from('saved_articles')
      .select(`article:articles ( ${ARTICLE_SELECT} )`)
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })
      .limit(100)

    const lower = term.toLowerCase()
    savedArticles = (savedData as Array<{ article: Record<string, unknown> | Record<string, unknown>[] | null }> ?? [])
      .map((row) => {
        const article = Array.isArray(row.article) ? row.article[0] : row.article
        return article ? normalizeArticle(article) : null
      })
      .filter((article): article is ArticleWithSource => {
        if (!article) return false
        const haystack = [article.title, article.ai_summary, ...(article.tags ?? [])].join(' ').toLowerCase()
        return haystack.includes(lower)
      })
  }

  const total = articlesRes.count ?? articles.length

  return {
    articles,
    savedArticles,
    learningTopics: learningRes.data ?? [],
    sources: sourcesRes.data ?? [],
    technologies: [...technologies].slice(0, 10),
    total,
    hasMore: from + articles.length < total,
  }
}

export async function searchSavedArticles(
  userId: string,
  query: string,
  page = 1,
  pageSize = 12,
): Promise<{ articles: ArticleWithSource[]; hasMore: boolean }> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) return { articles: [], hasMore: false }

  const { data, error } = await supabase
    .from('saved_articles')
    .select(`saved_at, article:articles ( ${ARTICLE_SELECT} )`)
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })

  if (error) throw new Error(error.message)

  const lower = query.trim().toLowerCase()
  const all = (data as Array<{ article: Record<string, unknown> | Record<string, unknown>[] | null }> ?? [])
    .map((row) => {
      const article = Array.isArray(row.article) ? row.article[0] : row.article
      return article ? normalizeArticle(article) : null
    })
    .filter((article): article is ArticleWithSource => Boolean(article))
    .filter((article) => {
      if (!lower) return true
      const haystack = [article.title, article.ai_summary, ...(article.tags ?? [])].join(' ').toLowerCase()
      return haystack.includes(lower)
    })

  const from = (page - 1) * pageSize
  const slice = all.slice(from, from + pageSize)

  return { articles: slice, hasMore: from + slice.length < all.length }
}
