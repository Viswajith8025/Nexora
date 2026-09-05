import { resolveArticleUrl } from './url.ts'
import { stripHtml, truncateText } from './text.ts'
import { INGESTION_LIMITS } from './types.ts'

export type RawFeedItem = {
  title: string
  link: string
  author: string | null
  publishedAt: string | null
  excerpt: string | null
  imageUrl: string | null
  categories: string[]
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
}

function extractTag(block: string, tag: string): string | null {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')
  const cdataMatch = block.match(cdata)
  if (cdataMatch?.[1]) return decodeXmlEntities(cdataMatch[1].trim())

  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const plainMatch = block.match(plain)
  if (plainMatch?.[1]) return decodeXmlEntities(stripHtml(plainMatch[1]).trim())

  return null
}

function extractAtomLink(block: string): string | null {
  const relAlternate = block.match(
    /<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i,
  )
  if (relAlternate?.[1]) return relAlternate[1]

  const href = block.match(/<link[^>]+href=["']([^"']+)["']/i)
  return href?.[1] ?? null
}

function parseDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeFeedItem(
  item: {
    title: string | null
    link: string | null
    author: string | null
    publishedAt: string | null
    excerpt: string | null
    imageUrl: string | null
    categories: string[]
  },
  feedUrl: string,
): RawFeedItem | null {
  if (!item.title?.trim() || !item.link) return null

  const resolved = resolveArticleUrl(item.link, feedUrl)
  if (!resolved) return null

  return {
    title: truncateText(item.title, INGESTION_LIMITS.maxTitleLength) ?? item.title.trim(),
    link: resolved,
    author: item.author ? truncateText(item.author, 200) : null,
    publishedAt: parseDate(item.publishedAt),
    excerpt: truncateText(item.excerpt, INGESTION_LIMITS.maxExcerptLength),
    imageUrl: item.imageUrl,
    categories: item.categories.filter(Boolean).slice(0, 10),
  }
}

export function parseRssFeed(xml: string, feedUrl: string): RawFeedItem[] {
  const items: RawFeedItem[] = []

  if (/<feed[\s>]/i.test(xml)) {
    const entryBlocks = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? []
    for (const block of entryBlocks) {
      const normalized = normalizeFeedItem(
        {
          title: extractTag(block, 'title'),
          link: extractAtomLink(block),
          author: extractTag(block, 'name') ?? extractTag(block, 'author'),
          publishedAt: extractTag(block, 'published') ?? extractTag(block, 'updated'),
          excerpt:
            extractTag(block, 'summary') ??
            extractTag(block, 'content') ??
            extractTag(block, 'subtitle'),
          imageUrl: null,
          categories: [...block.matchAll(/<category[^>]+term=["']([^"']+)["']/gi)]
            .map((m) => m[1])
            .filter((value): value is string => Boolean(value)),
        },
        feedUrl,
      )
      if (normalized) items.push(normalized)
    }
    return items
  }

  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? []
  for (const block of itemBlocks) {
    const link = extractTag(block, 'link') ?? extractTag(block, 'guid')
    const normalized = normalizeFeedItem(
      {
        title: extractTag(block, 'title'),
        link,
        author: extractTag(block, 'author') ?? extractTag(block, 'dc:creator'),
        publishedAt: extractTag(block, 'pubDate') ?? extractTag(block, 'published'),
        excerpt:
          extractTag(block, 'description') ??
          extractTag(block, 'content:encoded') ??
          extractTag(block, 'summary'),
        imageUrl:
          block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1] ??
          block.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1] ??
          null,
        categories: [...block.matchAll(/<category[^>]*>([^<]+)<\/category>/gi)]
          .map((m) => m[1]?.trim() ?? '')
          .filter(Boolean),
      },
      feedUrl,
    )
    if (normalized) items.push(normalized)
  }

  return items
}

export function parseFeed(
  xml: string,
  feedUrl: string,
  sourceType: string,
): { items: RawFeedItem[]; error?: string } {
  if (!xml.trim()) {
    return { items: [], error: 'Empty feed body' }
  }

  if (sourceType === 'github') {
    return { items: [], error: 'GitHub ingestion not yet implemented in this phase' }
  }

  try {
    const items = parseRssFeed(xml, feedUrl)
    return { items }
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : 'Failed to parse feed',
    }
  }
}
