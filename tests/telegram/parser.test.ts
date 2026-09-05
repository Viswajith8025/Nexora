// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isCommand, parseCommand, parseCompareArgs } from '../../supabase/functions/_shared/telegram/parser.ts'

describe('parseCommand', () => {
  it('parses commands without arguments', () => {
    expect(parseCommand('/today')).toEqual({
      command: 'today',
      args: '',
      raw: '/today',
    })
  })

  it('parses commands with arguments', () => {
    expect(parseCommand('/learn MCP')).toEqual({
      command: 'learn',
      args: 'MCP',
      raw: '/learn MCP',
    })
  })

  it('parses bot username suffix', () => {
    expect(parseCommand('/help@NexoraBot')).toEqual({
      command: 'help',
      args: '',
      raw: '/help@NexoraBot',
    })
  })

  it('parses multi-word arguments', () => {
    expect(parseCommand('/compare Next.js Remix')).toEqual({
      command: 'compare',
      args: 'Next.js Remix',
      raw: '/compare Next.js Remix',
    })
  })

  it('returns null for non-commands', () => {
    expect(parseCommand('What happened in AI today?')).toBeNull()
  })

  it('detects commands', () => {
    expect(isCommand('/status')).toBe(true)
    expect(isCommand('hello')).toBe(false)
  })
})

describe('parseCompareArgs', () => {
  it('splits two-term comparisons', () => {
    expect(parseCompareArgs('Next.js Remix')).toEqual(['Next.js', 'Remix'])
  })

  it('returns null for single term', () => {
    expect(parseCompareArgs('Next.js')).toBeNull()
  })
})
