import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
  AIProviderName,
  ModelConfig,
} from './types.ts'
import { AI_LIMITS, resolveModelConfig } from './types.ts'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export type GroqProviderConfig = {
  apiKey: string
  models: ModelConfig
  fetchFn?: typeof fetch
  fetchTimeoutMs?: number
}

export class GroqProvider implements AIProvider {
  readonly name: AIProviderName = 'groq'
  private readonly apiKey: string
  private readonly models: ModelConfig
  private readonly fetchFn: typeof fetch
  private readonly fetchTimeoutMs: number

  constructor(config: GroqProviderConfig) {
    if (!config.apiKey) throw new Error('GROQ_API_KEY is required')
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
      const response = await this.fetchFn(GROQ_API_URL, {
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
        throw new GroqRateLimitError('Groq rate limit exceeded')
      }

      if (!response.ok) {
        const errorBody = await response.text()
        throw new GroqAPIError(`Groq API error ${response.status}: ${errorBody.slice(0, 500)}`)
      }

      const payload = await response.json()
      const content = payload?.choices?.[0]?.message?.content

      if (!content || typeof content !== 'string') {
        throw new GroqAPIError('Groq API returned empty content')
      }

      return {
        content,
        model: payload.model ?? request.model,
        provider: 'groq',
        usage: payload.usage
          ? {
              promptTokens: payload.usage.prompt_tokens ?? 0,
              completionTokens: payload.usage.completion_tokens ?? 0,
              totalTokens: payload.usage.total_tokens ?? 0,
            }
          : undefined,
      }
    } catch (error) {
      if (error instanceof GroqRateLimitError || error instanceof GroqAPIError) {
        throw error
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GroqAPIError(`Groq request timed out after ${this.fetchTimeoutMs}ms`)
      }
      throw new GroqAPIError(error instanceof Error ? error.message : 'Groq request failed')
    } finally {
      clearTimeout(timeout)
    }
  }
}

export class GroqAPIError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GroqAPIError'
  }
}

export class GroqRateLimitError extends GroqAPIError {
  constructor(message: string) {
    super(message)
    this.name = 'GroqRateLimitError'
  }
}

export function createGroqProvider(env: Record<string, string | undefined>): GroqProvider {
  const apiKey = env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured')

  return new GroqProvider({
    apiKey,
    models: resolveModelConfig(env),
  })
}
