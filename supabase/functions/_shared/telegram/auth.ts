function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export function validateTelegramWebhook(
  req: Request,
  webhookSecret: string | undefined,
): { valid: boolean; error?: string } {
  if (!webhookSecret) {
    return { valid: false, error: 'TELEGRAM_WEBHOOK_SECRET is not configured' }
  }

  const headerSecret = req.headers.get('x-telegram-bot-api-secret-token')
  if (!headerSecret) {
    return { valid: false, error: 'Missing X-Telegram-Bot-Api-Secret-Token header' }
  }

  if (!timingSafeEqual(headerSecret, webhookSecret)) {
    return { valid: false, error: 'Invalid webhook secret' }
  }

  return { valid: true }
}
