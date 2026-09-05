# Nexora Security Model

> Last audited: production-hardening phase (September 2025)

## Threat Model

| Threat | Mitigation |
|--------|------------|
| Secret exposure | VITE_ prefix only for public keys; service role server-only |
| Prompt injection | Untrusted delimiters, sanitization, system rules, Zod validation |
| Data isolation failure | RLS on all tables; service role only in Edge Functions |
| SQL/filter injection | Search term sanitization; parameterized Supabase queries |
| XSS | React escaping; no dangerouslySetInnerHTML on user content |
| Webhook spoofing | Telegram secret token verification |
| Cron endpoint abuse | CRON_SECRET with timing-safe comparison |
| OAuth CSRF | HMAC-signed OAuth state with 10-minute expiry |
| CORS abuse | APP_URL-restricted origins in production |

## Secrets

### Browser-safe (VITE_ prefix)

| Variable | Exposure |
|----------|----------|
| `VITE_SUPABASE_URL` | Public |
| `VITE_SUPABASE_ANON_KEY` | Public (RLS-enforced) |

### Server-only (Supabase Edge Function secrets)

| Secret | Risk if exposed |
|--------|-----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Full database access |
| `GROQ_API_KEY` | Paid API abuse |
| `TELEGRAM_BOT_TOKEN` | Bot control |
| `TELEGRAM_WEBHOOK_SECRET` | Fake webhook injection |
| `CRON_SECRET` | Trigger ingestion/AI/digests |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth abuse |

### Rules

- Never prefix server secrets with `VITE_`
- Never import service role in `src/` client code
- Browser Groq stub throws on invocation
- Rotate secrets immediately if exposure suspected

## Row Level Security

- RLS enabled on **every** public table
- Default deny — no policy = no access
- User data scoped via `auth.uid()`
- `gmail_connections` — RLS enabled, **no client policies** (service role only)
- `cron_runs`, `ai_generations` — no user SELECT policies
- Admin flag (`is_admin`) readable by own profile; enforced server-side in `system-health`

## Prompt Injection

All external content (RSS, user queries) is untrusted:

1. **System prompts** declare non-negotiable security rules
2. **Delimiter wrapping** — `<untrusted_article_data>`, `<article_context>`
3. **Sanitization** — strip delimiter breakout, role prefixes, injection phrases
4. **Output validation** — Zod schemas; no tool/API access from prompts
5. **Audit logging** — `ai_generations` table
6. **Retry with strict prompt** on invalid JSON (one retry only)

Tested: `tests/security/prompt-injection.test.ts`, `tests/ai/prompts.test.ts`

## API Security

### Cron endpoints
- `CRON_SECRET` required (timing-safe comparison)
- POST only
- `verify_jwt = false` — auth via shared secret, not JWT

### Telegram webhook
- `X-Telegram-Bot-Api-Secret-Token` header required

### Gmail OAuth
- Start: authenticated user JWT required
- Callback: HMAC-signed state verified before token storage
- Disconnect: authenticated DELETE

### Admin
- `system-health`: JWT + `profiles.is_admin` check

### CORS
- Production: restricted to `APP_URL` (comma-separated for multiple origins)
- Development: defaults to `*` when `APP_URL` unset

## Search Security

User search input sanitized via `sanitizeSearchTerm()`:
- Strips PostgREST filter metacharacters (`,`, `%`, etc.)
- Length limited to 200 characters
- Applied in `globalSearch()` and `fetchArticles()`

## Frontend Security Headers (Vercel)

Configured in `vercel.json`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restricting camera/microphone/geolocation

## Logging

- Edge Functions return generic errors to clients (no stack traces)
- Sensitive data (tokens, secrets) never logged
- `ai_generations` and `cron_runs` provide audit trail

## Security Checklist (verified)

- [x] RLS on all tables
- [x] No secrets in frontend bundle
- [x] Cron auth with timing-safe comparison
- [x] Telegram webhook verification
- [x] OAuth state signing
- [x] Prompt injection defenses
- [x] Search input sanitization
- [x] CORS restriction via APP_URL
- [x] Admin route server-side enforcement
- [x] Zod validation on AI output
- [x] Security headers on Vercel

## Incident Response

1. Rotate compromised secrets in Supabase Dashboard
2. Review `ai_generations` and `cron_runs` audit logs
3. Check `notification_deliveries` for unauthorized sends
4. Revoke user sessions via Supabase Auth admin
5. Re-deploy Edge Functions if code compromise suspected
