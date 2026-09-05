import type { ContentCategory } from '@/types/database'
import { getSupabaseClientOrNull } from '@/lib/supabase/client'
import { sanitizeSearchTerm } from '@/lib/security/sanitize-search'
import type { ArticleFilters, ArticleWithSource, PaginatedArticles } from '../types'
import { DEFAULT_PAGE_SIZE } from '../types'

const ARTICLE_SELECT = `
  id,
  title,
  canonical_url,
  author,
  published_at,
  discovered_at,
  category,
  tags,
  ai_summary,
  one_sentence_takeaway,
  what_happened,
  why_it_matters,
  developer_impact,
  technical_impact,
  who_should_care,
  recommended_action,
  importance_score,
  developer_relevance_score,
  relevance_score,
  relevance_decision,
  novelty_score,
  cluster_key,
  notification_level,
  verification_status,
  source:sources ( name )
`

function normalizeArticle(row: unknown): ArticleWithSource {
  const record = row as Record<string, unknown>
  const source = record.source
  return {
    ...(record as ArticleWithSource),
    source: Array.isArray(source) ? (source[0] as { name: string }) ?? null : (source as { name: string } | null),
  }
}

export async function fetchArticles(filters: ArticleFilters = {}): Promise<PaginatedArticles> {
  const supabase = getSupabaseClientOrNull()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  if (!supabase) {
    return { articles: [], total: 0, page, pageSize, hasMore: false }
  }

  let query = supabase
    .from('articles')
    .select(ARTICLE_SELECT, { count: 'exact' })
    .eq('processing_status', 'published')
    .neq('relevance_decision', 'ignore')
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .order('discovered_at', { ascending: false })
    .range(from, to)

  if (filters.category) query = query.eq('category', filters.category)
  if (filters.minRelevance) query = query.gte('relevance_score', filters.minRelevance)
  if (filters.breakingOnly) query = query.eq('relevance_decision', 'breaking')

  if (filters.search?.trim()) {
    const term = sanitizeSearchTerm(filters.search)
    if (term) {
      query = query.or(
        `title.ilike.%${term}%,ai_summary.ilike.%${term}%,one_sentence_takeaway.ilike.%${term}%`,
      )
    }
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  const articles = (data ?? []).map((row) => normalizeArticle(row))
  const total = count ?? 0

  return {
    articles,
    total,
    page,
    pageSize,
    hasMore: from + articles.length < total,
  }
}

export async function fetchArticleById(id: string): Promise<ArticleWithSource | null> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('articles')
    .select(ARTICLE_SELECT)
    .eq('id', id)
    .eq('processing_status', 'published')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return normalizeArticle(data)
}

export async function fetchRelatedArticles(
  article: ArticleWithSource,
  limit = 3,
): Promise<ArticleWithSource[]> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) return []

  let query = supabase
    .from('articles')
    .select(ARTICLE_SELECT)
    .eq('processing_status', 'published')
    .neq('id', article.id)
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (article.cluster_key) {
    query = query.eq('cluster_key', article.cluster_key)
  } else if (article.category) {
    query = query.eq('category', article.category)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => normalizeArticle(row))
}

export async function fetchSavedArticles(userId: string): Promise<ArticleWithSource[]> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('saved_articles')
    .select(`saved_at, article:articles ( ${ARTICLE_SELECT} )`)
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)

  return (data as Array<{ article: Record<string, unknown> | Record<string, unknown>[] | null }> ?? [])
    .map((row) => {
      const article = Array.isArray(row.article) ? row.article[0] : row.article
      return article ? normalizeArticle(article) : null
    })
    .filter((article): article is ArticleWithSource => Boolean(article))
}

export async function fetchLearningTopics(search?: string) {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) return []

  let query = supabase
    .from('learning_topics')
    .select('id, title, description, category, difficulty')
    .order('title')
    .limit(20)

  if (search?.trim()) {
    query = query.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function toggleSaveArticle(userId: string, articleId: string, saved: boolean): Promise<void> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) throw new Error('Supabase not configured')

  if (saved) {
    const { error } = await supabase.from('saved_articles').delete().eq('user_id', userId).eq('article_id', articleId)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase.from('saved_articles').insert({ user_id: userId, article_id: articleId })
  if (error) throw new Error(error.message)
}

export async function fetchSavedArticleIds(userId: string): Promise<Set<string>> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) return new Set()

  const { data, error } = await supabase
    .from('saved_articles')
    .select('article_id')
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((row) => row.article_id))
}

export async function searchIntelligence(
  query: string,
  userId?: string,
): Promise<{
  articles: ArticleWithSource[]
  savedArticles: ArticleWithSource[]
  learningTopics: Array<{ id: string; title: string; description: string | null; category: string | null; difficulty: string }>
}> {
  const term = query.trim()
  if (!term) {
    return { articles: [], savedArticles: [], learningTopics: [] }
  }

  const [articlesResult, learningTopics] = await Promise.all([
    fetchArticles({ search: term, pageSize: 20 }),
    fetchLearningTopics(term),
  ])

  let savedArticles: ArticleWithSource[] = []
  if (userId) {
    const saved = await fetchSavedArticles(userId)
    const lower = term.toLowerCase()
    savedArticles = saved.filter((article) => {
      const haystack = [
        article.title,
        article.ai_summary,
        article.one_sentence_takeaway,
        ...(article.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(lower)
    })
  }

  const tagMatches = await fetchArticlesByTag(term)
  const merged = dedupeByCluster([...articlesResult.articles, ...tagMatches])

  return {
    articles: merged,
    savedArticles,
    learningTopics,
  }
}

async function fetchArticlesByTag(term: string): Promise<ArticleWithSource[]> {
  const supabase = getSupabaseClientOrNull()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('articles')
    .select(ARTICLE_SELECT)
    .eq('processing_status', 'published')
    .neq('relevance_decision', 'ignore')
    .contains('tags', [term])
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .limit(12)

  if (error) return []
  return (data ?? []).map((row) => normalizeArticle(row))
}

export function dedupeByCluster(articles: ArticleWithSource[]): ArticleWithSource[] {
  const seen = new Map<string, ArticleWithSource>()
  for (const article of articles) {
    const key = article.cluster_key ?? article.id
    const existing = seen.get(key)
    if (!existing || (article.relevance_score ?? 0) > (existing.relevance_score ?? 0)) {
      seen.set(key, article)
    }
  }
  return Array.from(seen.values()).sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
}

export const DASHBOARD_CATEGORIES: Array<{ category: ContentCategory; emoji: string; label: string }> = [
  { category: 'AI', emoji: '🤖', label: 'AI' },
  { category: 'Development', emoji: '💻', label: 'DEVELOPMENT' },
  { category: 'Cloud', emoji: '☁️', label: 'CLOUD' },
  { category: 'Security', emoji: '🔐', label: 'SECURITY' },
  { category: 'Developer Tools', emoji: '🚀', label: 'TOOLS' },
]
