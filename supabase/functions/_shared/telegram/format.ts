import { TELEGRAM_MAX_MESSAGE_LENGTH } from './types.ts'
import type { TelegramInlineKeyboard, TelegramOutboundMessage } from './types.ts'
import { emptyFeedKeyboard, articleSourceKeyboard, mainMenuKeyboard } from './keyboards.ts'

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** @deprecated Use escapeHtml — legacy Markdown helper kept for digest notifications */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[])/g, '\\$1')
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

export function formatPlainToHtml(text: string): string {
  const escaped = escapeHtml(text.trim())

  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<b>$1</b>')
    .replace(/^[-•] (.+)$/gm, '• $1')
    .replace(/\n{3,}/g, '\n\n')
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

export function toOutboundMessages(
  text: string,
  options?: { keyboard?: TelegramInlineKeyboard; disableWebPagePreview?: boolean },
): TelegramOutboundMessage[] {
  const chunks = splitTelegramMessage(text)
  return chunks.map((chunk, index) => ({
    text: chunk,
    keyboard: index === chunks.length - 1 ? options?.keyboard : undefined,
    disableWebPagePreview: options?.disableWebPagePreview,
  }))
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
): TelegramOutboundMessage {
  const emoji = options?.emoji ?? '📰'
  const label = options?.label ?? 'UPDATE'
  const score = article.relevance_score ?? article.importance_score ?? null

  const keyPoints = [article.one_sentence_takeaway, article.ai_summary].filter(Boolean) as string[]

  const sections = [
    `${emoji} <b>${escapeHtml(label)}</b>`,
    '',
    `<b>${escapeHtml(article.title)}</b>`,
    score !== null ? `🔥 Relevance: <b>${score}/100</b>` : null,
    '',
    article.what_happened
      ? `<b>What happened</b>\n${escapeHtml(truncate(article.what_happened, 500))}`
      : null,
    article.why_it_matters || article.developer_impact
      ? `<b>Why developers care</b>\n${escapeHtml(truncate(article.why_it_matters ?? article.developer_impact ?? '', 400))}`
      : null,
    keyPoints.length > 0
      ? `<b>Key points</b>\n${keyPoints
          .slice(0, 3)
          .map((point) => `• ${escapeHtml(truncate(point, 200))}`)
          .join('\n')}`
      : null,
    article.recommended_action
      ? `<b>What you should know</b>\n${escapeHtml(truncate(article.recommended_action, 300))}`
      : null,
  ].filter((section) => section !== null)

  return {
    text: sections.join('\n'),
    keyboard: articleSourceKeyboard(article.canonical_url),
    disableWebPagePreview: true,
  }
}

export function formatArticleList(
  articles: Array<{
    title: string
    canonical_url: string
    relevance_score?: number | null
    importance_score?: number | null
  }>,
  heading: string,
): TelegramOutboundMessage {
  if (articles.length === 0) {
    return {
      text: `${heading}

No fresh articles in your feed yet — ingestion may still be running.

💡 <i>Tip:</i> Ask me anything directly! I can explain tech topics even without articles in the feed.`,
      keyboard: emptyFeedKeyboard(),
    }
  }

  const lines = articles.map((article, index) => {
    const score = article.relevance_score ?? article.importance_score
    const scoreText = score !== null && score !== undefined ? ` · <b>${score}</b>/100` : ''
    return `${index + 1}. <a href="${article.canonical_url}">${escapeHtml(truncate(article.title, 80))}</a>${scoreText}`
  })

  return {
    text: `${heading}\n\n${lines.join('\n')}`,
    keyboard: mainMenuKeyboard(),
    disableWebPagePreview: true,
  }
}

export function formatHelp(): string {
  return `<b>Nexora — your dev intelligence assistant</b>

<b>💬 Just chat</b>
Send any message — tech, companies, career, news, or casual conversation. I answer from general knowledge and your ingested feed when relevant.

/clear — Start a fresh conversation

<b>📬 Digests</b>
/today — Today's important updates
/latest — Latest high-relevance articles
/weekly — Weekly digest

<b>📂 Categories</b>
/ai /dev /cloud /security /tools

<b>🔍 Deep dives</b>
/brief &lt;topic&gt; — Quick brief
/compare &lt;a&gt; &lt;b&gt; — Compare technologies
/care &lt;tech&gt; — Who should care
/changes &lt;tech&gt; — Recent changes
/learn &lt;topic&gt; — Learning guide

<b>⚙️ Account</b>
/saved — Saved articles
/settings — Preferences
/status — Account status

<i>Try: "What happened in AI today?" or "Explain MCP simply"</i>`
}

export function formatWelcome(): TelegramOutboundMessage {
  return {
    text: `👋 <b>Welcome to Nexora</b>

Your personal technology intelligence assistant for developers.

<b>Get started</b>
1. Open Nexora Settings in the app
2. Generate a Telegram link token
3. Send <code>/start &lt;token&gt;</code>

Or just ask me anything — no commands needed!`,
    keyboard: mainMenuKeyboard(),
  }
}

export function formatLinkedWelcome(): TelegramOutboundMessage {
  return {
    text: `✅ <b>Account linked!</b>

You're all set. I can send digests, answer questions, and remember our chat.

Tap a button below or just type a message.`,
    keyboard: mainMenuKeyboard(),
  }
}
