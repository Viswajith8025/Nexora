const MAX_STATE_AGE_MS = 10 * 60 * 1000

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

function toBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (padded.length % 4)) % 4
  const base64 = padded + '='.repeat(padLength)
  return atob(base64)
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return toBase64Url(new Uint8Array(signature))
}

export async function createOAuthState(userId: string, secret: string): Promise<string> {
  const payload = `${userId}:${Date.now()}`
  const signature = await signPayload(payload, secret)
  return `${toBase64Url(new TextEncoder().encode(payload))}.${signature}`
}

export async function parseOAuthState(state: string, secret: string): Promise<string | null> {
  const [encoded, signature] = state.split('.')
  if (!encoded || !signature) return null

  const payloadBytes = Uint8Array.from(fromBase64Url(encoded), (char) => char.charCodeAt(0))
  const payload = new TextDecoder().decode(payloadBytes)
  const expected = await signPayload(payload, secret)

  if (!timingSafeEqual(signature, expected)) return null

  const [userId, issuedAt] = payload.split(':')
  if (!userId || !issuedAt) return null
  if (Date.now() - Number(issuedAt) > MAX_STATE_AGE_MS) return null

  return userId
}
