export type GmailSendInput = {
  accessToken: string
  to: string
  subject: string
  htmlBody: string
}

export async function sendGmailMessage(input: GmailSendInput): Promise<void> {
  const raw = buildMimeMessage(input.to, input.subject, input.htmlBody)
  const encoded = btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gmail send failed: ${response.status} ${text}`)
  }
}

function buildMimeMessage(to: string, subject: string, html: string): string {
  const boundary = 'nexora_boundary'
  return [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
    `--${boundary}--`,
  ].join('\r\n')
}

export async function refreshGmailAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gmail token refresh failed: ${text}`)
  }

  const data = (await response.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('Gmail token refresh returned no access_token')
  return data.access_token
}

export function buildDigestHtml(title: string, body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<h2 style="color:#1a2744">${title}</h2>
<div>${escaped}</div>
<p style="color:#666;font-size:12px;margin-top:24px">Sent by Nexora — optional Gmail channel. Telegram remains primary.</p>
</body></html>`
}
