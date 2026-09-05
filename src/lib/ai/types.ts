/**
 * AI provider types for the browser — implementation lives in Edge Functions only.
 * See supabase/functions/_shared/ai/ for GroqProvider and article analysis.
 */
export type {
  AIProvider,
  AIProviderName,
  AICompletionRequest,
  AICompletionResponse,
  AITask,
  ModelConfig,
} from '../../../supabase/functions/_shared/ai/types.ts'

export { DEFAULT_MODEL_CONFIG, AI_LIMITS } from '../../../supabase/functions/_shared/ai/types.ts'
