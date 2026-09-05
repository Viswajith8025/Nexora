# Nexora Architecture

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                 Vercel — React / Vite PWA                │
│  Dashboard · Search · Saved · Learning · Settings · Admin│
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS (anon key + JWT + RLS)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      Supabase                            │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Auth   │  │  PostgreSQL  │  │  Edge Functions  │  │
│  │          │  │  + RLS       │  │  (11 functions)  │  │
│  └──────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┬──────────────┐
          ▼               ▼               ▼              ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐  ┌──────────┐
    │   Groq   │    │ Telegram │    │  Gmail   │  │   RSS    │
    │   API    │    │ Bot API  │    │   API    │  │  Feeds   │
    └──────────┘    └──────────┘    └──────────┘  └──────────┘
```

## Data Flow

```
RSS Sources → ingest-sources → articles (discovered)
                                    ↓
                          process-articles (Groq AI)
                                    ↓
                          evaluate-articles (scoring)
                                    ↓
                          articles (published)
                                    ↓
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        Dashboard UI         dispatch-* cron        Telegram /learn
        Search / Saved       (digests + breaking)    /brief commands
```

## Frontend

| Layer | Location | Responsibility |
|-------|----------|----------------|
| App shell | `src/app/` | Router (lazy-loaded), layouts, route guards |
| Features | `src/features/` | Dashboard, articles, search, learning, admin |
| Components | `src/components/` | UI primitives, error/loading states, a11y |
| Hooks | `src/hooks/` | Auth, theme, articles |
| Lib | `src/lib/` | Supabase client, config, security utils |

### Key routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/dashboard` | Auth | Intelligence feed |
| `/search` | Auth | Global search with filters |
| `/saved` | Auth | Bookmarked articles |
| `/learning` | Auth | Learning topics |
| `/settings` | Auth | Personalization, notifications |
| `/admin` | Admin | System health |

### Performance

- Lazy-loaded routes with Suspense fallbacks
- Vendor/supabase code splitting
- Paginated article queries
- PWA with network-only Supabase caching

## Backend — Edge Functions

| Function | Auth | Purpose |
|----------|------|---------|
| `ingest-sources` | CRON_SECRET | RSS ingestion |
| `process-articles` | CRON_SECRET | Groq AI analysis |
| `evaluate-articles` | CRON_SECRET | Relevance scoring |
| `dispatch-*` (4) | CRON_SECRET | Notification delivery |
| `telegram-webhook` | Webhook secret | Bot commands |
| `gmail-oauth` | JWT + signed state | Gmail connect |
| `system-health` | JWT + is_admin | Admin metrics |
| `health` | Public | Liveness check |

Shared modules in `supabase/functions/_shared/`:
- `ingestion/` — RSS fetch, parse, dedupe
- `ai/` — Groq provider, prompts, schema validation
- `relevance/` — Scoring, noise filter, personalization
- `notifications/` — Digest format, delivery, dispatch
- `telegram/` — Webhook handlers, intelligence, NL routing
- `gmail/` — OAuth, digest email
- `security/` — OAuth state signing

## Security Boundaries

| Trust zone | Access |
|------------|--------|
| Browser | Anon key + RLS only |
| Edge Functions | Service role (bypasses RLS) |
| External content | Untrusted — sanitized before AI/display |
| Cron endpoints | CRON_SECRET required |
| Admin endpoints | JWT + `profiles.is_admin` |

## Database

12 migrations, RLS on all public tables. See [DATABASE.md](./DATABASE.md).

## Testing

- **Vitest**: 190+ unit/integration tests
- **Coverage**: Ingestion, AI, relevance, notifications, Telegram, security, failures
- **No Playwright**: E2E not configured (manual acceptance testing documented in DEPLOYMENT.md)
