import type { ArticleContext, ArticleScores, NoiseFilterResult, SourceContext } from './types.ts'

const CLICKBAIT_PATTERNS = [
  /you won'?t believe/i,
  /shocking/i,
  /mind[- ]?blowing/i,
  /what happened next/i,
  /\d+\s+reasons why/i,
  /celebrity/i,
  /kardashian/i,
  /taylor swift/i,
]

const AI_HYPE_PATTERNS = [
  /ai (is|will) (change|revolutionize|transform) everything/i,
  /game[- ]?changer/i,
  /the future of everything/i,
  /ai hype/i,
]

const CONSUMER_GADGET_PATTERNS = [
  /smartwatch/i,
  /iphone case/i,
  /wireless earbuds/i,
  /fitness tracker/i,
  /smart home gadget/i,
  /consumer electronics/i,
]

const MINOR_RELEASE_PATTERNS = [
  /\bv?\d+\.\d+\.\d+\s*(patch|hotfix)\b/i,
  /\bpatch release\b/i,
  /\bbug[- ]?fix(?:es)? only\b/i,
  /\bminor (?:npm |package )?update\b/i,
]

const SECURITY_CRITICAL_PATTERNS = [
  /\bcve-\d{4}-\d+/i,
  /\bcritical (?:security )?vulnerabilit/i,
  /\bremote code execution\b/i,
  /\bzero[- ]?day\b/i,
  /\bactively exploited\b/i,
  /\blog4j\b/i,
]

const MAJOR_RELEASE_PATTERNS = [
  /\bmajor (?:version |release )?\d+/i,
  /\bnext\.js\s+\d+/i,
  /\breact\s+\d+/i,
  /\btypescript\s+\d+/i,
  /\bnode\.js\s+\d+/i,
  /\bgpt-\d/i,
  /\bclaude\s+\d/i,
  /\blatest (?:ai )?model\b/i,
  /\bplatform(?:-wide)? change\b/i,
]

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

function buildSearchText(article: ArticleContext): string {
  return [article.title, article.whatHappened, article.aiSummary, article.tags.join(' ')]
    .filter(Boolean)
    .join(' ')
}

export function isCriticalSecurityIssue(article: ArticleContext, scores: ArticleScores): boolean {
  const text = buildSearchText(article)
  const securityCategory = article.category === 'Security'
  const highUrgency = scores.urgency >= 85

  return (
    (securityCategory && highUrgency) ||
    matchesAny(text, SECURITY_CRITICAL_PATTERNS)
  )
}

export function isMajorRelease(article: ArticleContext, scores: ArticleScores): boolean {
  const text = buildSearchText(article)
  const highImportance = scores.importance >= 75
  const highNovelty = scores.novelty >= 70

  return matchesAny(text, MAJOR_RELEASE_PATTERNS) && (highImportance || highNovelty)
}

export function isMajorAiModelRelease(article: ArticleContext, scores: ArticleScores): boolean {
  const text = buildSearchText(article)
  const aiCategory = article.category === 'AI'
  const modelKeywords = /\b(model|gpt|claude|gemini|llama)\b/i.test(text)

  return aiCategory && modelKeywords && scores.importance >= 80 && scores.novelty >= 75
}

export function applyNoiseFilter(
  article: ArticleContext,
  scores: ArticleScores,
  source: SourceContext,
): NoiseFilterResult {
  const text = buildSearchText(article)
  const reasons: string[] = []
  let penalty = 0

  if (isCriticalSecurityIssue(article, scores)) {
    return { isNoise: false, penalty: 0, reasons: [], bypassed: true, exception: 'critical_security' }
  }

  if (isMajorAiModelRelease(article, scores)) {
    return { isNoise: false, penalty: 0, reasons: [], bypassed: true, exception: 'major_ai_release' }
  }

  if (isMajorRelease(article, scores)) {
    return { isNoise: false, penalty: 0, reasons: [], bypassed: true, exception: 'major_release' }
  }

  if (article.isDuplicate || article.clusterKey) {
    if (article.isDuplicate) {
      reasons.push('duplicate_announcement')
      penalty += 25
    }
  }

  if (matchesAny(text, CLICKBAIT_PATTERNS)) {
    reasons.push('clickbait')
    penalty += 30
  }

  if (matchesAny(text, AI_HYPE_PATTERNS) && scores.confidence < 60) {
    reasons.push('generic_ai_hype')
    penalty += 20
  }

  if (matchesAny(text, CONSUMER_GADGET_PATTERNS) && scores.developerRelevance < 40) {
    reasons.push('consumer_gadget')
    penalty += 35
  }

  if (matchesAny(text, MINOR_RELEASE_PATTERNS) || (scores.importance < 30 && scores.novelty < 25)) {
    reasons.push('minor_release')
    penalty += 30
  }

  if (
    article.verificationStatus === 'unverified' &&
    source.trustTier === 'unknown' &&
    scores.confidence < 50
  ) {
    reasons.push('unverified_rumor')
    penalty += 25
  }

  if (scores.developerRelevance < 25 && scores.importance < 35) {
    reasons.push('low_value_content')
    penalty += 20
  }

  const isNoise = penalty >= 30
  return { isNoise, penalty, reasons, bypassed: false }
}
