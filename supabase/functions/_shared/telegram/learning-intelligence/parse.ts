export type LearnLevel = 'beginner' | 'intermediate' | 'advanced'

export function parseLearnArgs(args: string): { topic: string; level: LearnLevel } {
  const trimmed = args.trim()
  if (!trimmed) return { topic: '', level: 'intermediate' }

  const advanced = /\s+(advanced|expert)$/i
  const beginner = /\s+(beginner|intro|introduction)$/i

  if (advanced.test(trimmed)) {
    return {
      topic: trimmed.replace(advanced, '').trim(),
      level: 'advanced',
    }
  }

  if (beginner.test(trimmed)) {
    return {
      topic: trimmed.replace(beginner, '').trim(),
      level: 'beginner',
    }
  }

  return { topic: trimmed, level: 'intermediate' }
}

export function normalizeTopic(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function topicKeywords(topic: string): string[] {
  return normalizeTopic(topic)
    .split(/[\s,/]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2)
}
