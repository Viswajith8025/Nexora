// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { ARTICLE_SOURCE_EMBED } from '@/features/articles/api/articles'

describe('article source embed', () => {
  it('disambiguates sources via the primary source foreign key', () => {
    expect(ARTICLE_SOURCE_EMBED).toContain('articles_source_id_fkey')
    expect(ARTICLE_SOURCE_EMBED).not.toMatch(/source:sources \(/)
  })
})
