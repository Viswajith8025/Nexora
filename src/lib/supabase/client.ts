import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getClientEnv, hasClientEnv } from '@/lib/config/env'
import type { Database } from '@/types/database'

let supabaseClient: SupabaseClient<Database> | null = null

/**
 * Browser-safe Supabase client using the anon/publishable key.
 * Never use the service role key here.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!hasClientEnv()) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env',
    )
  }

  supabaseClient ??= createClient<Database>(
    getClientEnv().VITE_SUPABASE_URL,
    getClientEnv().VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  )

  return supabaseClient
}

/**
 * Returns the Supabase client when configured, otherwise null.
 * Useful for optional auth during local development.
 */
export function getSupabaseClientOrNull(): SupabaseClient<Database> | null {
  if (!hasClientEnv()) return null
  return getSupabaseClient()
}
