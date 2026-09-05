// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { applyNoiseFilter, isCriticalSecurityIssue } from '../../supabase/functions/_shared/relevance/noise-filter.ts'
import { scoreForTrustTier } from '../../supabase/functions/_shared/relevance/source-quality.ts'
import { celebrityTechArticle, criticalSecurityVulnerability, minorNpmPatch } from './fixtures.ts'

describe('source quality', () => {
  it('assigns high scores to official sources', () => {
    expect(scoreForTrustTier('official_doc')).toBe(95)
    expect(scoreForTrustTier('official_announcement')).toBe(90)
    expect(scoreForTrustTier('github')).toBe(80)
    expect(scoreForTrustTier('reputable_publication')).toBe(75)
    expect(scoreForTrustTier('community')).toBe(55)
    expect(scoreForTrustTier('unknown')).toBe(30)
  })
})

describe('noise filter', () => {
  it('flags clickbait celebrity content', () => {
    const result = applyNoiseFilter(
      celebrityTechArticle.article,
      celebrityTechArticle.scores,
      celebrityTechArticle.source,
    )
    expect(result.isNoise).toBe(true)
    expect(result.reasons).toContain('clickbait')
  })

  it('flags minor npm patch releases', () => {
    const result = applyNoiseFilter(
      minorNpmPatch.article,
      minorNpmPatch.scores,
      minorNpmPatch.source,
    )
    expect(result.reasons).toContain('minor_release')
  })

  it('bypasses noise filter for critical security issues', () => {
    const result = applyNoiseFilter(
      criticalSecurityVulnerability.article,
      criticalSecurityVulnerability.scores,
      criticalSecurityVulnerability.source,
    )
    expect(result.bypassed).toBe(true)
    expect(result.exception).toBe('critical_security')
  })

  it('detects critical security from CVE patterns', () => {
    expect(
      isCriticalSecurityIssue(
        criticalSecurityVulnerability.article,
        criticalSecurityVulnerability.scores,
      ),
    ).toBe(true)
  })
})
