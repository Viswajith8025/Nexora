import { INGESTION_LIMITS } from './types.ts'

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, INGESTION_LIMITS.maxTitleLength)
}

export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a)
  const nb = normalizeTitle(b)

  if (!na || !nb) return 0
  if (na === nb) return 1

  const shorter = na.length <= nb.length ? na : nb
  const longer = na.length <= nb.length ? nb : na
  if (longer.includes(shorter) && shorter.length / longer.length >= 0.7) {
    return 0.92
  }

  const wordsA = new Set(na.split(' ').filter(Boolean))
  const wordsB = new Set(nb.split(' ').filter(Boolean))
  if (wordsA.size === 0 || wordsB.size === 0) return 0

  const intersection = [...wordsA].filter((word) => wordsB.has(word)).length
  const union = new Set([...wordsA, ...wordsB]).size
  return intersection / union
}

export function buildClusterKey(normalizedTitle: string): string {
  const words = normalizedTitle.split(' ').filter((word) => word.length > 3)
  return words.slice(0, 6).join('-') || normalizedTitle.slice(0, 40)
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function computeContentHash(parts: {
  canonicalUrl: string
  normalizedTitle: string
  publishedAt: string | null
}): Promise<string> {
  const payload = [parts.canonicalUrl, parts.normalizedTitle, parts.publishedAt ?? ''].join('|')
  return sha256Hex(payload)
}

export function truncateText(text: string | null | undefined, maxLength: number): string | null {
  if (!text) return null
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return null
  return cleaned.length <= maxLength ? cleaned : `${cleaned.slice(0, maxLength - 1)}…`
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
