// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TelegramClient, TelegramAPIError } from '../../supabase/functions/_shared/telegram/client.ts'

const mockFetch = vi.fn()

describe('TelegramClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  const client = new TelegramClient({
    botToken: 'test-token',
    fetchFn: mockFetch as typeof fetch,
  })

  it('sends messages successfully', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 }),
    )

    await client.sendMessage('12345', 'Hello')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-token/sendMessage',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws on API failure', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: false, description: 'Bad Request' }), { status: 400 }),
    )

    await expect(client.sendMessage('12345', 'Hello')).rejects.toBeInstanceOf(TelegramAPIError)
  })

  it('sends multiple message chunks', async () => {
    mockFetch.mockImplementation(async () =>
      new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 }),
    )

    await client.sendMessages('12345', ['Part 1', 'Part 2'])
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
