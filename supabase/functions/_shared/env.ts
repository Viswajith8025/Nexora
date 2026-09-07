import { z } from 'https://esm.sh/zod@3.23.8'

export const edgeSecretsSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GROQ_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
})

export type EdgeSecrets = z.infer<typeof edgeSecretsSchema>

export function validateEdgeSecrets(env: Record<string, string | undefined>): EdgeSecrets {
  const result = edgeSecretsSchema.safeParse(env)
  if (!result.success) {
    throw new Error(`Invalid Edge Function secrets: ${result.error.message}`)
  }
  return result.data
}
