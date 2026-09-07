// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { processSingleArticle } from '../../supabase/functions/_shared/ai/analyzer.ts'
import { loadUnprocessedArticles } from '../../supabase/functions/_shared/ai/process.ts'
import { validAnalysisJson, sampleArticle } from './fixtures.ts'

import { DEFAULT_GROQ_MODEL_CONFIG } from '../../supabase/functions/_shared/ai/types.ts'

function createMockProvider(content = validAnalysisJson) {
  return {
    name: 'groq' as const,
    models: DEFAULT_GROQ_MODEL_CONFIG,
    getModelForTask: () => 'llama-3.3-70b-versatile',
    complete: vi.fn(async () => ({
      content,
      model: 'llama-3.3-70b-versatile',
      provider: 'groq' as const,
      usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
    })),
  }
}

function createUpdateChain(applyUpdate: () => void) {
  const result = { error: null }
  let eqCalls = 0

  const chain = {
    eq: vi.fn(() => {
      eqCalls++
      if (eqCalls >= 2) {
        applyUpdate()
        return Promise.resolve(result)
      }
      return chain
    }),
    then(
      onFulfilled?: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      applyUpdate()
      return Promise.resolve(result).then(onFulfilled, onRejected)
    },
  }

  return chain
}

function createMockSupabase(article = sampleArticle) {
  const aiGenerations: Record<string, unknown>[] = []
  let status = article.processing_status

  const articlesTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(async () => ({
            data: status === 'discovered' ? [article] : [],
            error: null,
          })),
        })),
      })),
    })),
    update: vi.fn((payload: Record<string, unknown>) => {
      const applyUpdate = () => {
        if (payload.processing_status) status = payload.processing_status as string
      }
      return createUpdateChain(applyUpdate)
    }),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'articles') return articlesTable
      if (table === 'ai_generations') {
        return {
          insert: vi.fn(async (row: Record<string, unknown>) => {
            aiGenerations.push(row)
            return { error: null }
          }),
        }
      }
      return {}
    }),
    _aiGenerations: aiGenerations,
    _getStatus: () => status,
  }

  return supabase
}

describe('article processing', () => {
  it('loads only discovered articles', async () => {
    const supabase = createMockSupabase()
    const articles = await loadUnprocessedArticles(supabase as unknown as SupabaseClient, 10)
    expect(articles).toHaveLength(1)
    expect(articles[0]?.processing_status).toBe('discovered')
  })

  it('processes article and records success', async () => {
    const supabase = createMockSupabase()
    const provider = createMockProvider()

    const result = await processSingleArticle(
      supabase as unknown as SupabaseClient,
      provider,
      sampleArticle,
    )

    expect(result.success).toBe(true)
    expect(supabase._getStatus()).toBe('analyzed')
    expect(supabase._aiGenerations[0]).toMatchObject({
      status: 'success',
      purpose: 'article_analysis',
    })
  })

  it('skips duplicate processing when status is not discovered', async () => {
    const processingArticle = { ...sampleArticle, processing_status: 'processing' }
    const supabase = createMockSupabase(processingArticle)
    const articles = await loadUnprocessedArticles(supabase as unknown as SupabaseClient, 10)
    expect(articles).toHaveLength(0)
  })

  it('marks article failed on invalid AI output', async () => {
    const supabase = createMockSupabase()
    const provider = createMockProvider('{"invalid":true}')

    const result = await processSingleArticle(
      supabase as unknown as SupabaseClient,
      provider,
      sampleArticle,
    )

    expect(result.success).toBe(false)
    expect(supabase._getStatus()).toBe('failed')
    expect(supabase._aiGenerations[0]).toMatchObject({ status: 'failure' })
  })
})
