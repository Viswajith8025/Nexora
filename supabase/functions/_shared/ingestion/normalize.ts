import type { ContentCategory, NormalizedArticle, SourceRecord } from './types.ts'
import type { RawFeedItem } from './rss-parser.ts'
import { buildClusterKey, computeContentHash, normalizeTitle } from './text.ts'
import { isAllowedUrl } from './url.ts'

export async function normalizeFeedItem(
  item: RawFeedItem,
  source: SourceRecord,
): Promise<NormalizedArticle | null> {
  if (!isAllowedUrl(item.link)) return null

  const normalizedTitle = normalizeTitle(item.title)
  if (!normalizedTitle) return null

  const contentHash = await computeContentHash({
    canonicalUrl: item.link,
    normalizedTitle,
    publishedAt: item.publishedAt,
  })

  const tags = [...new Set([...item.categories, source.category].filter(Boolean))]

  return {
    title: item.title,
    canonicalUrl: item.link,
    author: item.author,
    publishedAt: item.publishedAt,
    rawExcerpt: item.excerpt,
    imageUrl: item.imageUrl && isAllowedUrl(item.imageUrl) ? item.imageUrl : null,
    tags,
    contentHash,
    normalizedTitle,
    clusterKey: buildClusterKey(normalizedTitle),
  }
}

export function toArticleInsert(
  article: NormalizedArticle,
  source: SourceRecord,
): Record<string, unknown> {
  return {
    title: article.title,
    canonical_url: article.canonicalUrl,
    source_id: source.id,
    author: article.author,
    published_at: article.publishedAt,
    raw_excerpt: article.rawExcerpt,
    image_url: article.imageUrl,
    category: source.category as ContentCategory,
    tags: article.tags,
    content_hash: article.contentHash,
    normalized_title: article.normalizedTitle,
    cluster_key: article.clusterKey,
    processing_status: 'discovered',
    verification_status: 'unverified',
  }
}
