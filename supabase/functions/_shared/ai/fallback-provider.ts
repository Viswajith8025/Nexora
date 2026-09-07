import type { AICompletionRequest, AICompletionResponse, AIProvider, ModelConfig } from './types.ts'
import { isRetryableAIError } from './types.ts'

function fallbackModelFor(primaryModel: string, primary: ModelConfig, fallback: ModelConfig): string {
  if (primaryModel === primary.classification) return fallback.classification
  if (primaryModel === primary.reasoning) return fallback.reasoning
  return fallback.summary
}

export class FallbackAIProvider implements AIProvider {
  readonly name = 'groq' as const
  readonly models: ModelConfig
  private readonly primary: AIProvider
  private readonly fallback: AIProvider

  constructor(primary: AIProvider, fallback: AIProvider) {
    this.primary = primary
    this.fallback = fallback
    this.models = primary.models
  }

  getModelForTask(task: 'classification' | 'summary' | 'reasoning'): string {
    return this.primary.getModelForTask(task)
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    try {
      return await this.primary.complete(request)
    } catch (error) {
      if (!isRetryableAIError(error)) throw error

      const fallbackModel = fallbackModelFor(request.model, this.primary.models, this.fallback.models)
      return await this.fallback.complete({
        ...request,
        model: fallbackModel,
      })
    }
  }
}
