import type { ContentCategory } from '@/types/database'

export type ArticleWithSource = {
  id: string
  title: string
  canonical_url: string
  author: string | null
  published_at: string | null
  discovered_at: string
  category: ContentCategory | null
  tags: string[]
  ai_summary: string | null
  one_sentence_takeaway: string | null
  what_happened: string | null
  why_it_matters: string | null
  developer_impact: string | null
  technical_impact: string | null
  who_should_care: string | null
  recommended_action: string | null
  importance_score: number | null
  developer_relevance_score: number | null
  relevance_score: number | null
  relevance_decision: string | null
  novelty_score: number | null
  cluster_key: string | null
  notification_level: string
  verification_status: string
  source: { name: string } | null
}

export type ArticleFilters = {
  category?: ContentCategory
  search?: string
  minRelevance?: number
  breakingOnly?: boolean
  page?: number
  pageSize?: number
}

export type PaginatedArticles = {
  articles: ArticleWithSource[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export const DEFAULT_PAGE_SIZE = 12

export type DashboardSection = {
  id: string
  emoji: string
  label: string
  category?: ContentCategory
  articles: ArticleWithSource[]
}
