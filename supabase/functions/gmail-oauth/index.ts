import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildGmailAuthUrl, exchangeGmailCode } from '../_shared/gmail/oauth.ts'
import { corsHeaders, createServiceClient, validateServerEnv } from '../_shared/supabase.ts'
import { createOAuthState, parseOAuthState } from '../_shared/security/oauth-state.ts'

function oauthSigningSecret(serviceKey: string): string {
  const cronSecret = Deno.env.get('CRON_SECRET')
  return cronSecret ?? serviceKey
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  const env = validateServerEnv({
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  })
  const supabaseUrl = env.SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!anonKey) {
    return new Response(JSON.stringify({ error: 'SUPABASE_ANON_KEY is not configured' }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'DELETE') {
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const admin = createServiceClient(env)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    await admin.from('gmail_connections').delete().eq('user_id', user.id)
    await admin.from('profiles').update({ gmail_enabled: false, gmail_address: null }).eq('id', user.id)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(req.url)
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
  const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')

  if (!clientId || !clientSecret || !redirectUri) {
    return new Response(JSON.stringify({ error: 'Gmail OAuth not configured' }), {
      status: 503,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const signingSecret = oauthSigningSecret(serviceKey)

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (code && state) {
    try {
      const userId = await parseOAuthState(state, signingSecret)
      if (!userId) {
        return new Response('Invalid or expired OAuth state', { status: 400 })
      }

      const { refreshToken, email } = await exchangeGmailCode(code, clientId, clientSecret, redirectUri)
      const admin = createServiceClient(env)

      await admin.from('gmail_connections').upsert({
        user_id: userId,
        email,
        refresh_token: refreshToken,
      })

      await admin.from('profiles').update({
        gmail_enabled: true,
        gmail_address: email,
      }).eq('id', userId)

      const appUrl = Deno.env.get('APP_URL')?.split(',')[0]?.trim() ?? 'http://localhost:5173'
      return Response.redirect(`${appUrl}/settings?gmail=connected`, 302)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth failed'
      return new Response(message, { status: 400 })
    }
  }

  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const signedState = await createOAuthState(user.id, signingSecret)
  const authUrl = buildGmailAuthUrl(clientId, redirectUri, signedState)
  return new Response(JSON.stringify({ authUrl }), {
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
})
