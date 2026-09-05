import { titleSimilarity } from './text.ts'
import { INGESTION_LIMITS } from './types.ts'

export type ExistingArticle = {
  id: string
  canonical_url: string
  content_hash: string | null
  normalized_title: string | null
  title: string
  published_at: string | null
}

export type DedupeMatch =
  | { type: 'canonical_url'; article: ExistingArticle }
  | { type: 'content_hash'; article: ExistingArticle }
  | { type: 'title_similarity'; article: ExistingArticle; score: number }

export function findDuplicate(
  candidate: {
    canonicalUrl: string
    contentHash: string
    normalizedTitle: string
    title: string
    publishedAt: string | null
  },
  existingArticles: ExistingArticle[],
): DedupeMatch | null {
  const byUrl = existingArticles.find((a) => a.canonical_url === candidate.canonicalUrl)
  if (byUrl) return { type: 'canonical_url', article: byUrl }

  const byHash = existingArticles.find((a) => a.content_hash === candidate.contentHash)
  if (byHash) return { type: 'content_hash', article: byHash }

  const windowStart = Date.now() - INGESTION_LIMITS.titleSimilarityWindowDays * 24 * 60 * 60 * 1000

  let bestScore = 0
  let bestArticle: ExistingArticle | null = null

  for (const article of existingArticles) {
    const referenceDate = article.published_at ? new Date(article.published_at).getTime() : 0
    const candidateDate = candidate.publishedAt ? new Date(candidate.publishedAt).getTime() : 0

    if (referenceDate && candidateDate) {
      const newest = Math.max(referenceDate, candidateDate)
      if (newest < windowStart) continue
    }

    const score = titleSimilarity(
      candidate.normalizedTitle,
      article.normalized_title ?? article.title,
    )

    if (score >= INGESTION_LIMITS.titleSimilarityThreshold && score > bestScore) {
      bestScore = score
      bestArticle = article
    }
  }

  if (bestArticle) {
    return { type: 'title_similarity', article: bestArticle, score: bestScore }
  }

  return null
}
