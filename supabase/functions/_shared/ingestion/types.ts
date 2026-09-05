export type SourceType = 'rss' | 'github' | 'api' | 'web'

export type ContentCategory =
  | 'AI'
  | 'Development'
  | 'Cloud'
  | 'Security'
  | 'Developer Tools'
  | 'Databases'
  | 'Technology Industry'

export type ProcessingStatus =
  | 'discovered'
  | 'pending'
  | 'processing'
  | 'analyzed'
  | 'published'
  | 'archived'
  | 'failed'

export type SourceRecord = {
  id: string
  name: string
  type: SourceType
  url: string
  category: ContentCategory
  is_active: boolean
  fetch_interval_minutes: number
  last_fetched_at: string | null
  metadata: Record<string, unknown>
}

export type NormalizedArticle = {
  title: string
  canonicalUrl: string
  author: string | null
  publishedAt: string | null
  rawExcerpt: string | null
  imageUrl: string | null
  tags: string[]
  contentHash: string
  normalizedTitle: string
  clusterKey: string
}

export type IngestionItemResult =
  | { status: 'inserted'; articleId: string; canonicalUrl: string }
  | { status: 'linked'; articleId: string; canonicalUrl: string }
  | { status: 'duplicate'; canonicalUrl: string }
  | { status: 'skipped'; reason: string; canonicalUrl?: string }

export type SourceIngestionResult = {
  sourceId: string
  sourceName: string
  fetched: number
  inserted: number
  linked: number
  duplicates: number
  skipped: number
  errors: string[]
  durationMs: number
}

export type IngestionRunResult = {
  cronRunId: string
  sourcesProcessed: number
  totalInserted: number
  totalLinked: number
  totalDuplicates: number
  totalSkipped: number
  totalErrors: number
  sourceResults: SourceIngestionResult[]
  durationMs: number
}

export const INGESTION_LIMITS = {
  maxResponseBytes: 5 * 1024 * 1024,
  fetchTimeoutMs: 15_000,
  maxExcerptLength: 2_000,
  maxTitleLength: 500,
  titleSimilarityThreshold: 0.85,
  titleSimilarityWindowDays: 7,
} as const
