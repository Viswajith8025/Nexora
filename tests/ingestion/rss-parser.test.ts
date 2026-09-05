// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseFeed } from '../../supabase/functions/_shared/ingestion/rss-parser.ts'

const VALID_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example Feed</title>
    <item>
      <title>First Post</title>
      <link>https://example.com/posts/first</link>
      <pubDate>Mon, 01 Sep 2026 10:00:00 GMT</pubDate>
      <description><![CDATA[<p>Summary text</p>]]></description>
      <category>AI</category>
    </item>
  </channel>
</rss>`

const MALFORMED_RSS = `<rss><channel><item><title>Broken`

describe('rss parser', () => {
  it('parses valid RSS feeds', () => {
    const { items, error } = parseFeed(VALID_RSS, 'https://example.com/feed.xml', 'rss')
    expect(error).toBeUndefined()
    expect(items).toHaveLength(1)
    const first = items[0]
    expect(first?.title).toBe('First Post')
    expect(first?.link).toBe('https://example.com/posts/first')
    expect(first?.categories).toContain('AI')
  })

  it('handles malformed RSS without throwing', () => {
    const { items, error } = parseFeed(MALFORMED_RSS, 'https://example.com/feed.xml', 'rss')
    expect(items).toHaveLength(0)
    expect(error).toBeUndefined()
  })

  it('rejects empty feed bodies', () => {
    const { items, error } = parseFeed('', 'https://example.com/feed.xml', 'rss')
    expect(items).toHaveLength(0)
    expect(error).toBe('Empty feed body')
  })

  it('skips items with invalid URLs', () => {
    const rss = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>Bad</title><link>javascript:alert(1)</link></item>
    </channel></rss>`
    const { items } = parseFeed(rss, 'https://example.com/feed.xml', 'rss')
    expect(items).toHaveLength(0)
  })
})
