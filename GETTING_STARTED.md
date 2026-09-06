# Get daily developer news on Telegram (or email)

Nexora watches AI, frameworks, security, and tools — summarizes what happened, why it matters, and what you should do. **Telegram is the easiest daily channel.**

## What you get

| Channel | What arrives |
|---------|----------------|
| **Telegram (recommended)** | Morning digest + `/brief`, `/latest`, `/learn` on demand |
| **Gmail (optional)** | Same morning/evening/weekly digests in your inbox |

Each story includes context: what happened, why it matters, technical impact, and recommended action.

---

## 15-minute setup

### 1. Supabase + deploy

```bash
npm install
cp .env.example .env
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Supabase dashboard

supabase login
supabase link --project-ref YOUR_REF
supabase db push
supabase functions deploy ingest-sources process-articles evaluate-articles telegram-webhook dispatch-morning-digest dispatch-evening-digest dispatch-weekly-digest dispatch-breaking-alerts gmail-oauth system-health health
```

Set Edge Function secrets (Dashboard → Edge Functions → Secrets):

- `GROQ_API_KEY` — [console.groq.com](https://console.groq.com)
- `GROQ_MODEL_CHEAP` = `openai/gpt-oss-20b`
- `GROQ_MODEL_DEEP` = `openai/gpt-oss-120b`
- `CRON_SECRET` — random string (`openssl rand -hex 32`)
- `TELEGRAM_BOT_TOKEN` — from [@BotFather](https://t.me/BotFather)
- `TELEGRAM_WEBHOOK_SECRET` — another random string
- `APP_URL` — your Vercel URL or `http://localhost:5173`

### 2. Telegram bot

1. Create a bot with BotFather → copy token → set `TELEGRAM_BOT_TOKEN`.
2. Register webhook:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<PROJECT_REF>.supabase.co/functions/v1/telegram-webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```
3. Add bot username to `.env`: `VITE_TELEGRAM_BOT_USERNAME=YourBotName`

### 3. Schedule daily ingestion + digests

Use Supabase Dashboard → Database → Cron, or see `CRON.md`. Minimum jobs:

| Job | Schedule | Endpoint |
|-----|----------|----------|
| Ingest RSS | Every 6 hours | `ingest-sources` |
| AI analysis | Every hour | `process-articles` |
| Morning digest | Hourly (checks user timezone) | `dispatch-morning-digest` |

All cron calls need header: `x-cron-secret: <CRON_SECRET>`.

### 4. Your account

1. `npm run dev` → sign up at `/signup`.
2. **Settings** → **Generate link token** → open Telegram → send `/start <token>`.
3. Enable **Morning digest** and pick your timezone.
4. (Optional) **Connect Gmail** for email copies.

### 5. Promote yourself to admin (one-time)

In Supabase SQL editor:

```sql
update public.profiles set is_admin = true where id = '<your-user-uuid>';
```

Then visit `/admin` for pipeline health.

---

## Daily use

- **Telegram:** wait for the morning digest, or send `/brief` for today's must-know items, `/latest` for recent high-relevance news.
- **Web:** open `/dashboard` for the same ranked feed with full detail pages.
- **Tune relevance:** Settings → pick categories (AI, Development, Security…) and technologies you care about.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No digest | Confirm Telegram linked, `telegram_enabled` on, morning digest enabled, cron jobs running |
| Empty feed | Run `ingest-sources` manually; check `GROQ_API_KEY` and model env vars |
| AI errors | Models must be `openai/gpt-oss-20b` / `openai/gpt-oss-120b` (old llama IDs are retired) |
| Link token fails | Token expires in 15 minutes — generate a new one |

Full deployment details: `DEPLOYMENT.md`.
