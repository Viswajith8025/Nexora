import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
  ModelConfig,
} from './types.ts'
import {
  AIAPIError,
  AIRateLimitError,
  AI_LIMITS,
  resolveGeminiModelConfig,
} from './types.ts'

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'

export type GeminiProviderConfig = {
  apiKey: string
  models: ModelConfig
  fetchFn?: typeof fetch
  fetchTimeoutMs?: number
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const
  readonly models: ModelConfig
  private readonly apiKey: string
  private readonly fetchFn: typeof fetch
  private readonly fetchTimeoutMs: number

  constructor(config: GeminiProviderConfig) {
    if (!config.apiKey) throw new Error('GEMINI_API_KEY is required')
    this.apiKey = config.apiKey
    this.models = config.models
    this.fetchFn = config.fetchFn ?? fetch
    this.fetchTimeoutMs = config.fetchTimeoutMs ?? AI_LIMITS.fetchTimeoutMs
  }

  getModelForTask(task: 'classification' | 'summary' | 'reasoning'): string {
    switch (task) {
      case 'classification':
        return this.models.classification
      case 'reasoning':
        return this.models.reasoning
      default:
        return this.models.summary
    }
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.fetchTimeoutMs)

    try {
      const response = await this.fetchFn(GEMINI_API_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxTokens ?? 2048,
          response_format: request.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        }),
      })

      if (response.status === 429) {
        throw new AIRateLimitError('Gemini rate limit exceeded', 'gemini')
      }

      if (!response.ok) {
        const errorBody = await response.text()
        throw new AIAPIError(
          `Gemini API error ${response.status}: ${errorBody.slice(0, 500)}`,
          'gemini',
          response.status,
        )
      }

      const payload = await response.json()
      const content = payload?.choices?.[0]?.message?.content

      if (!content || typeof content !== 'string') {
        throw new AIAPIError('Gemini API returned empty content', 'gemini')
      }

      return {
        content,
        model: payload.model ?? request.model,
        provider: 'gemini',
        usage: payload.usage
          ? {
              promptTokens: payload.usage.prompt_tokens ?? 0,
              completionTokens: payload.usage.completion_tokens ?? 0,
              totalTokens: payload.usage.total_tokens ?? 0,
            }
          : undefined,
      }
    } catch (error) {
      if (error instanceof AIRateLimitError || error instanceof AIAPIError) {
        throw error
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AIAPIError(
          `Gemini request timed out after ${this.fetchTimeoutMs}ms`,
          'gemini',
        )
      }
      throw new AIAPIError(error instanceof Error ? error.message : 'Gemini request failed', 'gemini')
    } finally {
      clearTimeout(timeout)
    }
  }
}

export function createGeminiProvider(env: Record<string, string | undefined>): GeminiProvider {
  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  return new GeminiProvider({
    apiKey,
    models: resolveGeminiModelConfig(env),
  })
}
