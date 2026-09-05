import { corsHeaders } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'nexora',
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    },
  )
})
