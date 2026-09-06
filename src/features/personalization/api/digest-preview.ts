import { fetchArticles } from '@/features/articles/api/articles'

export async function previewMorningDigest(threshold: number): Promise<string> {
  const { articles } = await fetchArticles({ pageSize: 50, minRelevance: threshold })

  if (articles.length === 0) {
    return `No articles would meet your threshold (${String(threshold)}) right now.

Try lowering the notification threshold or wait for the next ingestion cycle.`
  }

  const mustKnow = articles.filter((a) => (a.relevance_score ?? 0) >= Math.max(threshold, 70)).slice(0, 5)
  const sections = mustKnow.length > 0 ? mustKnow : articles.slice(0, 5)

  const lines = sections.map((article, index) => {
    const score = article.relevance_score ?? article.importance_score ?? '—'
    const summary = article.one_sentence_takeaway ?? article.ai_summary ?? article.what_happened ?? ''
    return `${String(index + 1)}. ${article.title} (${String(score)}/100)\n   ${summary}`
  })

  return `Morning digest preview · threshold ${String(threshold)}\n\n${lines.join('\n\n')}`
}
