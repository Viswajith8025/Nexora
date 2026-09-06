// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { dispatchCommand, buildHandlerContext } from '../../supabase/functions/_shared/telegram/handlers.ts'
import { normalizeOutboundMessage } from '../../supabase/functions/_shared/telegram/types.ts'

function messageTexts(messages: Array<string | import('../../supabase/functions/_shared/telegram/types.ts').TelegramOutboundMessage>) {
  return messages.map((message) => normalizeOutboundMessage(message).text)
}

function createMockSupabase(options?: { profile?: Record<string, unknown> | null }) {
  const articles = [
    {
      id: '1',
      title: 'OpenAI Announces GPT-5',
      canonical_url: 'https://example.com/gpt5',
      category: 'AI',
      relevance_score: 92,
      importance_score: 95,
      ai_summary: 'Major release.',
      what_happened: 'GPT-5 launched.',
      one_sentence_takeaway: 'Better coding.',
      why_it_matters: 'API impact.',
      developer_impact: 'Migration.',
      recommended_action: 'Review.',
      relevance_decision: 'breaking',
      published_at: new Date().toISOString(),
      discovered_at: new Date().toISOString(),
      tags: ['openai'],
    },
  ]

  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: options?.profile ?? null, error: null })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }
      if (table === 'telegram_link_tokens') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  id: 'token-1',
                  user_id: 'user-1',
                  expires_at: new Date(Date.now() + 3600000).toISOString(),
                  used_at: null,
                },
                error: null,
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }
      if (table === 'articles' || table === 'saved_articles') {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          neq: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          or: vi.fn(() => chain),
          order: vi.fn(() => chain),
          limit: vi.fn(async () => ({ data: articles, error: null })),
        }
        return chain
      }
      return {}
    }),
  }
}

describe('telegram commands', () => {
  it('returns help for /help', async () => {
    const supabase = createMockSupabase()
    const ctx = await buildHandlerContext(supabase as unknown as SupabaseClient, '12345')
    const result = await dispatchCommand(ctx, 'help', '')
    expect(messageTexts(result.messages)[0]).toMatch(/Nexora|\/today/i)
  })

  it('returns welcome for /start without token', async () => {
    const supabase = createMockSupabase()
    const ctx = await buildHandlerContext(supabase as unknown as SupabaseClient, '12345')
    const result = await dispatchCommand(ctx, 'start', '')
    expect(messageTexts(result.messages)[0]).toMatch(/Welcome/)
  })

  it('links account with /start token', async () => {
    const supabase = createMockSupabase()
    const ctx = await buildHandlerContext(supabase as unknown as SupabaseClient, '12345')
    const result = await dispatchCommand(ctx, 'start', 'valid-token')
    expect(messageTexts(result.messages)[0]).toMatch(/linked/i)
  })

  it('requires args for /learn', async () => {
    const supabase = createMockSupabase()
    const ctx = await buildHandlerContext(supabase as unknown as SupabaseClient, '12345')
    const result = await dispatchCommand(ctx, 'learn', '')
    expect(messageTexts(result.messages)[0]).toMatch(/Example/)
  })

  it('returns today digest articles', async () => {
    const supabase = createMockSupabase()
    const ctx = await buildHandlerContext(supabase as unknown as SupabaseClient, '12345')
    const result = await dispatchCommand(ctx, 'today', '')
    expect(messageTexts(result.messages).join(' ')).toMatch(/GPT-5|today/i)
  })

  it('requires linked account for /saved', async () => {
    const supabase = createMockSupabase({ profile: null })
    const ctx = await buildHandlerContext(supabase as unknown as SupabaseClient, '12345')
    const result = await dispatchCommand(ctx, 'saved', '')
    expect(messageTexts(result.messages)[0]).toMatch(/Link your Nexora account/)
  })
})
