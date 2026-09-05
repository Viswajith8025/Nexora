import type { SupabaseClient } from '@supabase/supabase-js'
import type { AITask } from './types.ts'

export type AIGenerationLog = {
  provider: string
  model: string
  task: AITask
  articleId?: string
  inputTokens?: number
  outputTokens?: number
  durationMs: number
  status: 'success' | 'failure'
  error?: string
}

export async function recordAIGeneration(
  supabase: SupabaseClient,
  log: AIGenerationLog,
): Promise<void> {
  await supabase.from('ai_generations').insert({
    provider: log.provider,
    model: log.model,
    purpose: log.task,
    article_id: log.articleId ?? null,
    input_tokens: log.inputTokens ?? null,
    output_tokens: log.outputTokens ?? null,
    duration_ms: log.durationMs,
    status: log.status,
    error: log.error ?? null,
  })
}
