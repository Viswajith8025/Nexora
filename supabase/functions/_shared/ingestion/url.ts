const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'source',
])

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ALLOWED_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

export function canonicalizeUrl(rawUrl: string): string | null {
  if (!rawUrl?.trim()) return null

  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    return null
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null

  parsed.hash = ''
  parsed.hostname = parsed.hostname.toLowerCase()

  if (
    (parsed.protocol === 'https:' && parsed.port === '443') ||
    (parsed.protocol === 'http:' && parsed.port === '80')
  ) {
    parsed.port = ''
  }

  const params = new URLSearchParams(parsed.search)
  for (const key of [...params.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
      params.delete(key)
    }
  }

  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
  parsed.search = sorted.length > 0 ? `?${new URLSearchParams(sorted).toString()}` : ''

  if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1)
  }

  return parsed.toString()
}

export function resolveArticleUrl(link: string, feedUrl: string): string | null {
  try {
    const absolute = new URL(link, feedUrl).toString()
    return canonicalizeUrl(absolute)
  } catch {
    return null
  }
}
