import { escapeMarkdown, truncate } from '../telegram/format.ts'
import type { DigestArticle } from './types.ts'
import {
  CATEGORY_SECTIONS,
  MAX_MEETING_TOPICS,
  MAX_MUST_KNOW,
  MAX_SECTION_ITEMS,
  MIN_MUST_KNOW_RELEVANCE,
} from './types.ts'
import {
  articleScore,
  extractMeetingTopics,
  filterMeaningfulArticles,
  pickLearningTopic,
  selectByCategory,
} from './article-selection.ts'

function formatArticleLine(article: DigestArticle): string {
  const score = articleScore(article)
  const summary = article.one_sentence_takeaway ?? article.ai_summary ?? article.what_happened ?? ''
  const scoreText = score > 0 ? ` (${score}/100)` : ''
  return `• *${escapeMarkdown(truncate(article.title, 90))}*${scoreText}\n  ${escapeMarkdown(truncate(summary, 160))}\n  [Source](${article.canonical_url})`
}

function formatSection(emoji: string, label: string, articles: DigestArticle[]): string | null {
  if (articles.length === 0) return null
  const lines = articles.map(formatArticleLine)
  return `${emoji} *${label}*\n${lines.join('\n')}`
}

export function formatMorningDigest(articles: DigestArticle[]): string | null {
  const meaningful = filterMeaningfulArticles(articles)
  if (meaningful.length === 0) return null

  const mustKnow = meaningful
    .filter((article) => articleScore(article) >= MIN_MUST_KNOW_RELEVANCE)
    .slice(0, MAX_MUST_KNOW)

  if (mustKnow.length === 0) return null

  const sections = [
    '⚡ *NEXORA DAILY*',
    '',
    '🔥 *MUST KNOW*',
    mustKnow.map(formatArticleLine).join('\n'),
  ]

  for (const [category, config] of Object.entries(CATEGORY_SECTIONS)) {
    const section = formatSection(
      config.emoji,
      config.label,
      selectByCategory(meaningful, category, MAX_SECTION_ITEMS),
    )
    if (section) sections.push('', section)
  }

  const learnTopic = pickLearningTopic(meaningful)
  if (learnTopic) {
    sections.push('', '🧠 *ONE THING TO LEARN*', escapeMarkdown(truncate(learnTopic, 300)))
  }

  const meetingTopics = extractMeetingTopics(meaningful, MAX_MEETING_TOPICS)
  if (meetingTopics.length > 0) {
    sections.push(
      '',
      '🎯 *MEETING KNOWLEDGE*',
      meetingTopics.map((topic) => `• ${escapeMarkdown(truncate(topic, 120))}`).join('\n'),
    )
  }

  return sections.join('\n')
}

export function formatEveningDigest(articles: DigestArticle[]): string | null {
  const meaningful = filterMeaningfulArticles(articles)
  if (meaningful.length === 0) return null

  const lines = meaningful.slice(0, 5).map(formatArticleLine)
  return ['🌙 *NEXORA EVENING UPDATE*', '', 'Developments since this morning:', '', ...lines].join('\n')
}

export function formatWeeklyDigest(articles: DigestArticle[]): string | null {
  const meaningful = filterMeaningfulArticles(articles, 50)
  if (meaningful.length === 0) return null

  const sections = [
    '📆 *NEXORA WEEKLY*',
    '',
    '*Biggest developments*',
    meaningful.slice(0, 5).map(formatArticleLine).join('\n'),
  ]

  for (const [category, config] of Object.entries(CATEGORY_SECTIONS)) {
    const section = formatSection(
      config.emoji,
      config.label,
      selectByCategory(meaningful, category, 4),
    )
    if (section) sections.push('', section)
  }

  const momentum = meaningful
    .sort((a, b) => (b.novelty_score ?? 0) - (a.novelty_score ?? 0))
    .slice(0, 3)
    .map((article) => `• ${escapeMarkdown(article.tags[0] ?? article.title)}`)
  if (momentum.length > 0) {
    sections.push('', '*Technologies gaining momentum*', momentum.join('\n'))
  }

  const learnTopic = pickLearningTopic(meaningful)
  if (learnTopic) {
    sections.push('', '*Worth learning*', escapeMarkdown(truncate(learnTopic, 300)))
  }

  const lowValue = meaningful.filter((article) => articleScore(article) < 60).slice(0, 3)
  if (lowValue.length > 0) {
    sections.push(
      '',
      '*Can ignore*',
      lowValue.map((article) => `• ${escapeMarkdown(truncate(article.title, 80))}`).join('\n'),
    )
  }

  sections.push('', '*What changed this week?*')
  sections.push(
    escapeMarkdown(
      truncate(
        meaningful
          .slice(0, 6)
          .map((article) => article.one_sentence_takeaway ?? article.ai_summary ?? article.title)
          .join(' '),
        500,
      ),
    ),
  )

  return sections.join('\n')
}

export function formatBreakingAlert(article: DigestArticle): string {
  const score = articleScore(article)
  return [
    '🚨 *BREAKING ALERT*',
    '',
    `*${escapeMarkdown(article.title)}*`,
    score > 0 ? `🔥 Importance: ${score}/100` : null,
    '',
    article.what_happened
      ? `*What happened*\n${escapeMarkdown(truncate(article.what_happened, 400))}`
      : null,
    article.why_it_matters
      ? `*Why developers care*\n${escapeMarkdown(truncate(article.why_it_matters, 300))}`
      : null,
    article.recommended_action
      ? `*What you should know*\n${escapeMarkdown(truncate(article.recommended_action, 250))}`
      : null,
    '',
    `🔗 [Source](${article.canonical_url})`,
  ]
    .filter((line) => line !== null)
    .join('\n')
}
