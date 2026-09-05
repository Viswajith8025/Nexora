// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { canonicalizeUrl, isAllowedUrl, resolveArticleUrl } from '../../supabase/functions/_shared/ingestion/url.ts'

describe('url utilities', () => {
  it('canonicalizes URLs by stripping tracking params', () => {
    expect(
      canonicalizeUrl('https://example.com/post?utm_source=twitter&id=1&utm_campaign=test'),
    ).toBe('https://example.com/post?id=1')
  })

  it('normalizes hostname and trailing slashes', () => {
    expect(canonicalizeUrl('https://EXAMPLE.com/path/')).toBe('https://example.com/path')
  })

  it('rejects unsupported protocols', () => {
    expect(isAllowedUrl('ftp://example.com/file')).toBe(false)
    expect(isAllowedUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedUrl('https://example.com')).toBe(true)
  })

  it('resolves relative article URLs against feed URL', () => {
    expect(resolveArticleUrl('/blog/release', 'https://example.com/feed.xml')).toBe(
      'https://example.com/blog/release',
    )
  })

  it('returns null for invalid URLs', () => {
    expect(canonicalizeUrl('not-a-url')).toBeNull()
  })
})
