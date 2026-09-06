import type { SupabaseClient } from '@supabase/supabase-js'
import {
  articleRelevanceToDbUpdate,
  evaluateArticleRelevance,
} from './engine.ts'
import type {
  ArticleContext,
  ArticleScores,
  RelevanceInput,
  RelevanceResult,
  SourceContext,
} from './types.ts'

export type ArticleForEvaluation = {
  id: string
  title: string
  category: string | null
  tags: string[]
  verification_status: string
  what_happened: string | null
  ai_summary: string | null
  cluster_key: string | null
  importance_score: number | null
  developer_relevance_score: number | null
  urgency_score: number | null
  confidence_score: number | null
  novelty_score: number | null
  source: {
    name: string
    type: string
    trust_tier: string
    metadata: Record<string, unknown>
  } | null
}

export function toRelevanceInput(article: ArticleForEvaluation): RelevanceInput | null {
  if (
    article.importance_score === null ||
    article.developer_relevance_score === null ||
    article.urgency_score === null ||
    article.confidence_score === null ||
    article.novelty_score === null
  ) {
    return null
  }

  const articleContext: ArticleContext = {
    id: article.id,
    title: article.title,
    category: article.category,
    tags: article.tags,
    verificationStatus: article.verification_status,
    whatHappened: article.what_happened,
    aiSummary: article.ai_summary,
    clusterKey: article.cluster_key,
  }

  const scores: ArticleScores = {
    importance: article.importance_score,
    developerRelevance: article.developer_relevance_score,
    urgency: article.urgency_score,
    novelty: article.novelty_score,
    confidence: article.confidence_score,
  }

  const source: SourceContext = {
    name: article.source?.name ?? 'Unknown',
    type: article.source?.type ?? 'rss',
    trustTier: (article.source?.trust_tier ?? 'unknown') as SourceContext['trustTier'],
    metadata: article.source?.metadata ?? {},
  }

  return { article: articleContext, scores, source }
}

export function evaluateArticleRecord(article: ArticleForEvaluation): RelevanceResult | null {
  const input = toRelevanceInput(article)
  if (!input) return null
  return evaluateArticleRelevance(input)
}

const JOB_NAME = 'evaluate-articles'

export type EvaluateArticlesResult = {
  cronRunId: string
  batchSize: number
  evaluated: number
  published: number
  ignored: number
  failed: number
  results: Array<{ articleId: string; decision?: string; score?: number; error?: string }>
  durationMs: number
}

function resolveBatchSize(env: Record<string, string | undefined>): number {
  const raw = Number(env.EVALUATE_BATCH_SIZE ?? 10)
  if (!Number.isFinite(raw) || raw < 1) return 10
  return Math.min(Math.floor(raw), 25)
}

export async function loadAnalyzedArticles(
  supabase: SupabaseClient,
  limit: number,
): Promise<ArticleForEvaluation[]> {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id,
      title,
      category,
      tags,
      verification_status,
      what_happened,
      ai_summary,
      cluster_key,
      importance_score,
      developer_relevance_score,
      urgency_score,
      confidence_score,
      novelty_score,
      source:sources!articles_source_id_fkey (
        name,
        type,
        trust_tier,
        metadata
      )
    `)
    .eq('processing_status', 'analyzed')
    .is('relevance_decision', null)
    .order('importance_score', { ascending: false, nullsFirst: false })
    .order('discovered_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to load analyzed articles: ${error.message}`)

  return (data ?? []).map((row) => ({
    ...row,
    source: Array.isArray(row.source) ? row.source[0] ?? null : row.source,
  })) as ArticleForEvaluation[]
}

export async function evaluateSingleArticle(
  supabase: SupabaseClient,
  article: ArticleForEvaluation,
): Promise<{ articleId: string; success: boolean; result?: RelevanceResult; error?: string }> {
  const relevance = evaluateArticleRecord(article)
  if (!relevance) {
    return { articleId: article.id, success: false, error: 'Missing AI scores for relevance evaluation' }
  }

  const update = {
    ...articleRelevanceToDbUpdate(relevance),
    processing_status: relevance.decision === 'IGNORE' ? 'archived' : 'published',
  }

  const { error } = await supabase.from('articles').update(update).eq('id', article.id)

  if (error) {
    return { articleId: article.id, success: false, error: error.message }
  }

  return { articleId: article.id, success: true, result: relevance }
}

export async function runArticleEvaluation(
  supabase: SupabaseClient,
  env: Record<string, string | undefined> = {},
): Promise<EvaluateArticlesResult> {
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

  const articles = await loadAnalyzedArticles(supabase, batchSize)
  const results: EvaluateArticlesResult['results'] = []
  let published = 0
  let ignored = 0
  let failed = 0

  for (const article of articles) {
    try {
      const result = await evaluateSingleArticle(supabase, article)
      if (result.success && result.result) {
        if (result.result.decision === 'IGNORE') ignored++
        else published++
        results.push({
          articleId: result.articleId,
          decision: result.result.decision,
          score: result.result.finalScore,
        })
      } else {
        failed++
        results.push({ articleId: result.articleId, error: result.error })
      }
    } catch (error) {
      failed++
      results.push({
        articleId: article.id,
        error: error instanceof Error ? error.message : 'Evaluation failed',
      })
    }
  }

  const durationMs = Date.now() - started
  const status = failed > 0 && published + ignored === 0 ? 'failed' : 'completed'

  await supabase
    .from('cron_runs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      items_processed: published + ignored,
      error: failed > 0 ? `${failed} article(s) failed evaluation` : null,
      metadata: { results, batchSize },
    })
    .eq('id', cronRun.id)

  return {
    cronRunId: cronRun.id,
    batchSize,
    evaluated: articles.length,
    published,
    ignored,
    failed,
    results,
    durationMs,
  }
}
