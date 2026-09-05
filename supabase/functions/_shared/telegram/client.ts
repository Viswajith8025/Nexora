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
}

export class TelegramClient {
  private readonly baseUrl: string
  private readonly fetchFn: typeof fetch

  constructor(config: TelegramClientConfig) {
    if (!config.botToken) throw new Error('TELEGRAM_BOT_TOKEN is required')
    this.baseUrl = `https://api.telegram.org/bot${config.botToken}`
    this.fetchFn = config.fetchFn ?? fetch
  }

  async sendMessage(
    chatId: string | number,
    text: string,
    options: SendMessageOptions = {},
  ): Promise<unknown> {
    const response = await this.fetchFn(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode ?? 'Markdown',
        disable_web_page_preview: options.disableWebPagePreview ?? false,
      }),
    })

    const payload = await response.json()

    if (!response.ok || payload?.ok === false) {
      throw new TelegramAPIError(
        payload?.description ?? `Telegram API error ${response.status}`,
        response.status,
      )
    }

    return payload
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
