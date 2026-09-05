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

  if (headerSecret !== webhookSecret) {
    return { valid: false, error: 'Invalid webhook secret' }
  }

  return { valid: true }
}
