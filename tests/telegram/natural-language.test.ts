// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { routeNaturalLanguage } from '../../supabase/functions/_shared/telegram/natural-language.ts'

describe('routeNaturalLanguage', () => {
  it('routes today digest questions', () => {
    expect(routeNaturalLanguage('What happened in AI today?').intent).toBe('category_ai')
    expect(routeNaturalLanguage('What are the important developer updates today?').intent).toBe(
      'today_digest',
    )
  })

  it('routes latest questions', () => {
    expect(routeNaturalLanguage("What's the latest in tech?").intent).toBe('latest')
  })

  it('routes explain questions', () => {
    const route = routeNaturalLanguage('Explain MCP')
    expect(route.intent).toBe('explain_topic')
    expect(route.topic).toBe('MCP')
  })

  it('routes learning questions', () => {
    const route = routeNaturalLanguage('Should I learn Rust?')
    expect(route.intent).toBe('should_learn')
    expect(route.topic).toBe('Rust')
  })

  it('routes Next.js change questions', () => {
    const route = routeNaturalLanguage("What's new with Next.js?")
    expect(route.intent).toBe('changes')
    expect(route.topic).toBe('Next.js')
  })

  it('routes compare questions', () => {
    const route = routeNaturalLanguage('Compare Next.js vs Remix')
    expect(route.intent).toBe('compare')
    expect(route.compareA).toBe('Next.js')
    expect(route.compareB).toBe('Remix')
  })

  it('routes care questions', () => {
    const route = routeNaturalLanguage('Who should care about Rust?')
    expect(route.intent).toBe('care')
    expect(route.topic).toBe('Rust')
  })

  it('routes meeting prep to brief', () => {
    const route = routeNaturalLanguage('Brief me on Kubernetes')
    expect(route.intent).toBe('explain_topic')
    expect(route.topic).toBe('Kubernetes')
  })

  it('falls back to ask for general questions', () => {
    expect(routeNaturalLanguage('How does SSR work in modern frameworks?').intent).toBe('ask')
  })
})
