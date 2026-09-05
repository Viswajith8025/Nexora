import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { data: profile } = await userClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayIso = todayStart.toISOString()

  const [
    lastIngestion,
    lastAiProcessing,
    lastTelegram,
    lastGmail,
    failedSources,
    failedJobs,
    articlesToday,
    notificationsToday,
    aiToday,
  ] = await Promise.all([
    admin.from('cron_runs').select('completed_at, status, job_name').eq('job_name', 'ingest-sources').order('completed_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('cron_runs').select('completed_at, status').eq('job_name', 'process-articles').order('completed_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('notification_deliveries').select('created_at').eq('channel', 'telegram').eq('status', 'success').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('notification_deliveries').select('created_at').eq('channel', 'email').eq('status', 'success').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('sources').select('name, metadata').eq('is_active', true).not('metadata->>last_error', 'is', null).limit(10),
    admin.from('cron_runs').select('job_name, completed_at, error').eq('status', 'failed').order('completed_at', { ascending: false }).limit(10),
    admin.from('articles').select('id', { count: 'exact', head: true }).gte('discovered_at', todayIso),
    admin.from('notifications').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', todayIso),
    admin.from('ai_generations').select('id, status, duration_ms, model').gte('created_at', todayIso).order('created_at', { ascending: false }).limit(50),
  ])

  const aiCalls = aiToday.data?.length ?? 0
  const aiFailures = aiToday.data?.filter((row) => row.status === 'failed').length ?? 0
  const avgDuration = aiToday.data?.length
    ? Math.round(
        aiToday.data.reduce((sum, row) => sum + (row.duration_ms ?? 0), 0) / aiToday.data.length,
      )
    : 0

  return new Response(
    JSON.stringify({
      lastIngestion: lastIngestion.data,
      lastAiProcessing: lastAiProcessing.data,
      lastTelegramDelivery: lastTelegram.data?.created_at ?? null,
      lastGmailDelivery: lastGmail.data?.created_at ?? null,
      failedSources: failedSources.data ?? [],
      failedJobs: failedJobs.data ?? [],
      articlesProcessedToday: articlesToday.count ?? 0,
      notificationsSentToday: notificationsToday.count ?? 0,
      aiUsage: { calls: aiCalls, failures: aiFailures, avgDurationMs: avgDuration },
    }),
    { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
  )
})
