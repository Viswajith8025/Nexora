import { corsHeaders, createServiceClient, validateServerEnv } from '../_shared/supabase.ts'
import { validateCronAuth } from '../_shared/auth.ts'
import { createAIProvider, hasAIProviderConfigured } from '../_shared/ai/factory.ts'
import { runArticleProcessing } from '../_shared/ai/process.ts'

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

  const auth = validateCronAuth(req, Deno.env.get('CRON_SECRET'))
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: auth.error ?? 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const env = Deno.env.toObject()
  if (!hasAIProviderConfigured(env)) {
    return new Response(
      JSON.stringify({ error: 'GROQ_API_KEY or GEMINI_API_KEY must be configured' }),
      {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      },
    )
  }

  try {
    const serverEnv = validateServerEnv({
      SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    })

    const supabase = createServiceClient(serverEnv)
    const provider = createAIProvider(env)
    const result = await runArticleProcessing(supabase, provider, env)

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Article processing failed'
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
