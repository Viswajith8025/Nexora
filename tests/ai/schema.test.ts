// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  articleAnalysisSchema,
  parseArticleAnalysis,
  extractJsonObject,
} from '../../supabase/functions/_shared/ai/schema.ts'
import { validAnalysis, validAnalysisJson, malformedAnalysisJson } from './fixtures.ts'

describe('article analysis schema', () => {
  it('validates complete AI output', () => {
    const result = articleAnalysisSchema.safeParse(validAnalysis)
    expect(result.success).toBe(true)
  })

  it('rejects malformed JSON missing required fields', () => {
    const parsed = parseArticleAnalysis(malformedAnalysisJson)
    expect(parsed.success).toBe(false)
  })

  it('parses valid JSON from AI response', () => {
    const parsed = parseArticleAnalysis(validAnalysisJson)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.category).toBe('AI')
      expect(parsed.data.importance_score).toBe(82)
    }
  })

  it('extracts JSON from fenced code blocks', () => {
    const raw = 'Here is the result:\n```json\n' + validAnalysisJson + '\n```'
    const json = extractJsonObject(raw)
    expect(json).toContain('"category":"AI"')
  })

  it('rejects scores outside 0-100', () => {
    const invalid = { ...validAnalysis, importance_score: 150 }
    expect(articleAnalysisSchema.safeParse(invalid).success).toBe(false)
  })
})
