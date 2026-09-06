export type AIProviderName = 'groq' | 'openai' | 'anthropic'

export type AIMessageRole = 'system' | 'user' | 'assistant'

export type AIMessage = {
  role: AIMessageRole
  content: string
}

export type AICompletionRequest = {
  messages: AIMessage[]
  model: string
  temperature?: number
  maxTokens?: number
  responseFormat?: 'json' | 'text'
}

export type AICompletionResponse = {
  content: string
  model: string
  provider: AIProviderName
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export type AITask = 'article_analysis' | 'classification' | 'reasoning'

export type AIProvider = {
  readonly name: AIProviderName
  complete(request: AICompletionRequest): Promise<AICompletionResponse>
}

export type ModelConfig = {
  classification: string
  summary: string
  reasoning: string
}

/** Test-only fallback — production must set GROQ_MODEL_CHEAP / GROQ_MODEL_DEEP. */
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  classification: 'openai/gpt-oss-20b',
  summary: 'openai/gpt-oss-120b',
  reasoning: 'openai/gpt-oss-120b',
}

export function resolveModelConfig(env: Record<string, string | undefined>): ModelConfig {
  const cheap =
    env.GROQ_MODEL_CHEAP ??
    env.GROQ_MODEL_CLASSIFICATION ??
    DEFAULT_MODEL_CONFIG.classification
  const deep =
    env.GROQ_MODEL_DEEP ??
    env.GROQ_MODEL_SUMMARY ??
    env.GROQ_MODEL_REASONING ??
    DEFAULT_MODEL_CONFIG.summary

  return {
    classification: cheap,
    summary: deep,
    reasoning: deep,
  }
}

export const AI_LIMITS = {
  maxRetries: 2,
  fetchTimeoutMs: 30_000,
  defaultBatchSize: 10,
  maxBatchSize: 25,
} as const
