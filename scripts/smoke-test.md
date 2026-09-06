# Nexora — Post-deploy smoke test

Run these steps **in order** after `supabase db push` and `supabase functions deploy`.
Replace placeholders:

| Token | Where to get it |
|-------|-----------------|
| `<PROJECT_REF>` | Supabase Dashboard → Project Settings → General |
| `<CRON_SECRET>` | Edge Function secret (same value as `.env.example` / Dashboard) |
| `<GROQ_API_KEY>` | [console.groq.com](https://console.groq.com) |
| `<SERVICE_ROLE_KEY>` | Supabase Dashboard → API → `service_role` (SQL editor / curl only) |
| `<TELEGRAM_CHAT_ID>` | Your linked profile `telegram_chat_id` after `/start <token>` |

Base URL: `https://<PROJECT_REF>.supabase.co/functions/v1`

---

## Step 1 — Groq model IDs respond

**Why first:** If models are decommissioned or misconfigured, every downstream step fails with opaque AI errors.

### 1a. Cheap model (`GROQ_MODEL_CHEAP`, default `openai/gpt-oss-20b`)

```bash
curl -sS -X POST "https://api.groq.com/openai/v1/chat/completions" \
  -H "Authorization: Bearer <GROQ_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"model":"openai/gpt-oss-20b","messages":[{"role":"user","content":"Reply with exactly: ok"}],"max_tokens":16}'
```

**Expected:** HTTP `200`, JSON with `choices[0].message.content` containing text.

**Failure signatures:**

| Response | Likely cause |
|----------|----------------|
| `401` / `invalid_api_key` | Wrong or missing `GROQ_API_KEY` in Edge secrets |
| `404` / `model_not_found` / decommissioned message | Update `GROQ_MODEL_CHEAP` secret to a live Groq model |
| `429` | Rate limit — wait and retry, or reduce batch sizes |

### 1b. Deep model (`GROQ_MODEL_DEEP`, default `openai/gpt-oss-120b`)

```bash
curl -sS -X POST "https://api.groq.com/openai/v1/chat/completions" \
  -H "Authorization: Bearer <GROQ_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"model":"openai/gpt-oss-120b","messages":[{"role":"user","content":"Reply with exactly: ok"}],"max_tokens":16}'
```

**Expected:** Same as 1a.

**Failure signatures:** Same table as 1a for the deep model secret.

### 1c. Confirm Edge secrets match

In Supabase Dashboard → Edge Functions → Secrets, verify:

- `GROQ_API_KEY` is set
- `GROQ_MODEL_CHEAP` and `GROQ_MODEL_DEEP` match the models you just tested

---

## Step 2 — Ingest a known feed

Triggers RSS fetch for all active sources (seed includes **React Blog** `https://react.dev/blog/rss.xml`).

```bash
curl -sS -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/ingest-sources" \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "Content-Type: application/json"
```

**Expected:** HTTP `200`, body like `{"success":true,"result":{"sourcesProcessed":N,"articlesDiscovered":M,...}}` with `M >= 0`.

**Verify in SQL (Supabase SQL editor):**

```sql
select processing_status, count(*) from public.articles group by 1 order by 1;

select name, last_fetched_at, last_error
from public.sources
where name = 'React Blog';
```

**Expected:** New rows with `processing_status = 'discovered'` (or existing URLs deduped). `React Blog.last_fetched_at` recent; `last_error` null.

**Failure signatures:**

| Symptom | Likely cause |
|---------|----------------|
| `401 Unauthorized` | Wrong `CRON_SECRET` header |
| `500` + fetch timeout | Source blocked or network issue from Edge |
| `articlesDiscovered: 0` every run | All items deduped (OK if re-run) or sources inactive |
| `last_error` on source | RSS URL changed or feed parse failure — check `sources.metadata` |

---

## Step 3 — Dedupe (no duplicate canonical URLs)

Re-run ingest immediately:

```bash
curl -sS -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/ingest-sources" \
  -H "x-cron-secret: <CRON_SECRET>"
```

**Verify:**

```sql
select canonical_url, count(*) as n
from public.articles
group by 1
having count(*) > 1
limit 10;
```

**Expected:** **Zero rows** (no duplicate canonical URLs).

**Failure signature:** Rows returned → dedupe logic or unique constraint missing.

---

## Step 4 — Classification & deep summarization (process-articles)

```bash
curl -sS -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/process-articles" \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "Content-Type: application/json"
```

**Expected:** HTTP `200`, `result.succeeded >= 1` if discovered articles exist.

**Verify:**

```sql
select processing_status, count(*) from public.articles group by 1;

select provider, model, success, count(*), max(error_message)
from public.ai_generations
group by 1, 2, 3
order by 4 desc;
```

**Expected:**

- Articles move from `discovered` → `analyzed` / `published` (or `failed` with reason)
- `ai_generations` rows with `success = true` and models matching your Groq secrets

**Failure signatures:**

| Symptom | Likely cause |
|---------|----------------|
| `GROQ_API_KEY is not configured` | Secret not set on Edge |
| `success = false`, `model_not_found` | Step 1 not fixed |
| `success = false`, JSON parse errors | Prompt/schema mismatch — check function logs |
| All `skipped` | No `discovered` articles left — run ingest again |

---

## Step 5 — Relevance scoring (evaluate-articles)

```sql
-- Ensure at least one user exists (your account)
select id, email from auth.users limit 1;
```

```bash
curl -sS -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/evaluate-articles" \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "Content-Type: application/json"
```

**Expected:** HTTP `200`, `result.evaluated >= 0`.

**Verify:**

```sql
select round(relevance_score) as score, count(*)
from public.article_user_relevance
group by 1
order by 1 desc;

select relevance_decision, count(*)
from public.article_user_relevance
group by 1;
```

**Expected:** Rows in `article_user_relevance` for users with analyzed/published articles. Scores 0–100.

**Failure signatures:**

| Symptom | Likely cause |
|---------|----------------|
| Empty `article_user_relevance` | No users, or no articles with AI scores yet |
| `evaluated: 0` | No published articles or batch empty |
| Cron error in logs | Missing `importance_score` / `developer_relevance_score` on articles |

---

## Step 6 — Telegram delivery (morning digest)

**Prerequisites:**

- Profile has `telegram_chat_id` set (Settings → generate token → `/start <token>` in bot)
- `telegram_enabled = true`
- `TELEGRAM_BOT_TOKEN` + webhook registered

```bash
curl -sS -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/dispatch-morning-digest" \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "Content-Type: application/json"
```

**Expected:** HTTP `200`, JSON with delivery stats (sent/skipped counts).

**Verify:**

```sql
select channel, status, attempted_at, error_message
from public.notification_deliveries
order by attempted_at desc
limit 5;

select last_morning_digest_at, telegram_chat_id
from public.profiles
where telegram_chat_id is not null;
```

**Expected:**

- `notification_deliveries` row with `channel = 'telegram'`, `status = 'success'`
- Telegram app shows digest message
- `last_morning_digest_at` updated

**Failure signatures:**

| Symptom | Likely cause |
|---------|----------------|
| `skipped: N` for all users | No articles above `notification_threshold`, or quiet hours |
| `status = 'failed'`, Telegram 403 | User blocked bot or invalid `telegram_chat_id` |
| `401` on function | `CRON_SECRET` wrong |
| No delivery rows | `telegram_enabled` false or no linked users |

---

## Step 7 — Pipeline health (single glance)

Run after steps 2–6:

```sql
select processing_status, count(*) from public.articles group by 1;

select provider, model, success, count(*), max(error_message)
from public.ai_generations
group by 1, 2, 3;

select round(relevance_score) as score, count(*)
from public.article_user_relevance
group by 1 order by 1 desc;
```

**Healthy project (first successful run):**

| Check | Healthy signal |
|-------|----------------|
| `articles` | Mix of `published` / `analyzed`, not only `discovered` |
| `ai_generations` | Mostly `success = true`, no persistent `model_not_found` |
| `article_user_relevance` | Score distribution, not empty for active users |
| Telegram | At least one successful `notification_deliveries` row |

---

## Quick manual UI checks

1. Open app → **News** — articles visible with scores
2. **Settings** — drag notification threshold; release slider; refresh page — value persists
3. **⌘K** — search returns results
4. Telegram `/today` — returns digest-style reply

---

## Cron equivalents (production)

After smoke test passes, schedule via `scripts/pg-cron-setup.sql` (fill `<PROJECT_REF>` and `<CRON_SECRET>` locally — **never commit filled file**).

Manual triggers above remain valid for debugging.
