/**
 * Groq provider stub — all AI calls run in Supabase Edge Functions (process-articles).
 * Never import or use GROQ_API_KEY in browser code.
 */
export class GroqProvider {
  readonly name = 'groq' as const

  complete(): Promise<never> {
    throw new Error(
      'GroqProvider is server-side only. Article analysis runs via the process-articles Edge Function.',
    )
  }
}
