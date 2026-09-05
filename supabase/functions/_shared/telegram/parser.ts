import type { ParsedCommand } from './types.ts'

const BOT_COMMAND_PATTERN = /^\/([a-z0-9_]+)(?:@([a-zA-Z0-9_]+))?(?:\s+([\s\S]*))?$/

export function parseCommand(text: string): ParsedCommand | null {
  const trimmed = text.trim()
  const match = trimmed.match(BOT_COMMAND_PATTERN)
  if (!match) return null

  return {
    command: match[1]!.toLowerCase(),
    args: (match[3] ?? '').trim(),
    raw: trimmed,
  }
}

export function isCommand(text: string): boolean {
  return parseCommand(text) !== null
}

export function parseCompareArgs(args: string): [string, string] | null {
  const trimmed = args.trim()
  if (!trimmed) return null

  const quoted = trimmed.match(/^"([^"]+)"\s+"([^"]+)"$/)
  if (quoted?.[1] && quoted[2]) return [quoted[1], quoted[2]]

  const parts = trimmed.split(/\s+/)
  if (parts.length >= 2) {
    const midpoint = Math.ceil(parts.length / 2)
    return [parts.slice(0, midpoint).join(' '), parts.slice(midpoint).join(' ')]
  }

  return null
}
