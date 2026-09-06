import type { TelegramInlineKeyboard } from './types.ts'

function truncateTopic(topic: string, max = 28): string {
  const trimmed = topic.trim()
  if (trimmed.length <= max) return trimmed
  return trimmed.slice(0, max)
}

export function mainMenuKeyboard(): TelegramInlineKeyboard {
  return [
    [
      { text: '📅 Today', callbackData: 'act:today' },
      { text: '📰 Latest', callbackData: 'act:latest' },
    ],
    [
      { text: '🤖 AI news', callbackData: 'act:ai' },
      { text: '❓ Help', callbackData: 'act:help' },
    ],
  ]
}

export function emptyFeedKeyboard(): TelegramInlineKeyboard {
  return [
    [
      { text: '📰 Latest', callbackData: 'act:latest' },
      { text: '💬 Ask me anything', callbackData: 'act:chat' },
    ],
    [{ text: '📅 Today', callbackData: 'act:today' }],
  ]
}

export function intelligenceFollowUpKeyboard(topic: string): TelegramInlineKeyboard {
  const t = truncateTopic(topic)
  return [
    [
      { text: '📚 Learn', callbackData: `act:learn:${t}` },
      { text: '📋 Brief', callbackData: `act:brief:${t}` },
      { text: '⚖️ Compare', callbackData: `act:compare:${t}` },
    ],
    [
      { text: '📅 Today', callbackData: 'act:today' },
      { text: '🆕 New chat', callbackData: 'act:clear' },
    ],
  ]
}

export function chatFollowUpKeyboard(): TelegramInlineKeyboard {
  return [
    [
      { text: '📅 Today', callbackData: 'act:today' },
      { text: '📰 Latest', callbackData: 'act:latest' },
    ],
    [{ text: '🆕 New chat', callbackData: 'act:clear' }],
  ]
}

export function articleSourceKeyboard(url: string): TelegramInlineKeyboard {
  return [[{ text: '🔗 Read source', url }]]
}
