import { z } from 'zod'

const clientEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),
})

export type ClientEnv = z.infer<typeof clientEnvSchema>

export { clientEnvSchema }

function readRawClientEnv() {
  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string | undefined,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  }
}

function readClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse(readRawClientEnv())

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    throw new Error(`Invalid client environment configuration:\n${issues.join('\n')}`)
  }

  return parsed.data
}

let cachedEnv: ClientEnv | null = null

/** Validated browser-safe environment variables. */
export function getClientEnv(): ClientEnv {
  cachedEnv ??= readClientEnv()
  return cachedEnv
}

/** Returns true when Supabase env vars are present (used for dev without credentials). */
export function hasClientEnv(): boolean {
  return clientEnvSchema.safeParse(readRawClientEnv()).success
}
