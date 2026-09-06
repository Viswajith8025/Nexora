import type { TelegramInlineKeyboard } from './types.ts'

export class TelegramAPIError extends Error {
  statusCode?: number

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'TelegramAPIError'
    this.statusCode = statusCode
  }
}

export type TelegramClientConfig = {
  botToken: string
  fetchFn?: typeof fetch
}

export type SendMessageOptions = {
  parseMode?: 'Markdown' | 'HTML'
  disableWebPagePreview?: boolean
  keyboard?: TelegramInlineKeyboard
}

type TelegramApiPayload = {
  ok: boolean
  result?: { message_id?: number }
  description?: string
}

function buildInlineKeyboard(keyboard?: TelegramInlineKeyboard) {
  if (!keyboard || keyboard.length === 0) return undefined

  return {
    inline_keyboard: keyboard.map((row) =>
      row.map((button) => {
        if (button.url) {
          return { text: button.text, url: button.url }
        }
        return { text: button.text, callback_data: button.callbackData ?? 'act:help' }
      }),
    ),
  }
}

export class TelegramClient {
  private readonly baseUrl: string
  private readonly fetchFn: typeof fetch

  constructor(config: TelegramClientConfig) {
    if (!config.botToken) throw new Error('TELEGRAM_BOT_TOKEN is required')
    this.baseUrl = `https://api.telegram.org/bot${config.botToken}`
    this.fetchFn = config.fetchFn ?? fetch
  }

  private async post<T = TelegramApiPayload>(method: string, body: Record<string, unknown>): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = (await response.json()) as T & TelegramApiPayload

    if (!response.ok || payload?.ok === false) {
      throw new TelegramAPIError(
        payload?.description ?? `Telegram API error ${response.status}`,
        response.status,
      )
    }

    return payload
  }

  async sendMessage(
    chatId: string | number,
    text: string,
    options: SendMessageOptions = {},
  ): Promise<TelegramApiPayload> {
    const replyMarkup = buildInlineKeyboard(options.keyboard)

    return this.post('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: options.parseMode ?? 'HTML',
      disable_web_page_preview: options.disableWebPagePreview ?? false,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
  }

  async editMessageText(
    chatId: string | number,
    messageId: number,
    text: string,
    options: SendMessageOptions = {},
  ): Promise<TelegramApiPayload> {
    const replyMarkup = buildInlineKeyboard(options.keyboard)

    return this.post('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: options.parseMode ?? 'HTML',
      disable_web_page_preview: options.disableWebPagePreview ?? false,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    await this.post('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...(text ? { text } : {}),
    })
  }

  async sendMessages(
    chatId: string | number,
    messages: string[],
    options: SendMessageOptions = {},
  ): Promise<void> {
    for (const message of messages) {
      await this.sendMessage(chatId, message, options)
    }
  }
}
