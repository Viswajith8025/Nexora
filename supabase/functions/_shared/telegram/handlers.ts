import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIProvider } from '../ai/types.ts'
import type { HandlerResult, UserProfile } from './types.ts'
import { formatArticleAlert, formatArticleList, formatHelp, splitTelegramMessage } from './format.ts'
import { parseCompareArgs } from './parser.ts'
import {
  findProfileByChatId,
  getPublishedArticles,
  getSavedArticles,
  linkTelegramAccount,
  toggleQuietHours,
} from './queries.ts'
import { generateIntelligenceResponse } from './intelligence.ts'
import type { NaturalLanguageRoute } from './natural-language.ts'
import { parseLearnArgs } from './learning-intelligence/parse.ts'
import {
  buildMemoryNote,
  getUserLearningMemory,
  recordLearningQuery,
  upsertLearningProgress,
} from './learning-intelligence/memory.ts'

const CATEGORY_MAP: Record<string, string> = {
  ai: 'AI',
  dev: 'Development',
  cloud: 'Cloud',
  security: 'Security',
  tools: 'Developer Tools',
}

export type HandlerContext = {
  supabase: SupabaseClient
  groq?: AIProvider
  chatId: string
  profile: UserProfile | null
}

function requireLinked(profile: UserProfile | null): string | null {
  if (!profile) {
    return 'Link your Nexora account first. Open Settings in the app and use /start <token> to connect.'
  }
  return null
}

function requireArgs(args: string, example: string): string | null {
  if (!args.trim()) return `Please provide an argument. Example: ${example}`
  return null
}

async function handleToday(ctx: HandlerContext): Promise<HandlerResult> {
  const articles = await getPublishedArticles(ctx.supabase, {
    limit: 5,
    minScore: 70,
    sinceHours: 24,
  })

  if (articles.length > 0 && articles[0]?.relevance_decision === 'breaking') {
    const top = articles[0]
    if (!top) {
      return {
        messages: [formatArticleList(articles, "📅 *Today's important developer updates*")],
      }
    }
    return {
      messages: [
        formatArticleAlert(top, { emoji: '🚨', label: 'IMPORTANT UPDATE' }),
        formatArticleList(articles.slice(1), "📅 *Today's other updates*"),
      ],
    }
  }

  return {
    messages: [formatArticleList(articles, "📅 *Today's important developer updates*")],
  }
}

async function handleLatest(ctx: HandlerContext): Promise<HandlerResult> {
  const articles = await getPublishedArticles(ctx.supabase, { limit: 5, minScore: 60 })
  return {
    messages: [formatArticleList(articles, '📰 *Latest high-relevance articles*')],
  }
}

async function handleCategory(ctx: HandlerContext, categoryKey: string): Promise<HandlerResult> {
  const category = CATEGORY_MAP[categoryKey]
  const articles = await getPublishedArticles(ctx.supabase, { limit: 5, category })
  return {
    messages: [formatArticleList(articles, `📂 *${category} updates*`)],
  }
}

async function handleWeekly(ctx: HandlerContext): Promise<HandlerResult> {
  const articles = await getPublishedArticles(ctx.supabase, {
    limit: 8,
    minScore: 55,
    sinceHours: 24 * 7,
  })
  return {
    messages: [formatArticleList(articles, '📆 *Weekly developer digest*')],
  }
}

async function handleSaved(ctx: HandlerContext): Promise<HandlerResult> {
  const linkError = requireLinked(ctx.profile)
  if (linkError) return { messages: [linkError] }

  const articles = await getSavedArticles(ctx.supabase, ctx.profile!.id, 5)
  return {
    messages: [formatArticleList(articles, '⭐ *Your saved articles*')],
  }
}

function handleSettings(ctx: HandlerContext): HandlerResult {
  const linkError = requireLinked(ctx.profile)
  if (linkError) return { messages: [linkError] }

  const profile = ctx.profile!
  return {
    messages: [
      `⚙️ *Nexora Settings*

Breaking alerts: ${profile.breaking_alerts_enabled ? 'On' : 'Off'}
Morning digest: ${profile.morning_digest_enabled ? 'On' : 'Off'}
Evening digest: ${profile.evening_digest_enabled ? 'On' : 'Off'}
Weekly digest: ${profile.weekly_digest_enabled ? 'On' : 'Off'}
Quiet hours: ${profile.quiet_hours_enabled ? 'On' : 'Off'}
Timezone: ${profile.timezone}

Change preferences in the Nexora web app.`,
    ],
  }
}

function handleStatus(ctx: HandlerContext): HandlerResult {
  const linked = Boolean(ctx.profile)
  return {
    messages: [
      `✅ *Nexora Bot Status*

Account: ${linked ? 'Linked' : 'Not linked'}
Channel: Telegram (primary)
AI: ${ctx.groq ? 'Available' : 'Unavailable'}

Use /help to see commands.`,
    ],
  }
}

async function handleQuiet(ctx: HandlerContext): Promise<HandlerResult> {
  const linkError = requireLinked(ctx.profile)
  if (linkError) return { messages: [linkError] }

  const enabled = !ctx.profile!.quiet_hours_enabled
  await toggleQuietHours(ctx.supabase, ctx.profile!.id, enabled)
  return {
    messages: [`🔕 Quiet hours ${enabled ? 'enabled' : 'disabled'}.`],
  }
}

async function handleStart(ctx: HandlerContext, args: string): Promise<HandlerResult> {
  if (!args.trim()) {
    return {
      messages: [
        `👋 *Welcome to Nexora*

Your personal technology intelligence assistant.

To link your account:
1. Open Nexora Settings
2. Generate a Telegram link token
3. Send /start <token>

Try /help for commands.`,
      ],
    }
  }

  const result = await linkTelegramAccount(ctx.supabase, ctx.chatId, args.trim())
  return { messages: [result.message] }
}

function intelligenceTask(
  ctx: HandlerContext,
  task: 'ask' | 'brief' | 'compare' | 'care' | 'changes' | 'learn',
  query: string,
  options?: {
    topic?: string
    compareA?: string
    compareB?: string
    search?: string
    level?: 'beginner' | 'intermediate' | 'advanced'
  },
): HandlerResult {
  if (!ctx.groq) {
    return { messages: ['AI intelligence is temporarily unavailable. Try /latest instead.'] }
  }

  const topic = options?.topic ?? query

  return {
    messages: ['🔍 Researching…'],
    research: async () => {
      const articles = await getPublishedArticles(ctx.supabase, {
        limit: 8,
        search: options?.search ?? topic,
      })

      let memoryNote: string | undefined
      if (ctx.profile) {
        const memory = await getUserLearningMemory(ctx.supabase, ctx.profile.id)
        memoryNote = buildMemoryNote(memory, topic)
      }

      const answer = await generateIntelligenceResponse(
        ctx.groq!,
        task,
        query,
        articles,
        {
          topic,
          compareA: options?.compareA,
          compareB: options?.compareB,
          level: options?.level,
          memoryNote,
        },
      )

      if (ctx.profile && task !== 'ask') {
        await recordLearningQuery(ctx.supabase, ctx.profile.id, topic, task)
        if (task === 'learn') {
          await upsertLearningProgress(ctx.supabase, ctx.profile.id, topic)
        }
      }

      return splitTelegramMessage(`*Nexora*\n\n${answer}`)
    },
  }
}

async function handleCommand(
  ctx: HandlerContext,
  command: string,
  args: string,
): Promise<HandlerResult> {
  switch (command) {
    case 'start':
      return handleStart(ctx, args)
    case 'help':
      return { messages: [formatHelp()] }
    case 'today':
      return handleToday(ctx)
    case 'latest':
      return handleLatest(ctx)
    case 'weekly':
      return handleWeekly(ctx)
    case 'saved':
      return handleSaved(ctx)
    case 'settings':
      return handleSettings(ctx)
    case 'status':
      return handleStatus(ctx)
    case 'quiet':
      return handleQuiet(ctx)
    case 'ai':
      return handleCategory(ctx, 'ai')
    case 'dev':
      return handleCategory(ctx, 'dev')
    case 'cloud':
      return handleCategory(ctx, 'cloud')
    case 'security':
      return handleCategory(ctx, 'security')
    case 'tools':
      return handleCategory(ctx, 'tools')
    case 'learn': {
      const error = requireArgs(args, '/learn MCP')
      if (error) return { messages: [error] }
      const parsed = parseLearnArgs(args)
      return intelligenceTask(ctx, 'learn', args, {
        topic: parsed.topic,
        level: parsed.level,
        search: parsed.topic,
      })
    }
    case 'ask': {
      const error = requireArgs(args, '/ask What is MCP?')
      if (error) return { messages: [error] }
      return intelligenceTask(ctx, 'ask', args, { search: args })
    }
    case 'brief': {
      const error = requireArgs(args, '/brief Astra')
      if (error) return { messages: [error] }
      return intelligenceTask(ctx, 'brief', args, { topic: args, search: args })
    }
    case 'compare': {
      const error = requireArgs(args, '/compare Next.js Remix')
      if (error) return { messages: [error] }
      const pair = parseCompareArgs(args)
      if (!pair) return { messages: ['Usage: /compare Next.js Remix'] }
      return intelligenceTask(ctx, 'compare', args, {
        compareA: pair[0],
        compareB: pair[1],
        search: pair[0],
      })
    }
    case 'care': {
      const error = requireArgs(args, '/care Rust')
      if (error) return { messages: [error] }
      return intelligenceTask(ctx, 'care', args, { topic: args, search: args })
    }
    case 'changes': {
      const error = requireArgs(args, '/changes Next.js')
      if (error) return { messages: [error] }
      return intelligenceTask(ctx, 'changes', args, { topic: args, search: args })
    }
    default:
      return { messages: ['Unknown command. Try /help'] }
  }
}

export async function handleNaturalLanguage(
  ctx: HandlerContext,
  route: NaturalLanguageRoute,
): Promise<HandlerResult> {
  switch (route.intent) {
    case 'today_digest':
      return handleToday(ctx)
    case 'latest':
      return handleLatest(ctx)
    case 'weekly':
      return handleWeekly(ctx)
    case 'category_ai':
      return handleCategory(ctx, 'ai')
    case 'category_dev':
      return handleCategory(ctx, 'dev')
    case 'category_cloud':
      return handleCategory(ctx, 'cloud')
    case 'category_security':
      return handleCategory(ctx, 'security')
    case 'category_tools':
      return handleCategory(ctx, 'tools')
    case 'explain_topic':
      return intelligenceTask(ctx, 'brief', route.query, {
        topic: route.topic,
        search: route.topic,
      })
    case 'should_learn':
      return intelligenceTask(ctx, 'learn', route.query, {
        topic: route.topic,
        search: route.topic,
        level: route.level,
      })
    case 'care':
      return intelligenceTask(ctx, 'care', route.query, {
        topic: route.topic,
        search: route.topic,
      })
    case 'compare':
      return intelligenceTask(ctx, 'compare', route.query, {
        compareA: route.compareA,
        compareB: route.compareB,
        search: route.compareA,
      })
    case 'changes':
      return intelligenceTask(ctx, 'changes', route.query, {
        topic: route.topic,
        search: route.topic,
      })
    case 'help':
      return { messages: [formatHelp()] }
    case 'ask':
    default:
      return intelligenceTask(ctx, 'ask', route.query, { search: route.query })
  }
}

export async function buildHandlerContext(
  supabase: SupabaseClient,
  chatId: string,
  groq?: AIProvider,
): Promise<HandlerContext> {
  const profile = await findProfileByChatId(supabase, chatId)
  return { supabase, groq, chatId, profile }
}

export async function dispatchCommand(
  ctx: HandlerContext,
  command: string,
  args: string,
): Promise<HandlerResult> {
  return handleCommand(ctx, command, args)
}
