# Nexora

**Personal Technology Intelligence**

> Discover. Understand. Stay Ahead.

Nexora is a personal technology-intelligence platform for software developers. It continuously discovers important developments in AI, frameworks, developer tools, cloud services, and cybersecurity — filters noise, analyzes significance with AI, and delivers relevant intelligence via Telegram and optional Gmail.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite, React 19, TypeScript, React Router, Tailwind CSS, shadcn/ui |
| PWA | vite-plugin-pwa |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| AI | Groq API (server-side Edge Functions) |
| Notifications | Telegram (primary), Gmail (optional) |
| Validation | Zod |
| Testing | Vitest, React Testing Library |
| Deployment | Vercel (frontend), Supabase (backend) |

## Features

- RSS ingestion with deduplication and source health tracking
- AI article analysis (Groq) with Zod-validated output
- Personalized relevance scoring and noise filtering
- Telegram bot with `/brief`, `/learn`, `/compare`, and natural language
- Scheduled digests (morning, evening, weekly) with quiet hours
- Breaking alerts for critical developments
- Global search with filters across articles, topics, sources, saved content
- Learning intelligence with verified/inference/opinion labels
- User feedback loop for ranking adjustments
- Admin system health dashboard
- PWA with offline shell

## Local Setup

**Quick path to daily Telegram digests:** see [`GETTING_STARTED.md`](GETTING_STARTED.md).

### Prerequisites

- Node.js 20+
- npm
- Supabase CLI (for migrations and Edge Functions)

### Installation

```bash
npm install
cp .env.example .env
# Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

### Development Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run test         # Vitest (210+ tests)
npm run format       # Prettier
```

## Environment Variables

### Frontend (`.env`)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

### Edge Function Secrets (Supabase Dashboard)

| Secret | Purpose |
|--------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged database access |
| `GROQ_API_KEY` | AI completions |
| `TELEGRAM_BOT_TOKEN` | Telegram bot |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook verification |
| `CRON_SECRET` | Scheduled job authentication |
| `GOOGLE_CLIENT_ID/SECRET` | Gmail OAuth (optional) |
| `APP_URL` | Production origin for CORS |

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full setup.

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design |
| [DATABASE.md](./DATABASE.md) | Schema and RLS |
| [SECURITY.md](./SECURITY.md) | Threat model and mitigations |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel + Supabase deployment |
| [TELEGRAM.md](./TELEGRAM.md) | Bot setup and commands |
| [AI.md](./AI.md) | AI pipeline and prompt security |
| [CRON.md](./CRON.md) | Scheduled jobs |

## License

Private — personal project.
