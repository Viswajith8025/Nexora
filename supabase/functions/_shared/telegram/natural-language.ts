export type NaturalLanguageIntent =
  | 'today_digest'
  | 'latest'
  | 'category_ai'
  | 'category_dev'
  | 'category_cloud'
  | 'category_security'
  | 'category_tools'
  | 'explain_topic'
  | 'should_learn'
  | 'care'
  | 'compare'
  | 'changes'
  | 'weekly'
  | 'ask'
  | 'help'
  | 'unknown'

export type NaturalLanguageRoute = {
  intent: NaturalLanguageIntent
  topic?: string
  compareA?: string
  compareB?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  query: string
}

const TODAY_PATTERNS = [
  /what happened in .+ today/i,
  /important (developer )?updates today/i,
  /what(?:'s| is) new today/i,
  /today(?:'s)? (?:ai|dev|developer|tech)/i,
]

const LATEST_PATTERNS = [/what(?:'s| is) the latest/i, /latest (?:news|updates)/i, /recent updates/i]

const EXPLAIN_PATTERNS = [/^explain\s+/i, /^what is\s+/i, /^what are\s+/i, /^tell me about\s+/i]

const LEARN_PATTERNS = [/should i learn/i, /worth learning/i, /is .+ worth/i]

const COMPARE_PATTERNS = [/compare .+ (?:vs|versus|and|with|to) /i, /.+ vs .+/i]

const CHANGES_PATTERNS = [/what(?:'s| is) new with/i, /changes (?:in|to|for)/i, /recent changes/i]

const CARE_PATTERNS = [/who should care about/i, /should i care about/i, /is .+ relevant for/i]

const MEETING_PATTERNS = [/meeting prep for/i, /talking points for/i, /brief me on/i]

export function routeNaturalLanguage(text: string): NaturalLanguageRoute {
  const query = text.trim()
  const lower = query.toLowerCase()

  if (!query) return { intent: 'help', query }

  if (TODAY_PATTERNS.some((pattern) => pattern.test(query))) {
    const category = extractCategory(lower)
    if (category === 'ai') return { intent: 'category_ai', query }
    return { intent: 'today_digest', query }
  }

  if (LATEST_PATTERNS.some((pattern) => pattern.test(query))) {
    return { intent: 'latest', query }
  }

  if (lower.includes('ai') && (lower.includes('today') || lower.includes('happened'))) {
    return { intent: 'category_ai', query }
  }

  if (lower.includes('next.js') || lower.includes('nextjs')) {
    if (CHANGES_PATTERNS.some((pattern) => pattern.test(query))) {
      return { intent: 'changes', topic: 'Next.js', query }
    }
  }

  if (COMPARE_PATTERNS.some((pattern) => pattern.test(query))) {
    const match = query.match(/compare\s+(.+?)\s+(?:vs|versus|and|with|to)\s+(.+)/i)
    if (match?.[1] && match[2]) {
      return { intent: 'compare', compareA: match[1].trim(), compareB: match[2].trim(), query }
    }
  }

  if (LEARN_PATTERNS.some((pattern) => pattern.test(query))) {
    const topic = query
      .replace(/should i learn\s*/i, '')
      .replace(/worth learning\s*/i, '')
      .replace(/^is\s+/i, '')
      .replace(/\s+worth\??$/i, '')
      .replace(/\?$/, '')
      .trim()
    const level = lower.includes('advanced')
      ? 'advanced'
      : lower.includes('beginner')
        ? 'beginner'
        : 'intermediate'
    return { intent: 'should_learn', topic, level, query }
  }

  if (CARE_PATTERNS.some((pattern) => pattern.test(query))) {
    const topic = query
      .replace(/who should care about\s*/i, '')
      .replace(/should i care about\s*/i, '')
      .replace(/is\s+/i, '')
      .replace(/\s+relevant for.*$/i, '')
      .replace(/\?$/, '')
      .trim()
    return { intent: 'care', topic, query }
  }

  if (MEETING_PATTERNS.some((pattern) => pattern.test(query))) {
    const topic = query
      .replace(/meeting prep for\s*/i, '')
      .replace(/talking points for\s*/i, '')
      .replace(/brief me on\s*/i, '')
      .replace(/\?$/, '')
      .trim()
    return { intent: 'explain_topic', topic, query }
  }

  if (CHANGES_PATTERNS.some((pattern) => pattern.test(query))) {
    const topic = query
      .replace(/what(?:'s| is) new with\s*/i, '')
      .replace(/changes (?:in|to|for)\s*/i, '')
      .replace(/\?$/, '')
      .trim()
    return { intent: 'changes', topic, query }
  }

  if (EXPLAIN_PATTERNS.some((pattern) => pattern.test(query))) {
    const topic = query
      .replace(/^explain\s*/i, '')
      .replace(/^what is\s*/i, '')
      .replace(/^what are\s*/i, '')
      .replace(/^tell me about\s*/i, '')
      .replace(/\?$/, '')
      .trim()
    return { intent: 'explain_topic', topic, query }
  }

  if (lower.includes('weekly') || lower.includes('this week')) {
    return { intent: 'weekly', query }
  }

  if (extractCategory(lower)) {
    const category = extractCategory(lower)
    if (category === 'ai') return { intent: 'category_ai', query }
    if (category === 'dev') return { intent: 'category_dev', query }
    if (category === 'cloud') return { intent: 'category_cloud', query }
    if (category === 'security') return { intent: 'category_security', query }
    if (category === 'tools') return { intent: 'category_tools', query }
  }

  return { intent: 'ask', query }
}

function extractCategory(text: string): 'ai' | 'dev' | 'cloud' | 'security' | 'tools' | null {
  if (/\bai\b/.test(text) || text.includes('artificial intelligence')) return 'ai'
  if (text.includes('developer') || text.includes('development') || text.includes('programming')) {
    return 'dev'
  }
  if (text.includes('cloud') || text.includes('aws') || text.includes('azure')) return 'cloud'
  if (text.includes('security') || text.includes('cve') || text.includes('vulnerability')) {
    return 'security'
  }
  if (text.includes('tools') || text.includes('devtools')) return 'tools'
  return null
}
