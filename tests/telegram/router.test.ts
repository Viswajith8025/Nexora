// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { processTelegramUpdate } from '../../supabase/functions/_shared/telegram/router.ts'
import { TelegramClient } from '../../supabase/functions/_shared/telegram/client.ts'

const sampleDbArticle = {
  id: 'article-1',
  title: 'OpenAI Announces GPT-5',
  canonical_url: 'https://example.com/gpt5',
  category: 'AI',
  ai_summary: 'GPT-5 launches.',
  what_happened: 'Major model release.',
  one_sentence_takeaway: 'Better coding.',
  why_it_matters: 'API changes.',
  developer_impact: 'Migration needed.',
  recommended_action: 'Review docs.',
  importance_score: 95,
  developer_relevance_score: 92,
  relevance_score: 91,
  relevance_decision: 'breaking',
  published_at: new Date().toISOString(),
  discovered_at: new Date().toISOString(),
  tags: ['openai'],
}

function createMockSupabase() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
        }
      }
      if (table === 'articles') {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          neq: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          or: vi.fn(() => chain),
          order: vi.fn(() => chain),
          limit: vi.fn(async () => ({ data: [sampleDbArticle], error: null })),
        }
        return chain
      }
      return {}
    }),
  }
}

function createMockTelegram() {
  const sendMessage = vi.fn(async () => ({}))
  const sendMessages = vi.fn(async (_chatId: string, messages: string[]) => {
    for (const _message of messages) {
      await sendMessage()
    }
  })
  return {
    telegram: {
      sendMessage,
      sendMessages,
    } as unknown as TelegramClient,
    sendMessage,
    sendMessages,
  }
}

describe('processTelegramUpdate', () => {
  it('rejects malformed updates', async () => {
    const result = await processTelegramUpdate(
      createMockSupabase() as unknown as SupabaseClient,
      createMockTelegram().telegram,
      { invalid: true },
    )
    expect(result.handled).toBe(false)
    expect(result.error).toMatch(/Invalid/i)
  })

  it('handles /help command', async () => {
    const { telegram, sendMessages } = createMockTelegram()
    const result = await processTelegramUpdate(
      createMockSupabase() as unknown as SupabaseClient,
      telegram,
      {
        update_id: 1,
        message: {
          message_id: 1,
          chat: { id: 12345, type: 'private' },
          date: Date.now(),
          text: '/help',
        },
      },
    )

    expect(result.handled).toBe(true)
    expect(sendMessages).toHaveBeenCalled()
  })

  it('handles natural language messages', async () => {
    const { telegram, sendMessages } = createMockTelegram()
    const groq = {
      name: 'groq' as const,
      complete: vi.fn(async () => ({
        content: 'AI had several important updates today.',
        model: 'llama-3.3-70b-versatile',
        provider: 'groq' as const,
      })),
    }

    const result = await processTelegramUpdate(
      createMockSupabase() as unknown as SupabaseClient,
      telegram,
      {
        update_id: 2,
        message: {
          message_id: 2,
          chat: { id: 12345, type: 'private' },
          date: Date.now(),
          text: 'What happened in AI today?',
        },
      },
      groq,
    )

    expect(result.handled).toBe(true)
    expect(sendMessages).toHaveBeenCalled()
  })

  it('handles command arguments', async () => {
    const { telegram } = createMockTelegram()
    const groq = {
      name: 'groq' as const,
      complete: vi.fn(async () => ({
        content: 'MCP is a protocol for connecting AI to tools.',
        model: 'llama-3.3-70b-versatile',
        provider: 'groq' as const,
      })),
    }

    const result = await processTelegramUpdate(
      createMockSupabase() as unknown as SupabaseClient,
      telegram,
      {
        update_id: 3,
        message: {
          message_id: 3,
          chat: { id: 12345, type: 'private' },
          date: Date.now(),
          text: '/brief MCP',
        },
      },
      groq,
    )

    expect(result.handled).toBe(true)
    expect(groq.complete).toHaveBeenCalled()
  })

  it('handles Telegram API failure during research gracefully', async () => {
    const sendMessage = vi.fn(async () => ({}))
    const telegram = {
      sendMessage,
      sendMessages: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Telegram down')),
    } as unknown as TelegramClient

    const groq = {
      name: 'groq' as const,
      complete: vi.fn(async () => ({
        content: 'Answer',
        model: 'llama-3.3-70b-versatile',
        provider: 'groq' as const,
      })),
    }

    const result = await processTelegramUpdate(
      createMockSupabase() as unknown as SupabaseClient,
      telegram,
      {
        update_id: 4,
        message: {
          message_id: 4,
          chat: { id: 12345, type: 'private' },
          date: Date.now(),
          text: '/ask What is MCP?',
        },
      },
      groq,
    )

    expect(result.handled).toBe(true)
    expect(sendMessage).toHaveBeenCalled()
  })
})
