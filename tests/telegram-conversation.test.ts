// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import {
  appendChatTurn,
  clearChatHistory,
  loadChatHistory,
} from '../supabase/functions/_shared/telegram/conversation.ts'

function createMockSupabase(rows: Array<{ role: string; content: string }> = []) {
  const inserted: Array<Record<string, unknown>> = []
  return {
    inserted,
    client: {
      from: vi.fn((table: string) => {
        if (table !== 'telegram_chat_history') return {}
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(async () => ({ data: rows, error: null })),
                range: vi.fn(async () => ({ data: [], error: null })),
              })),
            })),
          })),
          insert: vi.fn(async (row: Record<string, unknown>) => {
            inserted.push(row)
            return { error: null }
          }),
          delete: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
            in: vi.fn(async () => ({ error: null })),
          })),
        }
      }),
    },
  }
}

describe('telegram conversation memory', () => {
  it('loads chat history in chronological order', async () => {
    const mock = createMockSupabase([
      { role: 'assistant', content: 'Hi there' },
      { role: 'user', content: 'Hello' },
    ])

    const history = await loadChatHistory(mock.client as never, 'chat-1')
    expect(history).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ])
  })

  it('appends a chat turn', async () => {
    const mock = createMockSupabase()
    await appendChatTurn(mock.client as never, 'chat-1', 'user-1', 'user', 'What is MCP?')

    expect(mock.inserted).toHaveLength(1)
    expect(mock.inserted[0]).toMatchObject({
      chat_id: 'chat-1',
      user_id: 'user-1',
      role: 'user',
      content: 'What is MCP?',
    })
  })

  it('clears chat history for a chat', async () => {
    const mock = createMockSupabase()
    await clearChatHistory(mock.client as never, 'chat-1')
    expect(mock.client.from).toHaveBeenCalledWith('telegram_chat_history')
  })
})
