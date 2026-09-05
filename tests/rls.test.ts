import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

describe('RLS policies', () => {
  const rlsSql = readFileSync(
    join(process.cwd(), 'supabase', 'migrations', '20250905000002_rls_policies.sql'),
    'utf-8',
  )

  it('restricts profile access to own user', () => {
    expect(rlsSql).toMatch(/Users can view own profile/i)
    expect(rlsSql).toMatch(/auth\.uid\(\) = id/i)
  })

  it('allows reading only published articles', () => {
    expect(rlsSql).toMatch(/Authenticated users can read published articles/i)
    expect(rlsSql).toMatch(/processing_status = 'published'/i)
  })

  it('scopes user interests to owner', () => {
    expect(rlsSql).toMatch(/Users can view own interests/i)
    expect(rlsSql).toMatch(/auth\.uid\(\) = user_id/i)
  })

  it('scopes saved articles to owner', () => {
    expect(rlsSql).toMatch(/Users can view own saved articles/i)
    expect(rlsSql).toMatch(/Users can save articles/i)
  })

  it('does not expose service-only tables to users', () => {
    expect(rlsSql).not.toMatch(/on public\.cron_runs for select/i)
    expect(rlsSql).not.toMatch(/on public\.ai_generations for select/i)
  })
})
