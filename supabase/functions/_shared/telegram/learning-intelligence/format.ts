import type { IntelligenceResponse, IntelligenceSection } from './schema.ts'

const KIND_LABELS: Record<IntelligenceSection['kind'], string> = {
  verified: '✅ Verified',
  inference: '🔍 Inference',
  opinion: '💭 Opinion',
}

export function formatIntelligenceResponse(
  task: string,
  response: IntelligenceResponse,
): string {
  const lines: string[] = [`*${response.headline}*`, `_${task.toUpperCase()}_`, '']

  for (const section of response.sections) {
    lines.push(`*${section.title}*`)
    lines.push(`_${KIND_LABELS[section.kind]}_`)
    lines.push(section.content)
    lines.push('')
  }

  if (response.meetingExplanation30s) {
    lines.push('*30-second meeting explanation*')
    lines.push(response.meetingExplanation30s)
    lines.push('')
  }

  if (response.relevanceScore !== undefined) {
    lines.push(`*Relevance score:* ${response.relevanceScore}/100`)
    lines.push('')
  }

  if (response.sources.length > 0) {
    lines.push('*Sources*')
    for (const source of response.sources.slice(0, 5)) {
      lines.push(`• ${source}`)
    }
  }

  return lines.join('\n').trim()
}
