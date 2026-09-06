# Nexora Deployment Guide

## Architecture

| Component | Platform |
|-----------|----------|
| Frontend (Vite/React PWA) | Vercel |
| Database, Auth, Storage | Supabase |
| Edge Functions | Supabase |
| Scheduled jobs | Supabase Cron (pg_cron) or external scheduler |
| AI | Groq API (server-side) |
| Notifications | Telegram (primary), Gmail (optional) |

## Prerequisites

- Node.js 20+
- Supabase project
- Vercel account
- Groq API key
- Telegram bot (optional but recommended)
- Google Cloud OAuth credentials (optional, for Gmail digests)

---

## 1. Supabase Setup

### Create project

1. Create a project at [supabase.com](https://supabase.com)
2. Note the **Project URL** and **anon key**

### Apply migrations

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Migrations live in `supabase/migrations/` (13 files, applied in order).

### Configure Auth

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://your-app.vercel.app` (or `http://localhost:5173` for dev)
- **Redirect URLs**: add both production and local URLs

### Edge Function secrets

In Supabase Dashboard → Project Settings → Edge Functions → Secrets:

| Secret | Required | Purpose |
|--------|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Auto-injected; verify present |
| `GROQ_API_KEY` | Yes | AI article analysis |
| `CRON_SECRET` | Yes | Authenticate scheduled jobs |
| `TELEGRAM_BOT_TOKEN` | Yes* | Telegram notifications |
| `TELEGRAM_WEBHOOK_SECRET` | Yes* | Webhook verification |
| `GOOGLE_CLIENT_ID` | No | Gmail OAuth |
| `GOOGLE_CLIENT_SECRET` | No | Gmail OAuth |
| `GOOGLE_REDIRECT_URI` | No | `https://<ref>.supabase.co/functions/v1/gmail-oauth` |
| `APP_URL` | Yes | `https://your-app.vercel.app` (comma-separate for multiple origins) |

\* Required if using Telegram notifications.

### Deploy Edge Functions

```bash
supabase functions deploy ingest-sources
supabase functions deploy process-articles
supabase functions deploy evaluate-articles
supabase functions deploy telegram-webhook
supabase functions deploy dispatch-morning-digest
supabase functions deploy dispatch-evening-digest
supabase functions deploy dispatch-weekly-digest
supabase functions deploy dispatch-breaking-alerts
supabase functions deploy gmail-oauth
supabase functions deploy system-health
supabase functions deploy health
```

### Scheduled jobs

Configure cron triggers in Supabase Dashboard → Database → Extensions (enable `pg_cron`) or use an external scheduler (GitHub Actions, cron-job.org) to POST to Edge Functions with `CRON_SECRET`.

See [CRON.md](./CRON.md) for the full schedule.

### Set admin user

```sql
UPDATE profiles SET is_admin = true WHERE id = '<your-user-uuid>';
```

---

## 2. Vercel Frontend

### Connect repository

1. Import the Git repository in Vercel
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`

### Environment variables

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your anon key |

**Never** add server secrets (`GROQ_API_KEY`, `SERVICE_ROLE`, etc.) to Vercel.

### Deploy

```bash
vercel --prod
```

`vercel.json` configures SPA rewrites and security headers.

---

## 3. Telegram Setup

See [TELEGRAM.md](./TELEGRAM.md) for bot creation, webhook registration, and linking.

---

## 4. Gmail Setup (optional)

1. Create Google Cloud OAuth 2.0 credentials (Web application)
2. Authorized redirect URI: `https://<ref>.supabase.co/functions/v1/gmail-oauth`
3. Enable Gmail API
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in Edge Function secrets
5. Users connect Gmail from Settings → Delivery channels

---

## 5. Post-deployment verification

```bash
# Health check
curl https://<ref>.supabase.co/functions/v1/health

# Cron auth (should return 401 without secret)
curl -X POST https://<ref>.supabase.co/functions/v1/ingest-sources

# Cron auth (should return 200)
curl -X POST https://<ref>.supabase.co/functions/v1/ingest-sources \
  -H "x-cron-secret: $CRON_SECRET"

# Frontend
open https://your-app.vercel.app
```

### Acceptance checklist

- [ ] Sign up / sign in works
- [ ] Dashboard loads published articles
- [ ] Cron ingestion runs (`cron_runs` table)
- [ ] AI processing completes (`ai_generations` table)
- [ ] Telegram `/brief` responds (if configured)
- [ ] Admin `/admin` accessible for admin users only
- [ ] PWA installs on mobile

---

## 6. Monitoring

- **Admin dashboard**: `/admin` (System Health)
- **Supabase logs**: Dashboard → Edge Functions → Logs
- **Tables**: `cron_runs`, `ai_generations`, `notification_deliveries`

## Rollback

- **Frontend**: Vercel → Deployments → Promote previous deployment
- **Database**: `supabase db reset` (dev only) or manual migration rollback
- **Functions**: `supabase functions deploy <name>` from a previous git tag
