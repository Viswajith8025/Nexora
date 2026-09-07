import { corsHeaders, createServiceClient, validateServerEnv } from '../_shared/supabase.ts'
import { validateTelegramWebhook } from '../_shared/telegram/auth.ts'
import { TelegramClient } from '../_shared/telegram/client.ts'
import { processTelegramUpdate } from '../_shared/telegram/router.ts'
import { createAIProvider, hasAIProviderConfigured } from '../_shared/ai/factory.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const webhookAuth = validateTelegramWebhook(req, Deno.env.get('TELEGRAM_WEBHOOK_SECRET'))
  if (!webhookAuth.valid) {
    return new Response(JSON.stringify({ error: webhookAuth.error ?? 'Unauthorized' }), {
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
    const serverEnv = validateServerEnv({
      SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    })

    const supabase = createServiceClient(serverEnv)
    const telegram = new TelegramClient({ botToken })
    const runtimeEnv = Deno.env.toObject()
    const groq = hasAIProviderConfigured(runtimeEnv) ? createAIProvider(runtimeEnv) : undefined

    const update = await req.json()
    const result = await processTelegramUpdate(supabase, telegram, update, groq)

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: result.error && !result.handled ? 400 : 200,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Telegram webhook failed'
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
