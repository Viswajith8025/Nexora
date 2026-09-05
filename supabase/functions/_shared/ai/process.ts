import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIProvider } from './types.ts'
import { AI_LIMITS } from './types.ts'
import type { GroqProvider } from './groq-provider.ts'
import { processSingleArticle, type ArticleRecord } from './analyzer.ts'

const JOB_NAME = 'process-articles'

export type ProcessArticlesResult = {
  cronRunId: string
  batchSize: number
  processed: number
  succeeded: number
  failed: number
  skipped: number
  results: Array<{ articleId: string; success: boolean; error?: string }>
  durationMs: number
}

function resolveBatchSize(env: Record<string, string | undefined>): number {
  const raw = Number(env.PROCESS_BATCH_SIZE ?? AI_LIMITS.defaultBatchSize)
  if (!Number.isFinite(raw) || raw < 1) return AI_LIMITS.defaultBatchSize
  return Math.min(Math.floor(raw), AI_LIMITS.maxBatchSize)
}

export async function loadUnprocessedArticles(
  supabase: SupabaseClient,
  limit: number,
): Promise<ArticleRecord[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, canonical_url, raw_excerpt, author, category, tags, processing_status')
    .eq('processing_status', 'discovered')
    .order('discovered_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to load articles: ${error.message}`)
  return (data ?? []) as ArticleRecord[]
}

export async function runArticleProcessing(
  supabase: SupabaseClient,
  provider: AIProvider & Partial<GroqProvider>,
  env: Record<string, string | undefined> = {},
): Promise<ProcessArticlesResult> {
  const started = Date.now()
  const batchSize = resolveBatchSize(env)

  const { data: cronRun, error: cronError } = await supabase
    .from('cron_runs')
    .insert({ job_name: JOB_NAME, status: 'running' })
    .select('id')
    .single()

  if (cronError || !cronRun) {
    throw new Error(`Failed to create cron run: ${cronError?.message ?? 'unknown'}`)
  }

  const articles = await loadUnprocessedArticles(supabase, batchSize)
  const results: ProcessArticlesResult['results'] = []
  let succeeded = 0
  let failed = 0

  for (const article of articles) {
    try {
      const result = await processSingleArticle(supabase, provider, article)
      results.push(result)
      if (result.success) succeeded++
      else failed++
    } catch (error) {
      failed++
      results.push({
        articleId: article.id,
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
      })
    }
  }

  const durationMs = Date.now() - started
  const status = failed > 0 && succeeded === 0 ? 'failed' : 'completed'

  await supabase
    .from('cron_runs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      items_processed: succeeded,
      error: failed > 0 ? `${failed} article(s) failed processing` : null,
      metadata: { results, batchSize },
    })
    .eq('id', cronRun.id)

  return {
    cronRunId: cronRun.id,
    batchSize,
    processed: articles.length,
    succeeded,
    failed,
    skipped: 0,
    results,
    durationMs,
  }
}
