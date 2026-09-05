// @vitest-environment node
import type {
  ArticleContext,
  ArticleScores,
  RelevanceInput,
  SourceContext,
  UserInterest,
  UserPreferences,
} from '../../supabase/functions/_shared/relevance/types.ts'

export const defaultPreferences: UserPreferences = {
  breakingAlertsEnabled: true,
  morningDigestEnabled: true,
  eveningDigestEnabled: false,
  weeklyDigestEnabled: true,
  notificationThreshold: 55,
}

export function buildInput(
  article: ArticleContext,
  scores: ArticleScores,
  source: SourceContext,
  options?: {
    userInterests?: UserInterest[]
    followedTopics?: string[]
    feedback?: Array<'relevant' | 'not_relevant' | 'save' | 'dismiss'>
    preferences?: UserPreferences
  },
): RelevanceInput {
  const input: RelevanceInput = { article, scores, source }

  if (options?.userInterests || options?.followedTopics || options?.feedback) {
    input.user = {
      interests: options.userInterests ?? [],
      followedTopics: options.followedTopics ?? [],
      feedback: options.feedback ?? [],
      preferences: options.preferences ?? defaultPreferences,
    }
  }

  return input
}

export const officialAiSource: SourceContext = {
  name: 'OpenAI Blog',
  type: 'rss',
  trustTier: 'official_announcement',
  metadata: { publisher: 'OpenAI', official: true },
}

export const officialFrameworkSource: SourceContext = {
  name: 'Vercel Blog',
  type: 'rss',
  trustTier: 'official_announcement',
  metadata: { publisher: 'Vercel', official: true },
}

export const securitySource: SourceContext = {
  name: 'CISA Cybersecurity Advisories',
  type: 'rss',
  trustTier: 'official_announcement',
  metadata: { publisher: 'CISA', official: true },
}

export const tabloidSource: SourceContext = {
  name: 'Celebrity Tech Daily',
  type: 'rss',
  trustTier: 'unknown',
}

export const majorAiModelRelease = buildInput(
  {
    id: 'ai-model-1',
    title: 'OpenAI Announces GPT-5 with Major Coding and Reasoning Improvements',
    category: 'AI',
    tags: ['openai', 'gpt-5', 'model'],
    verificationStatus: 'verified',
    whatHappened: 'OpenAI released GPT-5, a new frontier model with major coding gains.',
    aiSummary: 'GPT-5 launches with improved developer APIs and benchmark performance.',
  },
  {
    importance: 95,
    developerRelevance: 92,
    urgency: 82,
    novelty: 90,
    confidence: 88,
  },
  officialAiSource,
  {
    userInterests: [{ interestType: 'category', value: 'AI', weight: 90 }],
    followedTopics: ['openai', 'llm'],
  },
)

export const criticalSecurityVulnerability = buildInput(
  {
    id: 'sec-1',
    title: 'Critical CVE-2024-99999 Remote Code Execution in Popular Web Framework',
    category: 'Security',
    tags: ['cve', 'security', 'rce'],
    verificationStatus: 'verified',
    whatHappened: 'A critical remote code execution vulnerability is being actively exploited.',
    aiSummary: 'Developers should patch immediately.',
  },
  {
    importance: 88,
    developerRelevance: 85,
    urgency: 95,
    novelty: 70,
    confidence: 90,
  },
  securitySource,
)

export const minorNpmPatch = buildInput(
  {
    id: 'npm-1',
    title: 'lodash 4.17.22 patch release with bug fixes only',
    category: 'Development',
    tags: ['npm', 'lodash'],
    verificationStatus: 'verified',
    whatHappened: 'A minor patch release fixes edge-case bugs.',
    aiSummary: 'Routine maintenance update.',
  },
  {
    importance: 18,
    developerRelevance: 22,
    urgency: 12,
    novelty: 8,
    confidence: 80,
  },
  {
    name: 'npm Blog',
    type: 'rss',
    trustTier: 'official_announcement',
  },
)

export const celebrityTechArticle = buildInput(
  {
    id: 'celeb-1',
    title: "Taylor Swift's favorite iPhone cases you won't believe",
    category: 'Technology Industry',
    tags: ['celebrity', 'gadgets'],
    verificationStatus: 'unverified',
    whatHappened: 'Celebrity gadget roundup with little developer relevance.',
    aiSummary: 'Consumer entertainment story.',
  },
  {
    importance: 25,
    developerRelevance: 10,
    urgency: 15,
    novelty: 20,
    confidence: 40,
  },
  tabloidSource,
)

export const majorNextJsRelease = buildInput(
  {
    id: 'next-1',
    title: 'Next.js 15 Released with Major Platform Changes',
    category: 'Development',
    tags: ['nextjs', 'react', 'vercel'],
    verificationStatus: 'verified',
    whatHappened: 'Vercel shipped Next.js 15 with breaking platform changes for app router.',
    aiSummary: 'Major framework release affects production Next.js apps.',
  },
  {
    importance: 86,
    developerRelevance: 94,
    urgency: 72,
    novelty: 78,
    confidence: 88,
  },
  officialFrameworkSource,
  {
    userInterests: [{ interestType: 'technology', value: 'nextjs', weight: 85 }],
    followedTopics: ['react'],
  },
)

export const consumerGadgetArticle = buildInput(
  {
    id: 'gadget-1',
    title: 'Best smartwatch wireless earbuds fitness tracker roundup for 2026',
    category: 'Technology Industry',
    tags: ['consumer', 'gadgets'],
    verificationStatus: 'unverified',
    whatHappened: 'Consumer electronics buying guide.',
    aiSummary: 'Low developer value consumer roundup.',
  },
  {
    importance: 22,
    developerRelevance: 12,
    urgency: 10,
    novelty: 15,
    confidence: 45,
  },
  tabloidSource,
)

export const duplicateNews = buildInput(
  {
    id: 'dup-1',
    title: 'OpenAI Announces GPT-5 with Major Coding Improvements',
    category: 'AI',
    tags: ['openai', 'gpt-5'],
    verificationStatus: 'verified',
    whatHappened: 'Duplicate coverage of an already reported GPT-5 launch.',
    aiSummary: 'Second outlet repeats the same announcement.',
    clusterKey: 'openai-gpt-5-launch',
    isDuplicate: true,
  },
  {
    importance: 70,
    developerRelevance: 75,
    urgency: 50,
    novelty: 30,
    confidence: 80,
  },
  {
    name: 'Tech News Aggregator',
    type: 'rss',
    trustTier: 'community',
  },
)
