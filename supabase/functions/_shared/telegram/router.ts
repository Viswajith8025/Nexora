import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIProvider } from '../ai/types.ts'
import { TelegramClient } from './client.ts'
import { splitTelegramMessage } from './format.ts'
import { buildHandlerContext, dispatchCommand, handleNaturalLanguage } from './handlers.ts'
import { routeNaturalLanguage } from './natural-language.ts'
import { isCommand, parseCommand } from './parser.ts'
import { telegramUpdateSchema } from './types.ts'

export type WebhookProcessResult = {
  handled: boolean
  chatId?: string
  error?: string
}

export async function processTelegramUpdate(
  supabase: SupabaseClient,
  telegram: TelegramClient,
  update: unknown,
  groq?: AIProvider,
): Promise<WebhookProcessResult> {
  const parsed = telegramUpdateSchema.safeParse(update)
  if (!parsed.success) {
    return { handled: false, error: 'Invalid Telegram update payload' }
  }

  const message = parsed.data.message
  if (!message?.text) {
    return { handled: false }
  }

  const chatId = String(message.chat.id)
  const ctx = await buildHandlerContext(supabase, chatId, groq)

  let result
  if (isCommand(message.text)) {
    const command = parseCommand(message.text)
    if (!command) return { handled: false, error: 'Failed to parse command' }
    result = await dispatchCommand(ctx, command.command, command.args)
  } else {
    const route = routeNaturalLanguage(message.text)
    result = await handleNaturalLanguage(ctx, route)
  }

  const immediateMessages = result.messages.flatMap((text) => splitTelegramMessage(text))
  await telegram.sendMessages(chatId, immediateMessages)

  if (result.research) {
    try {
      const researchMessages = await result.research()
      await telegram.sendMessages(chatId, researchMessages)
    } catch {
      await telegram.sendMessage(
        chatId,
        'Sorry, I could not complete that research request. Please try again later.',
      )
    }
  }

  return { handled: true, chatId }
}
