// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  escapeMarkdown,
  formatArticleAlert,
  formatHelp,
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

    expect(message).toMatch(/IMPORTANT UPDATE|UPDATE/)
    expect(message).toMatch(/New Model X/)
    expect(message).toMatch(/94\/100/)
    expect(message).toMatch(/What happened/)
    expect(message).toMatch(/Why developers care/)
    expect(message).toMatch(/Key points/)
    expect(message).toMatch(/What you should know/)
    expect(message).toMatch(/Source/)
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
    expect(help).toMatch(/\/ask/)
    expect(help).toMatch(/\/compare/)
  })
})

describe('escapeMarkdown', () => {
  it('escapes markdown characters', () => {
    expect(escapeMarkdown('use *bold* and [link]')).toContain('\\*bold\\*')
  })
})
