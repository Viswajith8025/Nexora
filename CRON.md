# Nexora Cron Jobs

## Overview

Scheduled jobs run as Supabase Edge Functions, authenticated with `CRON_SECRET`. All jobs are **idempotent** — duplicate execution does not duplicate notifications.

## Authentication

Every cron endpoint requires:

```
x-cron-secret: <CRON_SECRET>
```

Or:

```
Authorization: Bearer <CRON_SECRET>
```

- Missing secret → `401 Unauthorized`
- Wrong secret → `401 Unauthorized` (timing-safe comparison)
- Unconfigured `CRON_SECRET` → `401` with error message

## Jobs

| Job | Function | Schedule (recommended) | Purpose |
|-----|----------|------------------------|---------|
| Ingestion | `ingest-sources` | Every 15–30 min | Fetch RSS feeds, deduplicate, insert articles |
| AI processing | `process-articles` | Every 5–10 min | Analyze discovered articles via Groq |
| Relevance | `evaluate-articles` | Every 10 min | Score articles per user interests |
| Morning digest | `dispatch-morning-digest` | Hourly (checks user timezone) | Send morning digests |
| Evening digest | `dispatch-evening-digest` | Hourly | Send evening digests |
| Weekly digest | `dispatch-weekly-digest` | Hourly on Sundays | Send weekly digests |
| Breaking alerts | `dispatch-breaking-alerts` | Every 5 min | Send critical breaking notifications |

Digest jobs check each user's `morning_digest_hour` / `evening_digest_hour` and timezone before sending.

## Idempotency

### Ingestion
- URL and content-hash deduplication prevents duplicate articles
- Unique constraints on `canonical_url` and `content_hash`

### Notifications
- `dedupe_key` per user per notification type (e.g. `morning:2025-09-05`)
- `hasDeliveredDedupeKey()` check before send
- Gmail uses separate dedupe key suffix `:email`

### Cron runs
- Each execution creates a `cron_runs` record with status, duration, results
- Failed jobs recorded with error message

## Failure recording

| Component | Table | Fields |
|-----------|-------|--------|
| Cron execution | `cron_runs` | `status`, `error`, `metadata`, `completed_at` |
| Source fetch failure | `sources.metadata` | `last_error`, `last_error_at` |
| AI failure | `ai_generations` | `status: failure`, `error` |
| Notification failure | `notifications` | `status: failed`, `error_message` |
| Delivery attempt | `notification_deliveries` | `status`, `response` |

## Example: external cron (cron-job.org)

```
POST https://<ref>.supabase.co/functions/v1/ingest-sources
Header: x-cron-secret: <CRON_SECRET>
```

## Example: Supabase pg_cron + pg_net

```sql
SELECT cron.schedule(
  'nexora-ingest',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/ingest-sources',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);
```

## Monitoring

- Admin dashboard: `/admin` → System Health
- Query: `SELECT * FROM cron_runs ORDER BY completed_at DESC LIMIT 20;`
- Failed sources: `SELECT name, metadata->>'last_error' FROM sources WHERE metadata->>'last_error' IS NOT NULL;`

## Security notes

- `verify_jwt = false` in `config.toml` — JWT gateway validation disabled; `CRON_SECRET` is the sole auth mechanism
- Never expose `CRON_SECRET` in frontend or logs
- Rotate `CRON_SECRET` if compromised; update all schedulers
