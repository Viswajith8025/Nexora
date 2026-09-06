# Nexora — Claude context

Standing context for this repository. Phase-by-phase build prompts live in
`BUILD_SEQUENCE.md`.

## Project

**Nexora** is a personal technology-intelligence platform for developers. It
ingests RSS feeds, deduplicates articles, analyses them with a hosted LLM,
scores relevance per user, and delivers intelligence via a React PWA, a
Telegram bot (primary channel), and optional Gmail digests.

**Tagline:** Discover. Understand. Stay Ahead.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite, React 19, TypeScript, React Router 7, Tailwind 4, shadcn/ui, vite-plugin-pwa |
| Backend | Supabase (Postgres, Auth, Edge Functions on Deno) |
| Validation | Zod |
| Tests | Vitest, React Testing Library |
| Frontend hosting | Vercel |

## Non-negotiable conventions

1. **Service-role keys and model API keys are server-side only.** The browser
   gets the anon key and nothing else. RLS is the security boundary.

2. **`VITE_` = public.** Any variable with that prefix is compiled into the
   client bundle. Treat it as published to the world. Never use `VITE_` for
   secrets.

3. **RLS on every table** in `public`. No exceptions.

4. **Zod validation** at every API and model boundary.

5. **Untrusted input.** RSS bodies, Telegram messages, and model output are
   never trusted as instructions.

6. **No hardcoded configuration.** Model IDs, API endpoints, thresholds, and
   secrets come from environment variables and must fail loudly at startup if
   unset. No silent defaults for model IDs.

7. **Tests assert real behaviour.** Do not write tests that only check a
   function was called.

8. **Focused diffs.** Do not refactor adjacent code unless asked.

9. **Never commit** unless explicitly requested.

## Environment variables

`.env.example` accumulates variable names phase by phase. Values are filled in
only at **Phase 19**. Until then placeholders stay empty and the app is not
expected to run end-to-end.

## Workflow

Execute `BUILD_SEQUENCE.md` phases **one at a time, in order**. After each
phase:

```bash
npm run typecheck && npm run build && npm test
```

Fix failures before moving on.

## Repository

| Item | Value |
|------|-------|
| GitHub | https://github.com/Viswajith8025/Nexora |
| Local | `nexora/` at repo root |

## Key paths (as built evolves)

```
src/                          React PWA
supabase/migrations/          Database schema
supabase/functions/           Edge Functions
supabase/functions/_shared/   Shared server logic
tests/                        Vitest suite
```

Cursor rules: `.cursorrules` (references this file).
