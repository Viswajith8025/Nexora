import { z } from 'zod'

export const sectionKindSchema = z.enum(['verified', 'inference', 'opinion'])

export const intelligenceSectionSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  kind: sectionKindSchema,
})

export const intelligenceResponseSchema = z.object({
  headline: z.string().min(1),
  sections: z.array(intelligenceSectionSchema).min(1),
  sources: z.array(z.string()).default([]),
  meetingExplanation30s: z.string().optional(),
  relevanceScore: z.number().min(0).max(100).optional(),
})

export type IntelligenceSection = z.infer<typeof intelligenceSectionSchema>
export type IntelligenceResponse = z.infer<typeof intelligenceResponseSchema>

export function parseIntelligenceResponse(raw: string): IntelligenceResponse {
  const trimmed = raw.trim()
  const jsonStart = trimmed.indexOf('{')
  const jsonEnd = trimmed.lastIndexOf('}')
  const candidate = jsonStart >= 0 && jsonEnd > jsonStart
    ? trimmed.slice(jsonStart, jsonEnd + 1)
    : trimmed

  const parsed = JSON.parse(candidate) as unknown
  return intelligenceResponseSchema.parse(parsed)
}
