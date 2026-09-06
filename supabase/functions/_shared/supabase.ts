import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type ServerEnv = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export function validateServerEnv(env: Record<string, string | undefined>): ServerEnv {
  const supabaseUrl = env.SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) throw new Error('SUPABASE_URL is required')
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')

  return { SUPABASE_URL: supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey }
}

export function createServiceClient(env: ServerEnv) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function getAllowedOrigins(): string[] {
  const deno = (globalThis as { Deno?: { env: { get: (key: string) => string | undefined } } }).Deno
  const configured = deno?.env.get('APP_URL')
  if (!configured) return ['*']
  return configured.split(',').map((origin) => origin.trim()).filter(Boolean)
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

function originAllowed(requestOrigin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.includes('*')) return true
  if (allowedOrigins.includes(requestOrigin)) return true
  const allowsLocalhost = allowedOrigins.some((origin) => isLocalDevOrigin(origin))
  return allowsLocalhost && isLocalDevOrigin(requestOrigin)
}

export function corsHeaders(req?: Request) {
  const allowedOrigins = getAllowedOrigins()
  const requestOrigin = req?.headers.get('Origin')
  let origin = allowedOrigins[0] ?? '*'

  if (requestOrigin && originAllowed(requestOrigin, allowedOrigins)) {
    origin = requestOrigin
  } else if (allowedOrigins.length === 1 && allowedOrigins[0] !== '*') {
    origin = allowedOrigins[0]
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-cron-secret, x-telegram-bot-api-secret-token',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  }
}
