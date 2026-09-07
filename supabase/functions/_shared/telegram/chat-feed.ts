import type { ArticleSummary } from './types.ts'

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'about',
  'did',
  'do',
  'for',
  'from',
  'had',
  'has',
  'have',
  'how',
  'i',
  'im',
  'in',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'released',
  'release',
  'the',
  'to',
  'was',
  'what',
  'when',
  'where',
  'who',
  'why',
  'with',
  'you',
  'your',
  'talking',
])

const GREETING_PATTERNS = [
  /^(hi|hello|hey|yo|sup|good (morning|afternoon|evening)|howdy)\b/i,
  /^who are you\b/i,
  /^what are you\b/i,
]

export function extractSearchTerms(query: string): string[] {
  const seen = new Set<string>()
  const terms: string[] = []

  for (const raw of query.toLowerCase().split(/[^\w.-]+/)) {
    const term = raw.replace(/^\.+/, '').replace(/\.+$/, '')
    if (term.length < 3 || STOP_WORDS.has(term) || seen.has(term)) continue
    seen.add(term)
    terms.push(term)
  }

  return terms
}

export function isCasualMessage(query: string): boolean {
  const trimmed = query.trim()
  if (!trimmed) return true
  return GREETING_PATTERNS.some((pattern) => pattern.test(trimmed))
}

function articleHaystack(article: ArticleSummary): string {
  return [article.title, article.ai_summary, article.what_happened, ...(article.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function articlesRelevantToQuery(query: string, articles: ArticleSummary[]): boolean {
  if (articles.length === 0) return false
  if (isCasualMessage(query)) return false

  const terms = extractSearchTerms(query)
  if (terms.length === 0) return false

  const haystacks = articles.map(articleHaystack)
  const matched = terms.filter((term) => haystacks.some((haystack) => haystack.includes(term)))

  if (terms.length === 1) return matched.length === 1
  return matched.length >= Math.min(terms.length, 2)
}

export function buildFeedGuidance(query: string, articles: ArticleSummary[]): string {
  if (isCasualMessage(query)) {
    return 'This is casual conversation. Be warm and personal. Mention your feed only if it naturally helps.'
  }

  if (articles.length === 0) {
    return 'No articles are in context right now. Answer fully from general knowledge. If the topic is news, note your answer may not include today\'s headlines.'
  }

  if (articlesRelevantToQuery(query, articles)) {
    return 'article_context likely contains relevant stories. Lead with those when they help, then add broader context.'
  }

  return 'article_context may not match this question. Answer freely from general knowledge. Optionally add one line if their feed has related stories, or suggest /latest.'
}
