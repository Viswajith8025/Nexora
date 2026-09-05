import type { DigestArticle } from './types.ts'
import type { ArticleContext, ArticleScores } from '../relevance/types.ts'
import {
  isCriticalSecurityIssue,
  isMajorAiModelRelease,
  isMajorRelease,
} from '../relevance/noise-filter.ts'

const OUTAGE_PATTERNS = [
  /\bmajor outage\b/i,
  /\bplatform(?:-wide)? outage\b/i,
  /\bservice disruption\b/i,
  /\baws outage\b/i,
  /\bcloudflare outage\b/i,
]

function toArticleContext(article: DigestArticle): ArticleContext {
  return {
    id: article.id,
    title: article.title,
    category: article.category,
    tags: article.tags,
    verificationStatus: 'verified',
    whatHappened: article.what_happened,
    aiSummary: article.ai_summary,
    clusterKey: article.cluster_key,
  }
}

function toArticleScores(article: DigestArticle): ArticleScores {
  return {
    importance: article.importance_score ?? 0,
    developerRelevance: article.relevance_score ?? 0,
    urgency: article.importance_score ?? 0,
    novelty: article.novelty_score ?? 0,
    confidence: 80,
  }
}

export function isBreakingArticle(article: DigestArticle): boolean {
  const score = article.relevance_score ?? article.importance_score ?? 0
  if (score < 70 && article.relevance_decision !== 'breaking') return false

  if (article.relevance_decision === 'breaking' && score >= 70) return true

  const context = toArticleContext(article)
  const scores = toArticleScores(article)
  const text = [article.title, article.what_happened, article.ai_summary].filter(Boolean).join(' ')

  if (isCriticalSecurityIssue(context, scores)) return true
  if (isMajorAiModelRelease(context, scores)) return true
  if (isMajorRelease(context, scores)) return true
  if (OUTAGE_PATTERNS.some((pattern) => pattern.test(text))) return true

  return score >= 90
}

export function isCriticalBreaking(article: DigestArticle): boolean {
  const context = toArticleContext(article)
  const scores = toArticleScores(article)
  return isCriticalSecurityIssue(context, scores)
}
