import type { DigestArticle } from './types.ts'
import { MIN_DIGEST_RELEVANCE } from './types.ts'

export function articleScore(article: DigestArticle): number {
  return article.relevance_score ?? article.importance_score ?? 0
}

export function dedupeArticlesByCluster(articles: DigestArticle[]): DigestArticle[] {
  const byCluster = new Map<string, DigestArticle>()

  for (const article of articles) {
    const key = article.cluster_key ?? article.id
    const existing = byCluster.get(key)
    if (!existing || articleScore(article) > articleScore(existing)) {
      byCluster.set(key, article)
    }
  }

  return Array.from(byCluster.values()).sort((a, b) => articleScore(b) - articleScore(a))
}

export function filterMeaningfulArticles(
  articles: DigestArticle[],
  minScore = MIN_DIGEST_RELEVANCE,
): DigestArticle[] {
  return dedupeArticlesByCluster(articles).filter((article) => articleScore(article) >= minScore)
}

export function selectByCategory(
  articles: DigestArticle[],
  category: string,
  limit = 3,
): DigestArticle[] {
  return articles
    .filter((article) => article.category === category)
    .slice(0, limit)
}

export function excludeAlreadySent(
  articles: DigestArticle[],
  sentArticleIds: Set<string>,
): DigestArticle[] {
  return articles.filter((article) => !sentArticleIds.has(article.id))
}

export function hasMeaningfulContent(articles: DigestArticle[]): boolean {
  return filterMeaningfulArticles(articles).length > 0
}

export function extractMeetingTopics(articles: DigestArticle[], limit = 3): string[] {
  const topics = new Set<string>()

  for (const article of articles) {
    if (article.who_should_care) topics.add(article.who_should_care)
    for (const tag of article.tags.slice(0, 2)) {
      topics.add(tag)
    }
    if (topics.size >= limit) break
  }

  return Array.from(topics).slice(0, limit)
}

export function pickLearningTopic(articles: DigestArticle[]): string | null {
  const sorted = [...articles].sort((a, b) => (b.novelty_score ?? 0) - (a.novelty_score ?? 0))
  const candidate = sorted.find((article) => article.one_sentence_takeaway || article.ai_summary)
  return candidate?.one_sentence_takeaway ?? candidate?.ai_summary ?? null
}
