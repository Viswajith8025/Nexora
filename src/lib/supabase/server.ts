/**
 * Server-side Supabase client factory for Edge Functions.
 *
 * This module documents the privileged client pattern.
 * The actual implementation lives in `supabase/functions/_shared/supabase.ts`
 * and must only run in Deno Edge Function context — never in the browser.
 */

export type ServerSupabaseConfig = {
  supabaseUrl: string
  serviceRoleKey: string
}

export function validateServerSecrets(env: Record<string, string | undefined>): ServerSupabaseConfig {
  const supabaseUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is required for server-side Supabase client')
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side Supabase client')
  }

  return { supabaseUrl, serviceRoleKey }
}
