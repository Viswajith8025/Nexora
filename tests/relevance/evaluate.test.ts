// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  evaluateSingleArticle,
  loadAnalyzedArticles,
  type ArticleForEvaluation,
} from '../../supabase/functions/_shared/relevance/evaluate.ts'

const sampleArticle: ArticleForEvaluation = {
  id: 'article-1',
  title: 'OpenAI Announces GPT-5',
  category: 'AI',
  tags: ['openai', 'gpt-5'],
  verification_status: 'verified',
  what_happened: 'Major model release.',
  ai_summary: 'GPT-5 launches.',
  cluster_key: null,
  importance_score: 95,
  developer_relevance_score: 92,
  urgency_score: 82,
  confidence_score: 88,
  novelty_score: 90,
  source: {
    name: 'OpenAI Blog',
    type: 'rss',
    trust_tier: 'official_announcement',
    metadata: { official: true },
  },
}

function createMockSupabase(articles: ArticleForEvaluation[] = [sampleArticle]) {
  type StoredArticle = ArticleForEvaluation & { processing_status?: string }
  let storedArticles: StoredArticle[] = [...articles]

  const articlesTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        is: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: storedArticles, error: null })),
            })),
          })),
        })),
      })),
    })),
    update: vi.fn((payload: Record<string, unknown>) => ({
      eq: vi.fn(async (_column: string, value: string) => {
        storedArticles = storedArticles.map((article) =>
          article.id === value
            ? {
                ...article,
                processing_status: payload.processing_status as string | undefined,
              }
            : article,
        )
        return { error: null }
      }),
    })),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'articles') return articlesTable
      if (table === 'cron_runs') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: 'cron-1' }, error: null })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }
      return {}
    }),
    _articles: () => storedArticles,
  }

  return supabase
}

describe('evaluate articles pipeline', () => {
  it('loads analyzed articles without relevance decision', async () => {
    const supabase = createMockSupabase()
    const articles = await loadAnalyzedArticles(supabase as unknown as SupabaseClient, 10)
    expect(articles).toHaveLength(1)
    expect(articles[0]?.importance_score).toBe(95)
  })

  it('evaluates and publishes high-relevance articles', async () => {
    const supabase = createMockSupabase()
    const result = await evaluateSingleArticle(
      supabase as unknown as SupabaseClient,
      sampleArticle,
    )

    expect(result.success).toBe(true)
    expect(['DIGEST', 'BREAKING']).toContain(result.result?.decision)
    expect(supabase._articles()[0]?.processing_status).toBe('published')
  })

  it('archives ignored articles', async () => {
    const lowValue: ArticleForEvaluation = {
      ...sampleArticle,
      id: 'article-low',
      title: 'lodash 4.17.22 patch release with bug fixes only',
      importance_score: 15,
      developer_relevance_score: 20,
      urgency_score: 10,
      novelty_score: 8,
      confidence_score: 70,
    }
    const supabase = createMockSupabase([lowValue])
    const result = await evaluateSingleArticle(
      supabase as unknown as SupabaseClient,
      lowValue,
    )

    expect(result.success).toBe(true)
    expect(result.result?.decision).toBe('IGNORE')
    expect(supabase._articles()[0]?.processing_status).toBe('archived')
  })
})
