import { z } from 'zod'

export const telegramUserSchema = z.object({
  id: z.number(),
  is_bot: z.boolean().optional(),
  first_name: z.string().optional(),
  username: z.string().optional(),
})

export const telegramChatSchema = z.object({
  id: z.number(),
  type: z.enum(['private', 'group', 'supergroup', 'channel']),
})

export const telegramMessageSchema = z.object({
  message_id: z.number(),
  from: telegramUserSchema.optional(),
  chat: telegramChatSchema,
  date: z.number(),
  text: z.string().optional(),
})

export const telegramUpdateSchema = z.object({
  update_id: z.number(),
  message: telegramMessageSchema.optional(),
})

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>
export type TelegramMessage = z.infer<typeof telegramMessageSchema>

export type ParsedCommand = {
  command: string
  args: string
  raw: string
}

export type UserProfile = {
  id: string
  display_name: string | null
  timezone: string
  telegram_enabled: boolean
  telegram_chat_id: string | null
  morning_digest_enabled: boolean
  evening_digest_enabled: boolean
  weekly_digest_enabled: boolean
  breaking_alerts_enabled: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

export type ArticleSummary = {
  id: string
  title: string
  canonical_url: string
  category: string | null
  ai_summary: string | null
  what_happened: string | null
  one_sentence_takeaway: string | null
  why_it_matters: string | null
  developer_impact: string | null
  recommended_action: string | null
  importance_score: number | null
  developer_relevance_score: number | null
  relevance_score: number | null
  relevance_decision: string | null
  published_at: string | null
  discovered_at: string
  tags: string[]
}

export type HandlerResult = {
  messages: string[]
  research?: () => Promise<string[]>
}

export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096

export const COMMAND_HELP: Record<string, string> = {
  start: 'Link your Nexora account',
  help: 'Show available commands',
  today: "Today's important developer updates",
  latest: 'Latest high-relevance articles',
  ai: 'AI news and updates',
  dev: 'Development news',
  cloud: 'Cloud platform updates',
  security: 'Security advisories',
  tools: 'Developer tools news',
  learn: 'Learning resources — /learn MCP',
  ask: 'Ask a question — /ask What is MCP?',
  brief: 'Quick brief — /brief Astra',
  compare: 'Compare technologies — /compare Next.js Remix',
  care: 'Who should care — /care Rust',
  changes: 'Recent changes — /changes Next.js',
  weekly: 'Weekly digest summary',
  saved: 'Your saved articles',
  settings: 'Notification preferences',
  status: 'Bot and account status',
  quiet: 'Toggle quiet hours',
}
