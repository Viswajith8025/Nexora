import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIProvider } from '../ai/types.ts'
import type { HandlerResult, UserProfile } from './types.ts'
import {
  formatArticleAlert,
  formatArticleList,
  formatHelp,
  formatWelcome,
  formatLinkedWelcome,
  toOutboundMessages,
  escapeHtml,
} from './format.ts'
import { chatFollowUpKeyboard, intelligenceFollowUpKeyboard, mainMenuKeyboard } from './keyboards.ts'
import { parseCompareArgs } from './parser.ts'
import {
  findProfileByChatId,
  getPublishedArticles,
  resolveChatArticles,
  getSavedArticles,
  linkTelegramAccount,
  toggleQuietHours,
} from './queries.ts'
import { generateChatResponse, generateIntelligenceResponse } from './intelligence.ts'
import type { NaturalLanguageRoute } from './natural-language.ts'
import { parseLearnArgs } from './learning-intelligence/parse.ts'
import {
  buildMemoryNote,
  getUserLearningMemory,
  recordLearningQuery,
  upsertLearningProgress,
} from './learning-intelligence/memory.ts'
import {
  appendChatTurn,
  clearChatHistory,
  loadChatHistory,
} from './conversation.ts'

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
        messages: [formatArticleList(articles, "📅 <b>Today's important developer updates</b>")],
      }
    }
    return {
      messages: [
        formatArticleAlert(top, { emoji: '🚨', label: 'IMPORTANT UPDATE' }),
        formatArticleList(articles.slice(1), "📅 <b>Today's other updates</b>"),
      ],
    }
  }

  return {
    messages: [formatArticleList(articles, "📅 <b>Today's important developer updates</b>")],
  }
}

async function handleLatest(ctx: HandlerContext): Promise<HandlerResult> {
  const articles = await getPublishedArticles(ctx.supabase, { limit: 5, minScore: 60 })
  return {
    messages: [formatArticleList(articles, '📰 <b>Latest high-relevance articles</b>')],
  }
}

async function handleCategory(ctx: HandlerContext, categoryKey: string): Promise<HandlerResult> {
  const category = CATEGORY_MAP[categoryKey]
  const articles = await getPublishedArticles(ctx.supabase, { limit: 5, category })
  return {
    messages: [formatArticleList(articles, `📂 <b>${category} updates</b>`)],
  }
}

async function handleWeekly(ctx: HandlerContext): Promise<HandlerResult> {
  const articles = await getPublishedArticles(ctx.supabase, {
    limit: 8,
    minScore: 55,
    sinceHours: 24 * 7,
  })
  return {
    messages: [formatArticleList(articles, '📆 <b>Weekly developer digest</b>')],
  }
}

async function handleSaved(ctx: HandlerContext): Promise<HandlerResult> {
  const linkError = requireLinked(ctx.profile)
  if (linkError) return { messages: [linkError] }

  const articles = await getSavedArticles(ctx.supabase, ctx.profile!.id, 5)
  return {
    messages: [formatArticleList(articles, '⭐ <b>Your saved articles</b>')],
  }
}

function handleSettings(ctx: HandlerContext): HandlerResult {
  const linkError = requireLinked(ctx.profile)
  if (linkError) return { messages: [linkError] }

  const profile = ctx.profile!
  return {
    messages: [
      {
        text: `⚙️ <b>Nexora Settings</b>

Breaking alerts: ${profile.breaking_alerts_enabled ? '✅ On' : 'Off'}
Morning digest: ${profile.morning_digest_enabled ? '✅ On' : 'Off'}
Evening digest: ${profile.evening_digest_enabled ? '✅ On' : 'Off'}
Weekly digest: ${profile.weekly_digest_enabled ? '✅ On' : 'Off'}
Quiet hours: ${profile.quiet_hours_enabled ? 'On' : 'Off'}
Timezone: <code>${escapeHtml(profile.timezone)}</code>

Change preferences in the Nexora web app.`,
        keyboard: mainMenuKeyboard(),
      },
    ],
  }
}

function handleStatus(ctx: HandlerContext): HandlerResult {
  const linked = Boolean(ctx.profile)
  return {
    messages: [
      {
        text: `✅ <b>Nexora Bot Status</b>

Account: ${linked ? '✅ Linked' : '❌ Not linked'}
Channel: Telegram (primary)
AI: ${ctx.groq ? '✅ Available' : '❌ Unavailable'}`,
        keyboard: mainMenuKeyboard(),
      },
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
    return { messages: [formatWelcome()] }
  }

  const result = await linkTelegramAccount(ctx.supabase, ctx.chatId, args.trim())
  if (result.success) {
    return { messages: [formatLinkedWelcome()] }
  }

  return {
    messages: [
      {
        text: `❌ ${escapeHtml(result.message)}`,
        keyboard: mainMenuKeyboard(),
      },
    ],
  }
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
  const isChat = task === 'ask'

  return {
    messages: [{ text: isChat ? '💭 <i>Thinking…</i>' : '🔍 <i>Researching…</i>' }],
    research: async () => {
      const articles = await resolveChatArticles(ctx.supabase, options?.search ?? topic)

      let memoryNote: string | undefined
      if (ctx.profile) {
        const memory = await getUserLearningMemory(ctx.supabase, ctx.profile.id)
        memoryNote = buildMemoryNote(memory, topic)
      }

      const history = isChat ? await loadChatHistory(ctx.supabase, ctx.chatId) : []

      let displayAnswer = ''
      if (isChat) {
        const chat = await generateChatResponse(
          ctx.groq!,
          query,
          articles,
          history,
          memoryNote,
        )
        displayAnswer = chat.html
        await appendChatTurn(ctx.supabase, ctx.chatId, ctx.profile?.id, 'user', query)
        await appendChatTurn(ctx.supabase, ctx.chatId, ctx.profile?.id, 'assistant', chat.plain)
      } else {
        displayAnswer = await generateIntelligenceResponse(
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
      }

      if (ctx.profile && task !== 'ask') {
        await recordLearningQuery(ctx.supabase, ctx.profile.id, topic, task)
        if (task === 'learn') {
          await upsertLearningProgress(ctx.supabase, ctx.profile.id, topic)
        }
      }

      const keyboard = isChat
        ? chatFollowUpKeyboard()
        : intelligenceFollowUpKeyboard(topic)

      return toOutboundMessages(displayAnswer, {
        keyboard,
        disableWebPagePreview: true,
      })
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
      return { messages: [{ text: formatHelp(), keyboard: mainMenuKeyboard() }] }
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
    case 'ask':
    case 'chat': {
      const error = requireArgs(args, '/chat What is MCP?')
      if (error) return { messages: [error] }
      return intelligenceTask(ctx, 'ask', args, { search: args })
    }
    case 'clear':
    case 'newchat':
      await clearChatHistory(ctx.supabase, ctx.chatId)
      return {
        messages: [
          {
            text: '🆕 <b>Fresh chat started!</b>\n\nAsk me anything — tech, career, news, or just say hi.',
            keyboard: chatFollowUpKeyboard(),
          },
        ],
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
      return { messages: [{ text: formatHelp(), keyboard: mainMenuKeyboard() }] }
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

export async function dispatchCallbackAction(
  ctx: HandlerContext,
  data: string,
): Promise<HandlerResult> {
  if (!data.startsWith('act:')) {
    return { messages: ['Unknown action. Try /help'] }
  }

  const payload = data.slice(4)
  const colonIndex = payload.indexOf(':')
  const action = colonIndex >= 0 ? payload.slice(0, colonIndex) : payload
  const arg = colonIndex >= 0 ? payload.slice(colonIndex + 1) : ''

  switch (action) {
    case 'today':
      return handleToday(ctx)
    case 'latest':
      return handleLatest(ctx)
    case 'weekly':
      return handleWeekly(ctx)
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
    case 'help':
      return { messages: [{ text: formatHelp(), keyboard: mainMenuKeyboard() }] }
    case 'settings':
      return handleSettings(ctx)
    case 'clear':
      await clearChatHistory(ctx.supabase, ctx.chatId)
      return {
        messages: [
          {
            text: '🆕 <b>Fresh chat started!</b>\n\nAsk me anything — tech, career, news, or just say hi.',
            keyboard: chatFollowUpKeyboard(),
          },
        ],
      }
    case 'chat':
      return {
        messages: [
          {
            text: '💬 <b>Ask me anything!</b>\n\nChat naturally — tech, companies, career, or casual questions.\n• What is Nvidia working on?\n• Should I learn Rust?\n• What happened in AI today?',
            keyboard: chatFollowUpKeyboard(),
          },
        ],
      }
    case 'learn':
      if (!arg) return { messages: ['Try /learn MCP'] }
      return intelligenceTask(ctx, 'learn', arg, { topic: arg, search: arg })
    case 'brief':
      if (!arg) return { messages: ['Try /brief Astra'] }
      return intelligenceTask(ctx, 'brief', arg, { topic: arg, search: arg })
    case 'compare':
      if (!arg) return { messages: ['Try /compare Next.js Remix'] }
      return {
        messages: [
          {
            text: `⚖️ <b>Compare what with ${escapeHtml(arg)}?</b>\n\nSend: <code>/compare ${escapeHtml(arg)} &lt;other&gt;</code>`,
            keyboard: intelligenceFollowUpKeyboard(arg),
          },
        ],
      }
    default:
      return { messages: ['Unknown action. Try /help'] }
  }
}

export async function dispatchCommand(
  ctx: HandlerContext,
  command: string,
  args: string,
): Promise<HandlerResult> {
  return handleCommand(ctx, command, args)
}
