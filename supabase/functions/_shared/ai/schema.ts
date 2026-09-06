import { z, type ZodIssue } from 'npm:zod@3.23.8'

export const contentCategories = [
  'AI',
  'Development',
  'Cloud',
  'Security',
  'Developer Tools',
  'Databases',
  'Technology Industry',
] as const

export const notificationLevels = ['breaking', 'high', 'normal', 'low', 'none'] as const

export const verificationStatuses = [
  'unverified',
  'pending',
  'verified',
  'disputed',
  'rejected',
] as const

const scoreSchema = z.number().int().min(0).max(100)

export const articleAnalysisSchema = z.object({
  what_happened: z.string().min(10).max(3000),
  short_summary: z.string().min(10).max(2000),
  one_sentence_takeaway: z.string().min(10).max(500),
  why_it_matters: z.string().min(10).max(2000),
  developer_impact: z.string().min(10).max(2000),
  technical_impact: z.string().min(10).max(2000),
  who_should_care: z.string().min(10).max(1000),
  recommended_action: z.string().min(5).max(1000),
  category: z.enum(contentCategories),
  tags: z.array(z.string().min(1).max(50)).min(1).max(15),
  importance_score: scoreSchema,
  developer_relevance_score: scoreSchema,
  urgency_score: scoreSchema,
  confidence_score: scoreSchema,
  novelty_score: scoreSchema,
  notification_level: z.enum(notificationLevels),
  verification_status: z.enum(verificationStatuses),
})

export type ArticleAnalysis = z.infer<typeof articleAnalysisSchema>

export function parseArticleAnalysis(raw: string): {
  success: true
  data: ArticleAnalysis
} | {
  success: false
  error: string
} {
  const jsonText = extractJsonObject(raw)
  if (!jsonText) {
    return { success: false, error: 'No JSON object found in AI response' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return { success: false, error: 'AI response is not valid JSON' }
  }

  const result = articleAnalysisSchema.safeParse(parsed)
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((issue: ZodIssue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
    }
  }

  return { success: true, data: result.data }
}

export function extractJsonObject(text: string): string | null {
  const trimmed = text.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1)
  }

  return null
}
