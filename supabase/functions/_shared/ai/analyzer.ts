import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIProvider, AIProviderName } from './types.ts'
import { AI_LIMITS } from './types.ts'
import { parseArticleAnalysis } from './schema.ts'
import type { ArticleAnalysis } from './schema.ts'
import { SYSTEM_PROMPT, articleToDbUpdate, buildAnalysisPrompt } from './prompts.ts'
import { recordAIGeneration } from './tracker.ts'

export type ArticleRecord = {
  id: string
  title: string
  canonical_url: string
  raw_excerpt: string | null
  author: string | null
  category: string | null
  tags: string[]
  processing_status: string
}

export type AnalyzeResult =
  | {
      success: true
      analysis: ArticleAnalysis
      provider: AIProviderName
      model: string
      usage?: { promptTokens: number; completionTokens: number }
    }
  | { success: false; error: string; provider?: AIProviderName; model?: string }

export async function analyzeArticle(
  provider: AIProvider,
  article: ArticleRecord,
): Promise<AnalyzeResult> {
  const model = provider.getModelForTask('summary')

  let lastError = 'Unknown analysis error'
  let lastProvider: AIProviderName = provider.name
  let lastModel = model

  for (let attempt = 0; attempt <= AI_LIMITS.maxRetries; attempt++) {
    const strict = attempt > 0

    try {
      const response = await provider.complete({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildAnalysisPrompt(article, strict) },
        ],
        temperature: strict ? 0.1 : 0.2,
        maxTokens: 2048,
        responseFormat: 'json',
      })

      lastProvider = response.provider
      lastModel = response.model

      const parsed = parseArticleAnalysis(response.content)
      if (parsed.success) {
        return {
          success: true,
          analysis: parsed.data,
          provider: response.provider,
          model: response.model,
          usage: response.usage
            ? {
                promptTokens: response.usage.promptTokens,
                completionTokens: response.usage.completionTokens,
              }
            : undefined,
        }
      }

      lastError = parsed.error
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'AI request failed'
      break
    }
  }

  return { success: false, error: lastError, provider: lastProvider, model: lastModel }
}

export async function processSingleArticle(
  supabase: SupabaseClient,
  provider: AIProvider,
  article: ArticleRecord,
): Promise<{ articleId: string; success: boolean; error?: string }> {
  const started = Date.now()

  await supabase
    .from('articles')
    .update({ processing_status: 'processing' })
    .eq('id', article.id)
    .eq('processing_status', 'discovered')

  const result = await analyzeArticle(provider, article)
  const durationMs = Date.now() - started
  const providerName = result.provider ?? provider.name
  const model = result.model ?? provider.getModelForTask('summary')

  if (!result.success) {
    await supabase
      .from('articles')
      .update({ processing_status: 'failed' })
      .eq('id', article.id)

    await recordAIGeneration(supabase, {
      provider: providerName,
      model,
      task: 'article_analysis',
      articleId: article.id,
      durationMs,
      status: 'failure',
      error: result.error,
    })

    return { articleId: article.id, success: false, error: result.error }
  }

  const { error: updateError } = await supabase
    .from('articles')
    .update(articleToDbUpdate(result.analysis))
    .eq('id', article.id)

  if (updateError) {
    await supabase
      .from('articles')
      .update({ processing_status: 'failed' })
      .eq('id', article.id)

    await recordAIGeneration(supabase, {
      provider: providerName,
      model,
      task: 'article_analysis',
      articleId: article.id,
      durationMs,
      status: 'failure',
      error: updateError.message,
    })

    return { articleId: article.id, success: false, error: updateError.message }
  }

  await recordAIGeneration(supabase, {
    provider: providerName,
    model,
    task: 'article_analysis',
    articleId: article.id,
    inputTokens: result.usage?.promptTokens,
    outputTokens: result.usage?.completionTokens,
    durationMs,
    status: 'success',
  })

  return { articleId: article.id, success: true }
}
