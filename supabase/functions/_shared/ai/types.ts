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

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  classification: 'llama-3.1-8b-instant',
  summary: 'llama-3.3-70b-versatile',
  reasoning: 'llama-3.3-70b-versatile',
}

export function resolveModelConfig(env: Record<string, string | undefined>): ModelConfig {
  return {
    classification: env.GROQ_MODEL_CLASSIFICATION ?? DEFAULT_MODEL_CONFIG.classification,
    summary: env.GROQ_MODEL_SUMMARY ?? DEFAULT_MODEL_CONFIG.summary,
    reasoning: env.GROQ_MODEL_REASONING ?? DEFAULT_MODEL_CONFIG.reasoning,
  }
}

export const AI_LIMITS = {
  maxRetries: 2,
  fetchTimeoutMs: 30_000,
  defaultBatchSize: 10,
  maxBatchSize: 25,
} as const
