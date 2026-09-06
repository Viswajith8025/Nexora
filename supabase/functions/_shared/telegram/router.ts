import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIProvider } from '../ai/types.ts'
import { TelegramClient } from './client.ts'
import { splitTelegramMessage } from './format.ts'
import {
  buildHandlerContext,
  dispatchCommand,
  dispatchCallbackAction,
  handleNaturalLanguage,
} from './handlers.ts'
import { routeNaturalLanguage } from './natural-language.ts'
import { isCommand, parseCommand } from './parser.ts'
import {
  normalizeOutboundMessage,
  telegramUpdateSchema,
  type TelegramOutboundMessage,
} from './types.ts'

export type WebhookProcessResult = {
  handled: boolean
  chatId?: string
  error?: string
}

async function deliverMessages(
  telegram: TelegramClient,
  chatId: string,
  messages: TelegramOutboundMessage[],
): Promise<void> {
  for (const message of messages) {
    await telegram.sendMessage(chatId, message.text, {
      keyboard: message.keyboard,
      disableWebPagePreview: message.disableWebPagePreview,
    })
  }
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

  const callbackQuery = parsed.data.callback_query
  if (callbackQuery?.data && callbackQuery.message) {
    const chatId = String(callbackQuery.message.chat.id)
    const ctx = await buildHandlerContext(supabase, chatId, groq)

    try {
      const result = await dispatchCallbackAction(ctx, callbackQuery.data)
      await telegram.answerCallbackQuery(callbackQuery.id)

      const outbound = result.messages.map(normalizeOutboundMessage)
      if (result.research) {
        const status = outbound[0]
        const statusResponse = status
          ? await telegram.sendMessage(chatId, status.text, {
              keyboard: status.keyboard,
              disableWebPagePreview: status.disableWebPagePreview,
            })
          : null
        const statusMessageId = statusResponse?.result?.message_id

        try {
          const researchMessages = await result.research()
          await deliverResearchResult(telegram, chatId, statusMessageId, researchMessages)
        } catch {
          if (statusMessageId) {
            await telegram.editMessageText(chatId, statusMessageId, 'Sorry, I could not complete that. Please try again.')
          } else {
            await telegram.sendMessage(chatId, 'Sorry, I could not complete that. Please try again.')
          }
        }
      } else {
        await deliverMessages(telegram, chatId, outbound)
      }

      return { handled: true, chatId }
    } catch {
      await telegram.answerCallbackQuery(callbackQuery.id, 'Something went wrong')
      return { handled: true, chatId, error: 'Callback handling failed' }
    }
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

  const immediateMessages = result.messages.map(normalizeOutboundMessage)

  if (result.research) {
    const status = immediateMessages[0]
    const statusResponse = status
      ? await telegram.sendMessage(chatId, status.text, {
          keyboard: status.keyboard,
          disableWebPagePreview: status.disableWebPagePreview,
        })
      : null
    const statusMessageId = statusResponse?.result?.message_id

    try {
      const researchMessages = await result.research()
      await deliverResearchResult(telegram, chatId, statusMessageId, researchMessages)
    } catch {
      if (statusMessageId) {
        await telegram.editMessageText(
          chatId,
          statusMessageId,
          'Sorry, I could not complete that request. Please try again later.',
        )
      } else {
        await telegram.sendMessage(
          chatId,
          'Sorry, I could not complete that request. Please try again later.',
        )
      }
    }
  } else {
    await deliverMessages(telegram, chatId, immediateMessages)
  }

  return { handled: true, chatId }
}

async function deliverResearchResult(
  telegram: TelegramClient,
  chatId: string,
  statusMessageId: number | undefined,
  researchMessages: Array<string | TelegramOutboundMessage>,
): Promise<void> {
  const outbound = researchMessages.map(normalizeOutboundMessage)
  if (outbound.length === 0) return

  const first = outbound[0]
  if (!first) return

  const rest = outbound.slice(1)
  const firstChunks = splitTelegramMessage(first.text)
  const firstChunk = firstChunks[0]
  if (!firstChunk) return

  if (statusMessageId && firstChunks.length === 1) {
    await telegram.editMessageText(chatId, statusMessageId, firstChunk, {
      keyboard: first.keyboard,
      disableWebPagePreview: first.disableWebPagePreview,
    })
  } else if (statusMessageId) {
    await telegram.editMessageText(chatId, statusMessageId, firstChunk, {
      disableWebPagePreview: first.disableWebPagePreview,
    })
    for (const chunk of firstChunks.slice(1)) {
      await telegram.sendMessage(chatId, chunk, {
        disableWebPagePreview: first.disableWebPagePreview,
      })
    }
    if (first.keyboard) {
      await telegram.sendMessage(chatId, '⬇️ Quick actions', { keyboard: first.keyboard })
    }
  } else {
    await deliverMessages(telegram, chatId, outbound)
    return
  }

  for (const message of rest) {
    const chunks = splitTelegramMessage(message.text)
    for (const [index, chunk] of chunks.entries()) {
      const isLast = index === chunks.length - 1
      await telegram.sendMessage(chatId, chunk, {
        keyboard: isLast ? message.keyboard : undefined,
        disableWebPagePreview: message.disableWebPagePreview,
      })
    }
  }
}
