import { corsHeaders, createServiceClient, validateServerEnv } from '../_shared/supabase.ts'
import { validateCronAuth } from '../_shared/auth.ts'
import { createGroqProvider } from '../_shared/ai/groq-provider.ts'
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

  if (!Deno.env.get('GROQ_API_KEY')) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY is not configured' }), {
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
    const provider = createGroqProvider(Deno.env.toObject())
    const result = await runArticleProcessing(supabase, provider, Deno.env.toObject())

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
