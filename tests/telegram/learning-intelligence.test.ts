// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseLearnArgs, normalizeTopic, topicKeywords } from '../../supabase/functions/_shared/telegram/learning-intelligence/parse.ts'
import { parseIntelligenceResponse } from '../../supabase/functions/_shared/telegram/learning-intelligence/schema.ts'
import { formatIntelligenceResponse } from '../../supabase/functions/_shared/telegram/learning-intelligence/format.ts'
import { buildMemoryNote } from '../../supabase/functions/_shared/telegram/learning-intelligence/memory.ts'

describe('parseLearnArgs', () => {
  it('parses beginner level', () => {
    expect(parseLearnArgs('MCP beginner')).toEqual({ topic: 'MCP', level: 'beginner' })
  })

  it('parses advanced level', () => {
    expect(parseLearnArgs('MCP advanced')).toEqual({ topic: 'MCP', level: 'advanced' })
  })

  it('defaults to intermediate', () => {
    expect(parseLearnArgs('MCP')).toEqual({ topic: 'MCP', level: 'intermediate' })
  })
})

describe('intelligence schema', () => {
  it('parses structured JSON response', () => {
    const raw = JSON.stringify({
      headline: 'Brief: Astra',
      sections: [
        { title: 'What is it?', content: 'A data tool.', kind: 'verified' },
        { title: 'Recommendation', content: 'Worth tracking.', kind: 'opinion' },
      ],
      sources: ['https://example.com'],
      meetingExplanation30s: 'Astra is a new data platform worth watching.',
    })

    const parsed = parseIntelligenceResponse(raw)
    expect(parsed.headline).toBe('Brief: Astra')
    expect(parsed.sections).toHaveLength(2)
    expect(parsed.meetingExplanation30s).toContain('Astra')
  })

  it('formats sections with kind labels', () => {
    const formatted = formatIntelligenceResponse('brief', {
      headline: 'Brief: Rust',
      sections: [
        { title: 'What is it?', content: 'A systems language.', kind: 'verified' },
        { title: 'Should you learn it?', content: 'Yes for performance work.', kind: 'opinion' },
      ],
      sources: ['Rust book'],
      relevanceScore: 88,
    })

    expect(formatted).toMatch(/Verified/)
    expect(formatted).toMatch(/Opinion/)
    expect(formatted).toMatch(/88\/100/)
    expect(formatted).toContain('<b>')
  })
})

describe('learning memory', () => {
  it('builds memory note for related topics', () => {
    const note = buildMemoryNote(
      [
        {
          topic: 'mcp',
          view_count: 3,
          interest_level: 65,
          last_command: 'learn',
          last_viewed_at: new Date().toISOString(),
        },
        {
          topic: 'react',
          view_count: 1,
          interest_level: 50,
          last_command: 'brief',
          last_viewed_at: new Date().toISOString(),
        },
      ],
      'MCP servers',
    )

    expect(note).toContain('mcp')
    expect(note).not.toContain('react')
  })

  it('normalizes topics consistently', () => {
    expect(normalizeTopic('  MCP  Servers ')).toBe('mcp servers')
    expect(topicKeywords('MCP protocol')).toContain('mcp')
  })
})
