import type { SourceContext, SourceTrustTier } from './types.ts'

const TRUST_TIER_SCORES: Record<SourceTrustTier, number> = {
  official_doc: 95,
  official_announcement: 90,
  github: 80,
  reputable_publication: 75,
  community: 55,
  unknown: 30,
}

export function scoreForTrustTier(tier: SourceTrustTier): number {
  return TRUST_TIER_SCORES[tier]
}

export function inferTrustTier(source: {
  name: string
  type: string
  trustTier?: SourceTrustTier
  metadata?: Record<string, unknown>
}): SourceTrustTier {
  if (source.trustTier) return source.trustTier

  const metadata = source.metadata ?? {}
  const publisher = String(metadata.publisher ?? '').toLowerCase()
  const official = metadata.official === true

  if (source.type === 'github') return 'github'

  if (official) {
    const docSources = ['react', 'node.js', 'typescript', 'rust', 'postgresql']
    if (docSources.some((name) => source.name.toLowerCase().includes(name))) {
      return 'official_doc'
    }
    return 'official_announcement'
  }

  const reputablePublishers = ['ars technica', 'techcrunch', 'the verge', 'condé nast', 'vox media']
  if (reputablePublishers.some((name) => publisher.includes(name) || source.name.toLowerCase().includes(name))) {
    return 'reputable_publication'
  }

  const communityHints = ['reddit', 'hacker news', 'dev.to', 'medium']
  if (communityHints.some((hint) => source.name.toLowerCase().includes(hint) || source.type === 'web')) {
    return 'community'
  }

  return 'unknown'
}

export function resolveSourceQuality(source: SourceContext): number {
  const tier = inferTrustTier(source)
  return scoreForTrustTier(tier)
}
