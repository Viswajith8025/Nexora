import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const migrationsDir = join(process.cwd(), 'supabase', 'migrations')

const REQUIRED_TABLES = [
  'profiles',
  'sources',
  'articles',
  'article_sources',
  'tags',
  'article_tags',
  'user_interests',
  'user_followed_topics',
  'saved_articles',
  'notifications',
  'notification_deliveries',
  'learning_topics',
  'learning_progress',
  'cron_runs',
  'ai_generations',
  'user_feedback',
  'user_learning_memory',
  'gmail_connections',
]

describe('database migrations', () => {
  const migrationFiles = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql'))
  const migrationSql = migrationFiles
    .map((file) => readFileSync(join(migrationsDir, file), 'utf-8'))
    .join('\n')

  it('includes all required migration files', () => {
    expect(migrationFiles).toContain('20250905000000_foundation.sql')
    expect(migrationFiles).toContain('20250905000001_core_schema.sql')
    expect(migrationFiles).toContain('20250905000002_rls_policies.sql')
    expect(migrationFiles).toContain('20250905000003_seed_sources.sql')
    expect(migrationFiles).toContain('20250905000004_ingestion.sql')
    expect(migrationFiles).toContain('20250905000005_ai_intelligence.sql')
    expect(migrationFiles).toContain('20250905000006_relevance.sql')
    expect(migrationFiles).toContain('20250905000007_telegram.sql')
    expect(migrationFiles).toContain('20250905000008_notifications_delivery.sql')
    expect(migrationFiles).toContain('20250905000009_personalization.sql')
    expect(migrationFiles).toContain('20250905000010_learning_memory.sql')
    expect(migrationFiles).toContain('20250905000011_integrations.sql')
    expect(migrationFiles).toContain('20250905000012_profile_security.sql')
    expect(migrationFiles).toContain('20250905000013_telegram_chat_history.sql')
  })

  it('creates all required tables', () => {
    for (const table of REQUIRED_TABLES) {
      expect(migrationSql).toMatch(new RegExp(`create table public\\.${table}`, 'i'))
    }
  })

  it('enables row level security', () => {
    expect(migrationSql).toMatch(/enable row level security/i)
    for (const table of REQUIRED_TABLES) {
      expect(migrationSql).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, 'i'),
      )
    }
  })

  it('defines score constraints between 0 and 100', () => {
    expect(migrationSql).toMatch(/importance_score.*between 0 and 100/i)
    expect(migrationSql).toMatch(/weight.*between 0 and 100/i)
  })

  it('seeds official technology sources without fake articles', () => {
    const seedSql = readFileSync(
      join(migrationsDir, '20250905000003_seed_sources.sql'),
      'utf-8',
    )
    expect(seedSql).toMatch(/insert into public\.sources/i)
    expect(seedSql).not.toMatch(/insert into public\.articles/i)
    expect(seedSql).toMatch(/OpenAI Blog/i)
    expect(seedSql).toMatch(/PostgreSQL News/i)
  })

  it('adds ingestion deduplication fields', () => {
    const ingestionSql = readFileSync(
      join(migrationsDir, '20250905000004_ingestion.sql'),
      'utf-8',
    )
    expect(ingestionSql).toMatch(/cluster_key/i)
    expect(ingestionSql).toMatch(/normalized_title/i)
  })

  it('adds relevance scoring fields and per-user relevance', () => {
    const relevanceSql = readFileSync(
      join(migrationsDir, '20250905000006_relevance.sql'),
      'utf-8',
    )
    expect(relevanceSql).toMatch(/relevance_decision/i)
    expect(relevanceSql).toMatch(/article_user_relevance/i)
    expect(relevanceSql).toMatch(/source_trust_tier/i)
  })

  it('adds notification delivery fields', () => {
    const deliverySql = readFileSync(
      join(migrationsDir, '20250905000008_notifications_delivery.sql'),
      'utf-8',
    )
    expect(deliverySql).toMatch(/notification_type/i)
    expect(deliverySql).toMatch(/dedupe_key/i)
    expect(deliverySql).toMatch(/morning_digest_hour/i)
  })

  it('adds learning memory for intelligence commands', () => {
    const memorySql = readFileSync(
      join(migrationsDir, '20250905000010_learning_memory.sql'),
      'utf-8',
    )
    expect(memorySql).toMatch(/user_learning_memory/i)
    expect(memorySql).toMatch(/interest_level/i)
    expect(memorySql).toMatch(/last_viewed_at/i)
  })

  it('adds Gmail integration and admin fields', () => {
    const integrationsSql = readFileSync(
      join(migrationsDir, '20250905000011_integrations.sql'),
      'utf-8',
    )
    expect(integrationsSql).toMatch(/gmail_connections/i)
    expect(integrationsSql).toMatch(/is_admin/i)
    expect(integrationsSql).toMatch(/never automatically deleted/i)
  })

  it('protects privileged profile columns from client updates', () => {
    const securitySql = readFileSync(
      join(migrationsDir, '20250905000012_profile_security.sql'),
      'utf-8',
    )
    expect(securitySql).toMatch(/protect_profile_privileged_columns/i)
    expect(securitySql).toMatch(/is_admin/i)
    expect(securitySql).toMatch(/telegram_chat_id/i)
  })
})
