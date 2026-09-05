import { TELEGRAM_MAX_MESSAGE_LENGTH } from './types.ts'

export function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[])/g, '\\$1')
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

export function splitTelegramMessage(
  text: string,
  maxLength = TELEGRAM_MAX_MESSAGE_LENGTH,
): string[] {
  if (text.length <= maxLength) return [text]

  const chunks: string[] = []
  const paragraphs = text.split('\n\n')
  let current = ''

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph

    if (candidate.length <= maxLength) {
      current = candidate
      continue
    }

    if (current) {
      chunks.push(current)
      current = ''
    }

    if (paragraph.length <= maxLength) {
      current = paragraph
      continue
    }

    const lines = paragraph.split('\n')
    for (const line of lines) {
      const lineCandidate = current ? `${current}\n${line}` : line
      if (lineCandidate.length <= maxLength) {
        current = lineCandidate
      } else {
        if (current) chunks.push(current)
        if (line.length <= maxLength) {
          current = line
        } else {
          let remaining = line
          while (remaining.length > maxLength) {
            chunks.push(remaining.slice(0, maxLength))
            remaining = remaining.slice(maxLength)
          }
          current = remaining
        }
      }
    }
  }

  if (current) chunks.push(current)
  return chunks
}

export function formatArticleAlert(
  article: {
    title: string
    canonical_url: string
    importance_score?: number | null
    relevance_score?: number | null
    what_happened?: string | null
    why_it_matters?: string | null
    developer_impact?: string | null
    one_sentence_takeaway?: string | null
    recommended_action?: string | null
    ai_summary?: string | null
  },
  options?: { emoji?: string; label?: string },
): string {
  const emoji = options?.emoji ?? '📰'
  const label = options?.label ?? 'UPDATE'
  const score = article.relevance_score ?? article.importance_score ?? null

  const keyPoints = [
    article.one_sentence_takeaway,
    article.ai_summary,
  ].filter(Boolean) as string[]

  const sections = [
    `${emoji} *${label}*`,
    '',
    `*${escapeMarkdown(article.title)}*`,
    score !== null ? `🔥 Importance: ${score}/100` : null,
    '',
    article.what_happened ? `*What happened*\n${escapeMarkdown(truncate(article.what_happened, 500))}` : null,
    article.why_it_matters || article.developer_impact
      ? `*Why developers care*\n${escapeMarkdown(truncate(article.why_it_matters ?? article.developer_impact ?? '', 400))}`
      : null,
    keyPoints.length > 0
      ? `*Key points*\n${keyPoints.slice(0, 3).map((point) => `• ${escapeMarkdown(truncate(point, 200))}`).join('\n')}`
      : null,
    article.recommended_action
      ? `*What you should know*\n${escapeMarkdown(truncate(article.recommended_action, 300))}`
      : null,
    '',
    `🔗 [Source](${article.canonical_url})`,
  ].filter((section) => section !== null)

  return sections.join('\n')
}

export function formatArticleList(
  articles: Array<{ title: string; canonical_url: string; relevance_score?: number | null; importance_score?: number | null }>,
  heading: string,
): string {
  if (articles.length === 0) {
    return `${heading}\n\nNo articles found right now. Check back after the next ingestion cycle.`
  }

  const lines = articles.map((article, index) => {
    const score = article.relevance_score ?? article.importance_score
    const scoreText = score !== null && score !== undefined ? ` (${score}/100)` : ''
    return `${index + 1}. [${escapeMarkdown(truncate(article.title, 80))}](${article.canonical_url})${scoreText}`
  })

  return `${heading}\n\n${lines.join('\n')}`
}

export function formatHelp(): string {
  return `*Nexora Bot Commands*

*Digests*
/today — Today's important updates
/latest — Latest high-relevance articles
/weekly — Weekly digest

*Categories*
/ai /dev /cloud /security /tools

*Intelligence*
/ask <question> — Ask anything
/brief <topic> — Quick brief
/compare <a> <b> — Compare technologies
/care <tech> — Who should care
/changes <tech> — Recent changes
/learn <topic> [beginner|advanced] — Learning guide

*Account*
/saved — Saved articles
/settings — Preferences
/status — Account status
/quiet — Quiet hours

You can also send normal messages like:
"What happened in AI today?"
"Should I learn Rust?"`
}
