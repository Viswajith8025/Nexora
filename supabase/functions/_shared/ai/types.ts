export type AIProviderName = 'groq' | 'gemini' | 'openai' | 'anthropic'

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
  readonly models: ModelConfig
  complete(request: AICompletionRequest): Promise<AICompletionResponse>
  getModelForTask(task: 'classification' | 'summary' | 'reasoning'): string
}

export type ModelConfig = {
  classification: string
  summary: string
  reasoning: string
}

/** Test-only fallback — production must set provider model secrets. */
export const DEFAULT_GROQ_MODEL_CONFIG: ModelConfig = {
  classification: 'openai/gpt-oss-20b',
  summary: 'openai/gpt-oss-120b',
  reasoning: 'openai/gpt-oss-120b',
}

export const DEFAULT_GEMINI_MODEL_CONFIG: ModelConfig = {
  classification: 'gemini-2.0-flash',
  summary: 'gemini-2.5-flash',
  reasoning: 'gemini-2.5-flash',
}

/** @deprecated use DEFAULT_GROQ_MODEL_CONFIG */
export const DEFAULT_MODEL_CONFIG = DEFAULT_GROQ_MODEL_CONFIG

export function resolveGroqModelConfig(env: Record<string, string | undefined>): ModelConfig {
  const cheap =
    env.GROQ_MODEL_CHEAP ??
    env.GROQ_MODEL_CLASSIFICATION ??
    DEFAULT_GROQ_MODEL_CONFIG.classification
  const deep =
    env.GROQ_MODEL_DEEP ??
    env.GROQ_MODEL_SUMMARY ??
    env.GROQ_MODEL_REASONING ??
    DEFAULT_GROQ_MODEL_CONFIG.summary

  return {
    classification: cheap,
    summary: deep,
    reasoning: deep,
  }
}

export function resolveGeminiModelConfig(env: Record<string, string | undefined>): ModelConfig {
  const cheap =
    env.GEMINI_MODEL_CHEAP ??
    env.GEMINI_MODEL_CLASSIFICATION ??
    DEFAULT_GEMINI_MODEL_CONFIG.classification
  const deep =
    env.GEMINI_MODEL_DEEP ??
    env.GEMINI_MODEL_SUMMARY ??
    env.GEMINI_MODEL_REASONING ??
    DEFAULT_GEMINI_MODEL_CONFIG.summary

  return {
    classification: cheap,
    summary: deep,
    reasoning: deep,
  }
}

/** @deprecated use resolveGroqModelConfig */
export function resolveModelConfig(env: Record<string, string | undefined>): ModelConfig {
  return resolveGroqModelConfig(env)
}

export class AIRateLimitError extends Error {
  readonly provider: AIProviderName

  constructor(message: string, provider: AIProviderName) {
    super(message)
    this.name = 'AIRateLimitError'
    this.provider = provider
  }
}

export class AIAPIError extends Error {
  readonly provider: AIProviderName
  readonly status?: number

  constructor(message: string, provider: AIProviderName, status?: number) {
    super(message)
    this.name = 'AIAPIError'
    this.provider = provider
    this.status = status
  }
}

export function isRetryableAIError(error: unknown): boolean {
  if (error instanceof AIRateLimitError) return true
  if (error instanceof AIAPIError) {
    return error.status === 429 || error.status === 503 || error.status === 502
  }
  return false
}

export const AI_LIMITS = {
  maxRetries: 2,
  fetchTimeoutMs: 30_000,
  defaultBatchSize: 10,
  maxBatchSize: 25,
} as const
