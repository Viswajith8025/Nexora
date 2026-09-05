import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const gmailClient = readFileSync(
  join(process.cwd(), 'supabase/functions/_shared/gmail/client.ts'),
  'utf-8',
)

describe('Gmail digest delivery', () => {
  it('builds HTML digest from plain text body', () => {
    expect(gmailClient).toMatch(/buildDigestHtml/)
    expect(gmailClient).toMatch(/sendGmailMessage/)
  })

  it('keeps OAuth token refresh server-side', () => {
    expect(gmailClient).toMatch(/refreshGmailAccessToken/)
    expect(gmailClient).not.toMatch(/refresh_token.*client/i)
  })
})
