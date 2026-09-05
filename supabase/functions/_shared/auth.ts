function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export function validateCronAuth(
  req: Request,
  cronSecret: string | undefined,
): { authorized: boolean; error?: string } {
  if (!cronSecret) {
    return { authorized: false, error: 'CRON_SECRET is not configured' }
  }

  const headerSecret = req.headers.get('x-cron-secret')
  const authHeader = req.headers.get('authorization')
  const bearerSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null

  const provided = headerSecret ?? bearerSecret
  if (!provided) {
    return { authorized: false, error: 'Missing authorization' }
  }

  if (!timingSafeEqual(provided, cronSecret)) {
    return { authorized: false, error: 'Invalid authorization' }
  }

  return { authorized: true }
}
