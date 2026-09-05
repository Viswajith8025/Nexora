// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildDeliveryExplanation } from '../../supabase/functions/_shared/relevance/explain.ts'
import { evaluateArticleRelevance } from '../../supabase/functions/_shared/relevance/engine.ts'
import { majorAiModelRelease } from './fixtures.ts'

describe('relevance explanation', () => {
  it('explains why a high-priority story was ranked', () => {
    const result = evaluateArticleRelevance(majorAiModelRelease)
    const bullets = buildDeliveryExplanation(result, majorAiModelRelease)

    expect(bullets.some((item) => item.includes('you follow AI'))).toBe(true)
    expect(bullets.some((item) => item.includes('major model release'))).toBe(true)
    expect(bullets.some((item) => item.includes('developer relevance'))).toBe(true)
  })
})
