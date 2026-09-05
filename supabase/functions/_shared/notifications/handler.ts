import { corsHeaders, createServiceClient, validateServerEnv } from '../supabase.ts'
import { validateCronAuth } from '../auth.ts'
import { TelegramClient } from '../telegram/client.ts'
import {
  runBreakingAlertsJob,
  runEveningDigestJob,
  runMorningDigestJob,
  runWeeklyDigestJob,
} from './dispatch.ts'

export type DispatchJob = 'morning' | 'evening' | 'weekly' | 'breaking'

export function serveDispatchJob(job: DispatchJob) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders(req) })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const auth = validateCronAuth(req, Deno.env.get('CRON_SECRET'))
    if (!auth.authorized) {
      return new Response(JSON.stringify({ error: auth.error ?? 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN is not configured' }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    try {
      const env = validateServerEnv({
        SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
        SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      })

      const supabase = createServiceClient(env)
      const telegram = new TelegramClient({ botToken })

      const result =
        job === 'morning'
          ? await runMorningDigestJob(supabase, telegram)
          : job === 'evening'
            ? await runEveningDigestJob(supabase, telegram)
            : job === 'weekly'
              ? await runWeeklyDigestJob(supabase, telegram)
              : await runBreakingAlertsJob(supabase, telegram)

      return new Response(JSON.stringify({ success: true, result }), {
        status: 200,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Dispatch failed'
      return new Response(JSON.stringify({ success: false, error: message }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }
  }
}
