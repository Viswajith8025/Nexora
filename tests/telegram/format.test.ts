// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  formatArticleAlert,
  formatHelp,
  formatPlainToHtml,
  splitTelegramMessage,
} from '../../supabase/functions/_shared/telegram/format.ts'
import { TELEGRAM_MAX_MESSAGE_LENGTH } from '../../supabase/functions/_shared/telegram/types.ts'

describe('formatArticleAlert', () => {
  it('formats concise mobile-friendly sections', () => {
    const message = formatArticleAlert({
      title: 'New Model X',
      canonical_url: 'https://example.com/model',
      importance_score: 94,
      what_happened: 'A new model was released.',
      why_it_matters: 'Developers get better APIs.',
      one_sentence_takeaway: 'Faster coding workflows.',
      recommended_action: 'Review the release notes.',
    })

    expect(message.text).toMatch(/UPDATE/)
    expect(message.text).toMatch(/New Model X/)
    expect(message.text).toMatch(/94\/100/)
    expect(message.text).toMatch(/What happened/)
    expect(message.text).toMatch(/Why developers care/)
    expect(message.text).toMatch(/Key points/)
    expect(message.text).toMatch(/What you should know/)
    expect(message.keyboard?.[0]?.[0]?.url).toBe('https://example.com/model')
  })
})

describe('splitTelegramMessage', () => {
  it('returns single chunk for short messages', () => {
    expect(splitTelegramMessage('hello')).toEqual(['hello'])
  })

  it('splits long messages without breaking mid-paragraph when possible', () => {
    const paragraph = 'A'.repeat(2000)
    const text = `${paragraph}\n\n${paragraph}`
    const chunks = splitTelegramMessage(text, 2500)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(2500)
    }
  })

  it('respects Telegram max length constant', () => {
    const text = 'B'.repeat(TELEGRAM_MAX_MESSAGE_LENGTH + 500)
    const chunks = splitTelegramMessage(text)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((chunk) => chunk.length <= TELEGRAM_MAX_MESSAGE_LENGTH)).toBe(true)
  })
})

describe('formatHelp', () => {
  it('lists core commands', () => {
    const help = formatHelp()
    expect(help).toMatch(/\/today/)
    expect(help).toMatch(/\/ask|Just chat/)
    expect(help).toMatch(/\/clear/)
    expect(help).toMatch(/\/compare/)
  })
})

describe('formatPlainToHtml', () => {
  it('converts bold markers to html', () => {
    expect(formatPlainToHtml('This is **important**')).toContain('<b>important</b>')
  })
})

describe('escapeHtml', () => {
  it('escapes html characters', () => {
    expect(escapeHtml('use <b>bold</b> & ampersand')).toBe('use &lt;b&gt;bold&lt;/b&gt; &amp; ampersand')
  })
})
