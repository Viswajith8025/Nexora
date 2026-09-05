# Nexora Database Design

> **Status**: Implemented — 12 migrations in `supabase/migrations/`

## Design Principles

1. **RLS on every table** in the `public` schema
2. **User data isolation** — users access only their own preferences, saved items, notifications
3. **Published content readable** by authenticated users; writes via service role
4. **Audit trails** for cron runs, AI generations, notification deliveries
5. **Saved articles never auto-deleted**

## Planned Tables

### `profiles`

Extends Supabase Auth users with application-specific data.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | References `auth.users(id)` |
| `email` | `text` | Denormalized from auth |
| `display_name` | `text` | Nullable |
| `avatar_url` | `text` | Nullable |
| `telegram_chat_id` | `text` | Nullable, for notifications |
| `timezone` | `text` | Default `UTC` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**RLS**: Users can read/update their own profile.

### `sources`

Registered content sources for ingestion.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `name` | `text` | Human-readable name |
| `type` | `text` | `rss`, `github`, `api`, `web` |
| `url` | `text` | Source endpoint |
| `category` | `text` | `ai`, `development`, `security`, `tools` |
| `is_active` | `boolean` | Default `true` |
| `fetch_interval_minutes` | `integer` | Default `60` |
| `last_fetched_at` | `timestamptz` | Nullable |
| `metadata` | `jsonb` | Source-specific config |
| `created_at` | `timestamptz` | |

**RLS**: Read-only for authenticated users. Writes via service role.

### `articles`

Discovered and verified content items.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `title` | `text` | |
| `summary` | `text` | Nullable, AI-generated |
| `url` | `text` UNIQUE | Canonical URL |
| `content_hash` | `text` | Deduplication |
| `status` | `text` | `discovered`, `verified`, `published`, `archived` |
| `significance_score` | `numeric(3,2)` | 0.00–1.00 |
| `category` | `text` | Primary category |
| `published_at` | `timestamptz` | Original publish date |
| `discovered_at` | `timestamptz` | When Nexora found it |
| `verified_at` | `timestamptz` | Nullable |
| `metadata` | `jsonb` | Extra fields |
| `created_at` | `timestamptz` | |

**Indexes**: `url`, `status`, `category`, `published_at DESC`, `significance_score DESC`, GIN on `title` (pg_trgm)

**RLS**: Authenticated users can read `published` articles. Service role for writes.

### `article_sources`

Many-to-many: articles discovered from multiple sources.

| Column | Type | Notes |
|--------|------|-------|
| `article_id` | `uuid` FK | |
| `source_id` | `uuid` FK | |
| `discovered_at` | `timestamptz` | |

**PK**: `(article_id, source_id)`

### `tags`

Controlled vocabulary for categorization.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `name` | `text` UNIQUE | |
| `slug` | `text` UNIQUE | |

### `article_tags`

| Column | Type | Notes |
|--------|------|-------|
| `article_id` | `uuid` FK | |
| `tag_id` | `uuid` FK | |

**PK**: `(article_id, tag_id)`

### `user_interests`

Weighted interest signals for ranking.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `topic` | `text` | e.g. `llm`, `kubernetes`, `react` |
| `weight` | `numeric(3,2)` | 0.00–1.00 |
| `source` | `text` | `explicit`, `implicit`, `inferred` |
| `created_at` | `timestamptz` | |

**RLS**: Users manage their own interests.

### `user_followed_topics`

Topics the user explicitly follows.

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | `uuid` FK | |
| `topic` | `text` | |
| `created_at` | `timestamptz` | |

**PK**: `(user_id, topic)`

### `saved_articles`

User bookmarks.

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | `uuid` FK | |
| `article_id` | `uuid` FK | |
| `saved_at` | `timestamptz` | |

**PK**: `(user_id, article_id)`

### `notifications`

Notification queue.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `article_id` | `uuid` FK | Nullable |
| `channel` | `text` | `telegram`, `email`, `web` |
| `title` | `text` | |
| `body` | `text` | |
| `status` | `text` | `pending`, `sent`, `failed` |
| `scheduled_at` | `timestamptz` | |
| `created_at` | `timestamptz` | |

### `notification_deliveries`

Delivery attempt log.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `notification_id` | `uuid` FK | |
| `channel` | `text` | |
| `status` | `text` | `success`, `failure` |
| `response` | `jsonb` | Provider response |
| `attempted_at` | `timestamptz` | |

### `learning_topics`

Structured learning content.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `title` | `text` | |
| `description` | `text` | |
| `category` | `text` | |
| `difficulty` | `text` | `beginner`, `intermediate`, `advanced` |
| `content` | `jsonb` | Structured lesson content |
| `created_at` | `timestamptz` | |

### `learning_progress`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | `uuid` FK | |
| `topic_id` | `uuid` FK | |
| `progress` | `numeric(3,2)` | 0.00–1.00 |
| `completed_at` | `timestamptz` | Nullable |
| `updated_at` | `timestamptz` | |

**PK**: `(user_id, topic_id)`

### `cron_runs`

Scheduled job audit log.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `job_name` | `text` | |
| `status` | `text` | `running`, `completed`, `failed` |
| `started_at` | `timestamptz` | |
| `completed_at` | `timestamptz` | Nullable |
| `items_processed` | `integer` | Default `0` |
| `error` | `text` | Nullable |
| `metadata` | `jsonb` | |

### `ai_generations`

AI call audit log.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `provider` | `text` | `groq`, `openai`, `anthropic` |
| `model` | `text` | |
| `purpose` | `text` | `summarize`, `rank`, `verify` |
| `input_tokens` | `integer` | |
| `output_tokens` | `integer` | |
| `article_id` | `uuid` FK | Nullable |
| `created_at` | `timestamptz` | |

### `user_feedback`

User signals for ranking improvement.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `article_id` | `uuid` FK | |
| `signal` | `text` | `relevant`, `not_relevant`, `save`, `dismiss` |
| `created_at` | `timestamptz` | |

## Relationships

```
profiles ──┬── user_interests
           ├── user_followed_topics
           ├── saved_articles ── articles
           ├── notifications ── notification_deliveries
           ├── learning_progress ── learning_topics
           └── user_feedback ── articles

sources ── article_sources ── articles ── article_tags ── tags
```

## Indexing Strategy

- **Articles**: Composite index on `(status, category, published_at DESC)` for feed queries
- **Articles**: GIN index on `title` using `pg_trgm` for search
- **User interests**: Index on `(user_id, topic)` for ranking joins
- **Notifications**: Index on `(user_id, status, scheduled_at)` for dispatch queue
- **Cron runs**: Index on `(job_name, started_at DESC)` for monitoring

## Migration Plan

1. **Foundation** (current) — Extensions only
2. **Auth + Profiles** — Profile table with RLS, auth trigger
3. **Content** — Sources, articles, tags
4. **User features** — Interests, saved, feedback
5. **Notifications** — Queue and delivery tables
6. **Learning** — Topics and progress
7. **Operations** — Cron runs, AI generations audit
