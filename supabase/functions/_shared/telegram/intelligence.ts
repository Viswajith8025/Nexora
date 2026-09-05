import type { AIProvider } from '../ai/types.ts'
import type { ArticleSummary } from './types.ts'
import { escapeMarkdown, truncate } from './format.ts'
import { buildIntelligencePrompt, INTELLIGENCE_SYSTEM_PROMPT } from './learning-intelligence/prompts.ts'
import type { IntelligenceTask } from './learning-intelligence/prompts.ts'
import { parseIntelligenceResponse } from './learning-intelligence/schema.ts'
import { formatIntelligenceResponse } from './learning-intelligence/format.ts'
import type { LearnLevel } from './learning-intelligence/parse.ts'

function buildArticleContext(articles: ArticleSummary[]): string {
  if (articles.length === 0) return 'No recent articles available in Nexora feed.'

  return articles
    .map((article, index) => {
      return [
        `[${index + 1}] ${article.title}`,
        article.category ? `Category: ${article.category}` : null,
        article.published_at ? `Published: ${article.published_at}` : null,
        article.what_happened ? `What happened: ${article.what_happened}` : null,
        article.ai_summary ? `Summary: ${article.ai_summary}` : null,
        article.one_sentence_takeaway ? `Takeaway: ${article.one_sentence_takeaway}` : null,
        article.developer_impact ? `Developer impact: ${article.developer_impact}` : null,
        `URL: ${article.canonical_url}`,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')
}

export type IntelligenceOptions = {
  topic?: string
  compareA?: string
  compareB?: string
  level?: LearnLevel
  memoryNote?: string
}

export async function generateIntelligenceResponse(
  provider: AIProvider,
  task: IntelligenceTask | 'ask',
  query: string,
  articles: ArticleSummary[],
  options?: IntelligenceOptions,
): Promise<string> {
  if (task === 'ask') {
    return generateAskResponse(provider, query, articles)
  }

  const topic = options?.topic ?? query
  const articleContext = buildArticleContext(articles)
  const prompt = buildIntelligencePrompt(task, {
    topic,
    compareA: options?.compareA,
    compareB: options?.compareB,
    level: options?.level,
    memoryNote: options?.memoryNote,
    articleContext,
  })

  const response = await provider.complete({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: INTELLIGENCE_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.25,
    maxTokens: 2500,
    responseFormat: 'json',
  })

  try {
    const parsed = parseIntelligenceResponse(response.content)
    const formatted = formatIntelligenceResponse(task, parsed)
    return escapeMarkdown(truncate(formatted, 3800))
  } catch {
    return escapeMarkdown(truncate(response.content, 3500))
  }
}

async function generateAskResponse(
  provider: AIProvider,
  query: string,
  articles: ArticleSummary[],
): Promise<string> {
  const articleContext = buildArticleContext(articles)
  const response = await provider.complete({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content:
          'You are Nexora. Answer developer questions concisely. Label any opinion as opinion. Do not invent news.',
      },
      {
        role: 'user',
        content: `Question: ${query}\n\n<article_context>\n${articleContext}\n</article_context>`,
      },
    ],
    temperature: 0.3,
    maxTokens: 800,
  })

  return escapeMarkdown(truncate(response.content, 3500))
}
