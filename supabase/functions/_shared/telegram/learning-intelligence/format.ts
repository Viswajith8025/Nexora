import type { IntelligenceResponse, IntelligenceSection } from './schema.ts'
import { escapeHtml } from '../format.ts'

const KIND_LABELS: Record<IntelligenceSection['kind'], string> = {
  verified: '✅ Verified',
  inference: '🔍 Inference',
  opinion: '💭 Opinion',
}

const TASK_LABELS: Record<string, string> = {
  brief: '📋 Quick Brief',
  learn: '📚 Learning Guide',
  compare: '⚖️ Comparison',
  care: '🎯 Who Should Care',
  changes: '🔄 Recent Changes',
}

const SECTION_DIVIDER = '━━━━━━━━━━━━━━'

export function formatIntelligenceResponse(
  task: string,
  response: IntelligenceResponse,
): string {
  const taskLabel = TASK_LABELS[task] ?? task.toUpperCase()
  const lines: string[] = [
    `<b>${escapeHtml(response.headline)}</b>`,
    `<i>${escapeHtml(taskLabel)}</i>`,
    '',
  ]

  for (const section of response.sections) {
    lines.push(`<b>${escapeHtml(section.title)}</b>`)
    lines.push(`<i>${KIND_LABELS[section.kind]}</i>`)
    lines.push(escapeHtml(section.content))
    lines.push(SECTION_DIVIDER)
    lines.push('')
  }

  if (response.meetingExplanation30s) {
    lines.push('<b>🎤 30-second meeting explanation</b>')
    lines.push(escapeHtml(response.meetingExplanation30s))
    lines.push('')
  }

  if (response.relevanceScore !== undefined) {
    lines.push(`📊 <b>Relevance:</b> ${response.relevanceScore}/100`)
    lines.push('')
  }

  if (response.sources.length > 0) {
    lines.push('<b>📎 Sources</b>')
    for (const source of response.sources.slice(0, 5)) {
      const isUrl = source.startsWith('http')
      lines.push(
        isUrl
          ? `• <a href="${source}">${escapeHtml(truncateUrl(source))}</a>`
          : `• ${escapeHtml(source)}`,
      )
    }
  }

  return lines.join('\n').trim()
}

function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.length > 30 ? `${parsed.pathname.slice(0, 28)}…` : parsed.pathname
    return `${parsed.hostname}${path}`
  } catch {
    return url.length > 50 ? `${url.slice(0, 48)}…` : url
  }
}
