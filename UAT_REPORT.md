# Nexora — User Acceptance Test Audit Report

## 1. Run metadata

| Field | Value |
|-------|-------|
| **Date** | 2026-09-05 (local) |
| **Project** | Nexora |
| **Context file** | `CLAUDE.md` |
| **Branch** | `main` |
| **Commit SHA** | `575638406eeb781c99a11be3de117f039d028bfb` |
| **Auditor mode** | Read-only (only this file created/modified) |

### Commands executed

| Command | Exit code | Result |
|---------|-----------|--------|
| `npm run typecheck` | 0 | Pass — no output beyond success |
| `npm run lint` | 1 | **Fail** — 51 problems (11 errors, 40 warnings) |
| `npm test` | 0 | Pass — **47** test files, **210** tests, 48.52s |
| `npm run build` | 0 | Pass — built in 15.88s, PWA precache 45 entries |

**Total automated-gate runtime:** not measured as a single continuous wall clock; sum of reported durations ≈ **145s** (~2.4 min) for the four gates above. Static inspection and file reads added additional time (not measured).

### Git status confirmation (post-audit)

```
 M .env.example
?? .cursorrules
?? BUILD_SEQUENCE.md
?? CLAUDE.md
?? UAT_REPORT.md
```

Only `UAT_REPORT.md` was created by this audit. Pre-existing untracked/modified files were present before the run.

---

## 2. Verdict

**Not shippable.** The most serious finding is that **any authenticated user can set `profiles.is_admin = true` via RLS** (`supabase/migrations/20250905000002_rls_policies.sql:33-37`), which grants access to the `system-health` Edge Function and the admin UI — there is no database-level column protection. Secondary blockers: the **primary Telegram linking journey cannot be completed from the web UI** (bot instructs users to generate a token in Settings, but no Settings control exists), and the **AI pipeline defaults to Groq model IDs decommissioned since 2026-08-16** with additional hardcoded model strings in `intelligence.ts`. Typecheck, build, and unit tests pass, but lint fails, there is no E2E suite, and the app cannot run end-to-end without Phase 19 credentials (`.env.example` is comment-only by design).

**Finding counts:** BLOCKER 4 · MAJOR 8 · MINOR 7 · NOTE 6

---

## 3. Findings table

| ID | Severity | Area | Finding | Evidence | Confidence |
|----|----------|------|---------|----------|------------|
| F-01 | BLOCKER | Security / RLS | Authenticated users can self-promote to admin by updating `profiles.is_admin` — RLS `UPDATE` policy checks only `auth.uid() = id`, not column allow-list | `20250905000002_rls_policies.sql:33-37`; `system-health/index.ts:27-35` gates on `is_admin` from same table | VERIFIED (static SQL + code read) |
| F-02 | BLOCKER | Telegram / UX | Telegram account linking is broken for normal users: bot says “Generate a Telegram link token” in Settings, but Settings has no token-generation UI | `handlers.ts:168-171`; `PersonalizationSettings.tsx:304-307` (status text only, no insert flow); no `telegram_link_tokens` usage in `src/` | VERIFIED (static) |
| F-03 | BLOCKER | AI pipeline | Default and fallback Groq models (`llama-3.1-8b-instant`, `llama-3.3-70b-versatile`) are decommissioned per `BUILD_SEQUENCE.md:124-125`; production AI will fail unless env overrides are set | `types.ts:42-46`; `analyzer.ts:29-32`; `intelligence.ts:62,88` | VERIFIED (static) |
| F-04 | BLOCKER | Deployment | App cannot run end-to-end: `.env.example` has no variables; `hasClientEnv()` / `ProtectedRoute` block auth without `VITE_SUPABASE_*` | `.env.example:1`; `env.ts:39-41`; `ProtectedRoute.tsx:14-26` | VERIFIED (file read) |
| F-05 | MAJOR | Admin / API | `system-health` queries `notification_deliveries.created_at`, but schema column is `attempted_at` — last delivery timestamps will be wrong/null | `system-health/index.ts:55-56`; `20250905000001_core_schema.sql:346-352` | VERIFIED (static) |
| F-06 | MAJOR | Security / RLS | `profiles` UPDATE policy allows clients to set `telegram_chat_id` directly, bypassing token-based linking | `20250905000002_rls_policies.sql:33-37`; `profile.ts:24-32` (allow-list omits it, but RLS does not) | VERIFIED (static) |
| F-07 | MAJOR | UI / dead control | “Ask AI” buttons render on article cards and detail but only scroll to a panel that says “upcoming in-app assistant” — no AI invocation | `ArticleCard.tsx:79-83`; `ArticleDetail.tsx:89-94,144-155` | VERIFIED (static) |
| F-08 | MAJOR | Error handling | Save/unsave uses `void toggleSave(...)` with no `try/catch` — API failures leave UI unchanged with no user feedback | `use-saved-articles.ts:42-50`; `CategoryArticlesPage.tsx:39-41` | VERIFIED (static) |
| F-09 | MAJOR | CI / quality | ESLint fails with 11 errors (unsafe `any` in `health.ts`, unnecessary assertion in `feedback.ts`, non-null assertion in test) | `npm run lint` exit 1; errors at `health.ts:21-42`, `feedback.ts:18`, `digest-format.test.ts:52` | VERIFIED (command) |
| F-10 | MAJOR | Docs vs code | Home page still claims ingestion/AI/Telegram “will be built in later phases” while README and code implement them | `HomePage.tsx:89-93` vs `README.md:24-34` | VERIFIED (static) |
| F-11 | MAJOR | Architecture gap | No Gemini failover, no `callModel(cheap\|deep)`, no quota enforcement — planned in `BUILD_SEQUENCE.md` Phase 3–4, not implemented | `groq-provider.ts` only; no `gemini` in `supabase/functions/_shared/ai/` | VERIFIED (static) |
| F-12 | MAJOR | Settings UX | Notification threshold slider and digest hour inputs call `saveProfile` on every `onChange` with shared `saving` flag — rapid changes cause overlapping writes and lost updates | `PersonalizationSettings.tsx:222-225,274-289` | VERIFIED (static) |
| F-13 | MINOR | Mobile nav | Mobile drawer omits admin link and sign-out (desktop sidebar has both) | `MobileNav.tsx:43-73` vs `Sidebar.tsx:45-84` | VERIFIED (static) |
| F-14 | MINOR | Data sync | “Mark read” persists only to `localStorage`, not server — lost on new device/clear storage | `read-status.ts:1-22` | VERIFIED (static) |
| F-15 | MINOR | Learning UX | `LearningCard` is non-interactive — no route to topic detail or progress | `ArticleCard.tsx:111-124`; `LearningPage.tsx:53-55` | VERIFIED (static) |
| F-16 | MINOR | Navigation | `Cloud` and `Databases` categories exist in schema/enums but have no dedicated nav routes (dashboard maps Cloud → `/news`) | `database.ts:3-8`; `DashboardPage.tsx:68-74`; `navigation.ts:21-30` | VERIFIED (static) |
| F-17 | MINOR | Gmail disconnect | “Disconnect Gmail” has no confirmation step | `PersonalizationSettings.tsx:333-335` | VERIFIED (static) |
| F-18 | MINOR | Auth logging | `console.error` logs profile fetch failures (may include auth context in message) | `auth-context.tsx:41-42` | VERIFIED (static) |
| F-19 | MINOR | Telegram webhook auth | Webhook secret comparison is plain `!==`, not timing-safe (cron auth is timing-safe) | `telegram/auth.ts:14` vs `_shared/auth.ts:1-34` | VERIFIED (static) |
| F-20 | NOTE | Tests | README claims “190+ tests”; suite reports **210** | `README.md:60`; `npm test` output | VERIFIED (command) |
| F-21 | NOTE | Tests | RLS tests assert migration file contents, not live Postgres/pgTAP | `tests/rls.test.ts:5-34`; `supabase/tests/rls_policies.test.sql` not in vitest `include` | VERIFIED (static) |
| F-22 | NOTE | Dead code | `FeaturePlaceholder.tsx` exported but unused in router | grep: only definition in `src/components/FeaturePlaceholder.tsx` | VERIFIED (static) |
| F-23 | NOTE | Deployment docs | `scripts/pg-cron-setup.sql` and `scripts/smoke-test.md` referenced in `BUILD_SEQUENCE.md` but absent from repo | `BUILD_SEQUENCE.md:501-512`; glob found 0 files | VERIFIED (static) |
| F-24 | NOTE | Conventions | `CLAUDE.md` rule 6 forbids silent model-ID defaults; `DEFAULT_MODEL_CONFIG` hardcodes decommissioned IDs | `CLAUDE.md:41-43`; `types.ts:42-46` | VERIFIED (static) |
| F-25 | NOTE | Types drift | `database.ts` omits many tables present in migrations (`gmail_connections`, `telegram_link_tokens`, `notifications`, etc.) | compare `database.ts:160-228` vs migrations `20250905000001`–`20250905000011` | VERIFIED (static) |

---

## 4. Per-phase detail

### Phase A — Orient

#### Stack and versions (from `package.json`, `CLAUDE.md`)

| Layer | Technology | Version (package.json) |
|-------|------------|------------------------|
| Frontend | Vite | ^8.2.2 |
| UI | React | ^19.2.8 |
| Routing | react-router-dom | ^7.9.1 |
| Styling | Tailwind CSS | ^4.1.13 |
| Backend | Supabase (Postgres, Auth, Edge Functions) | @supabase/supabase-js ^2.57.4 |
| Validation | Zod | ^4.1.5 |
| Tests | Vitest | ^3.2.4 |
| PWA | vite-plugin-pwa | ^1.0.3 |

#### Routes and auth requirements (`router.tsx`, `ProtectedRoute.tsx`, `AdminRoute.tsx`)

| Route | Auth | Notes |
|-------|------|-------|
| `/` | Public | Home / marketing |
| `/login`, `/signup` | Guest-only (`GuestRoute`) | Redirects to dashboard if authenticated |
| `/dashboard`, `/news`, `/news/:id`, `/ai`, `/development`, `/security`, `/tools`, `/learning`, `/saved`, `/search`, `/settings` | Authenticated (`ProtectedRoute`) | Requires Supabase env |
| `/admin` | Authenticated + `profile.is_admin` (`AdminRoute`) | Client-side gate; server check in `system-health` |
| `*` | Public | Redirects to `/` |

#### Database tables (12 migrations)

`profiles`, `sources`, `articles`, `article_sources`, `tags`, `article_tags`, `user_interests`, `user_followed_topics`, `saved_articles`, `notifications`, `notification_deliveries`, `learning_topics`, `learning_progress`, `cron_runs`, `ai_generations`, `user_feedback`, `article_user_relevance`, `telegram_link_tokens`, `user_learning_memory`, `gmail_connections`

#### Edge Functions / background jobs

| Function | Auth (`config.toml`) | Purpose |
|----------|----------------------|---------|
| `ingest-sources` | `verify_jwt = false` | RSS ingestion (CRON_SECRET) |
| `process-articles` | false | AI analysis |
| `evaluate-articles` | false | Relevance scoring |
| `dispatch-morning-digest` | false | Morning digest |
| `dispatch-evening-digest` | false | Evening digest |
| `dispatch-weekly-digest` | false | Weekly digest |
| `dispatch-breaking-alerts` | false | Breaking alerts |
| `telegram-webhook` | false | Telegram bot |
| `gmail-oauth` | false | Gmail OAuth start/callback/delete |
| `system-health` | **true** | Admin health metrics |
| `health` | (not in config.toml snippet) | Health check |

Scheduled jobs: documented in `CRON.md` / migration comments; `pg_cron` extension enabled in `20250905000004_ingestion.sql` but no committed setup script.

#### External services

Groq API, Telegram Bot API, Google Gmail OAuth (optional), Supabase Auth/Postgres, Vercel (frontend).

#### Documentation vs code gaps

| Documented | In code? |
|------------|----------|
| Gemini failover, quota (`BUILD_SEQUENCE.md` Phases 3–4) | **No** |
| `callModel(cheap\|deep)` | **No** — Groq-only provider |
| Telegram link token in Settings | **No UI** — table + RLS exist |
| tsvector search (`BUILD_SEQUENCE.md`) | **No** — `ilike` in `search.ts` |
| Phase 19 env vars in `.env.example` | **No** — comment only (Phase 0 reset) |
| Ingestion/AI/Telegram on Home page | **Stale** — says “later phases” |

| In code, not prominently documented |
|-------------------------------------|
| `user_learning_memory` table |
| Client-side relevance persistence to `article_user_relevance` |
| `src/lib/supabase/server.ts` (unused stub) |

---

### Phase B — Automated gates

#### Type check — PASS

```
> tsc -b --noEmit
(exit 0)
```

#### Lint — FAIL

```
51 problems (11 errors, 40 warnings)
```

Errors (11):
- `src/features/admin/api/health.ts:21-42` — `@typescript-eslint/no-unsafe-*` (9 errors)
- `src/features/personalization/api/feedback.ts:18` — `@typescript-eslint/no-unnecessary-type-assertion`
- `tests/notifications/digest-format.test.ts:52` — `@typescript-eslint/no-non-null-assertion`

Warnings (40): predominantly `react-refresh/only-export-components`, `react-hooks/set-state-in-effect`, `react-hooks/exhaustive-deps`.

#### Unit tests — PASS

```
Test Files  47 passed (47)
     Tests  210 passed (210)
  Duration  48.52s
```

#### Production build — PASS

```
✓ 2083 modules transformed
✓ built in 15.88s
PWA precache 45 entries (754.35 KiB)
```

#### E2E — Blocked

No Playwright/Cypress config or `e2e` scripts. `ARCHITECTURE.md:113` states E2E not configured.

#### Test coverage concentration

| Area | Test files | Gap |
|------|------------|-----|
| AI / ingestion / telegram / relevance / notifications | Heavy (30+ files) | — |
| `src/features/settings` | **0** | Settings page untested |
| `src/features/admin` | **0** | AdminHealthPage untested |
| `src/features/articles/NewsDetailPage`, `SearchPage`, `SavedPage` | **0** | Page-level flows untested |
| `src/features/personalization/components` | **0** | PersonalizationSettings untested |
| `src/features/learning` | **0** | LearningPage untested |
| Edge Function `index.ts` entrypoints | **0** direct | Logic tested via `_shared` imports |
| pgTAP `supabase/tests/rls_policies.test.sql` | **Not run** | Excluded from vitest |

210 tests do **not** imply broad UI coverage — the majority exercises server-side shared modules and pure functions.

---

### Phase C — Interactive surface audit

#### `/` HomePage

| Control | Handler | Status |
|---------|---------|--------|
| Get Started / Sign in / Open Dashboard | `<Link>` navigation | Implemented |
| Pillar cards | None | Display only |

#### `/login`, `/signup`

| Control | Handler | Status |
|---------|---------|--------|
| Form submit | `signIn` / `signUp` via auth context | Implemented; loading + error states |
| Cross-links | `<Link>` | Implemented |

#### App shell (`Sidebar`, `MobileNav`, `SearchBar`)

| Control | Handler | Status |
|---------|---------|--------|
| Nav links | React Router `NavLink` | Implemented |
| Sign out (sidebar) | `signOut()` | Implemented |
| Search submit | `navigate(/search?q=...)` | Implemented |
| Mobile menu open/close | Local state | Implemented |
| Admin link | Sidebar only if `profile.is_admin` | **Missing on mobile** (F-13) |
| Sign out on mobile | — | **Missing** (F-13) |

#### `/dashboard`

| Control | Handler | Status |
|---------|---------|--------|
| Article cards — Learn More, Read, Save, Ask AI | Link / `toggleSave` | Save: no error UI (F-08); Ask AI: dead (F-07) |
| Section “View all” links | `<Link>` | Implemented |

#### Category pages (`/news`, `/ai`, `/development`, `/security`, `/tools`)

| Control | Handler | Status |
|---------|---------|--------|
| Article list save/load more | `useArticles` + `toggleSave` | Implemented; save errors silent (F-08) |

#### `/news/:id` NewsDetailPage

| Control | Handler | Status |
|---------|---------|--------|
| Back | `<Link>` | Implemented |
| Save / Mark read | `toggleSave`, `markArticleRead` (localStorage) | Implemented |
| Feedback bar | `submitFeedback` | Implemented; `submitting` disables buttons |
| Ask AI | Link to `#ask` panel | **Stub** (F-07) |

#### `/learning`

| Control | Handler | Status |
|---------|---------|--------|
| Topic cards | None | **Non-interactive** (F-15) |

#### `/saved`, `/search`

| Control | Handler | Status |
|---------|---------|--------|
| Search filters / pagination | `globalSearch`, URL params | Implemented |
| Save on results | `toggleSave` | Silent failure risk (F-08) |

#### `/settings`

| Control | Handler | Status |
|---------|---------|--------|
| Theme buttons | `setTheme` (local) | Implemented |
| Interest toggles + Save | `saveInterests` | Implemented; loading state |
| Notification switches / threshold / hours | `saveProfile` per change | **Race risk** (F-12) |
| Gmail connect | `startGmailOAuth` → redirect | Implemented |
| Gmail disconnect | `disconnectGmail` | No confirm (F-17) |
| Telegram toggle | `saveProfile` | Disabled without `telegram_chat_id`; **no link flow** (F-02) |
| Sign out | `signOut` | Implemented |

#### `/admin`

| Control | Handler | Status |
|---------|---------|--------|
| (read-only metrics) | `fetchSystemHealth` on mount | Implemented; retry on error |
| No refresh button | — | Auto-load only |

#### Destructive actions without confirmation

- Gmail disconnect (F-17)
- Sign out (acceptable for many apps)

#### Double-submit / loading

- Login/signup: `submitting` disables button — OK
- Feedback: `submitting` on bar — OK
- Save article: **no in-flight guard** — double-click can duplicate requests (errors still silent)
- Settings threshold slider: **fires save per tick** (F-12)

---

### Phase D — Workflow traces

#### 1. Signup → dashboard

`SignupPage.handleSubmit` → `auth-context.signUp` → `supabase.auth.signUp` → DB trigger `handle_new_user` inserts `profiles` → `onAuthStateChange` → `fetchProfile` → `navigate(/dashboard)`.

- **Silent failure:** profile fetch error logs to console, `profile` stays null (`auth-context.tsx:41-43`) — dashboard still loads with degraded personalization.
- **Email confirmation:** `config.toml` `enable_confirmations = false` — immediate access.

#### 2. Login → session refresh

`signInWithPassword` → session in context → profile fetch. Session refresh handled by Supabase client subscription.

#### 3. Core value: view ranked articles

`DashboardPage` → `useDashboardArticles` → `articles.ts` Supabase queries (`processing_status = 'published'`) → RLS enforces published-only.

- Fails loudly in UI if query errors (`DashboardPage.tsx:34`).
- Empty state if no published articles (no error).

#### 4. Save article

`toggleSave` → `toggleSaveArticle` insert/delete on `saved_articles` → update local `savedIds`.

- **Silent failure** on error (F-08).
- RLS requires published article for insert — OK.

#### 5. Article feedback → personalization

`submitFeedback` → `user_feedback` upsert → `applyFeedbackAndRescore` → client-side engine → `article_user_relevance` upsert.

- User can write arbitrary scores via direct client upsert (RLS allows own rows) — affects only their relevance display unless server trusts these rows later.
- Interest weight adjustments persisted via `saveInterestWeights`.

#### 6. Telegram linking (primary channel)

Expected: Settings generates token → user `/start <token>` in Telegram → `linkTelegramAccount` updates profile.

- **Broken:** no token generation in Settings UI (F-02).
- Users with SQL/JS knowledge could `insert` into `telegram_link_tokens` (RLS allows) but this is not a product flow.

#### 7. Gmail OAuth

`connectGmail` → `gmail-oauth` GET returns `authUrl` → Google → callback upserts `gmail_connections` (service role) → redirect `/settings?gmail=connected`.

- Disconnect: Edge Function DELETE + client profile update (`health.ts:37-44`).
- Server-side OAuth uses HMAC state (`oauth-state.ts`) — tested.

#### 8. Admin health

`AdminRoute` checks `profile.is_admin` (client) → `fetchSystemHealth` → `system-health` re-validates admin via JWT + profile.

- **Escalation:** F-01 bypasses both checks.
- **Wrong column:** F-05 breaks delivery timestamps.

#### 9. Cron pipeline (server, not UI)

`ingest-sources` → `process-articles` (Groq) → `evaluate-articles` → `dispatch-*` → Telegram/Gmail.

- AI step fails with default decommissioned models (F-03).
- Not runnable in this audit (no credentials).

#### Offline / PWA

PWA builds service worker (`npm run build` output). No offline queue for user writes; read-status is local only.

---

### Phase E — Data and access integrity

#### Schema vs TypeScript types

`src/types/database.ts` covers a subset of tables. Missing from types: `article_sources`, `article_tags`, `tags`, `notifications`, `notification_deliveries`, `learning_progress`, `cron_runs`, `ai_generations`, `gmail_connections`, `telegram_link_tokens`, `user_learning_memory`.

`Article` type includes `what_happened`, `cluster_key`, `relevance_score` — aligned with migrations.

`Profile` includes `morning_digest_hour`, `notification_threshold`, `is_admin` — aligned with migrations 08, 09, 11.

#### RLS summary

RLS enabled on all public tables per `20250905000002_rls_policies.sql` and later migrations.

| Concern | Detail |
|---------|--------|
| `profiles` UPDATE | No column restrictions — **is_admin**, **telegram_chat_id** writable (F-01, F-06) |
| `gmail_connections` | RLS on, no authenticated policies — service role only ✓ |
| `cron_runs`, `ai_generations` | No user policies ✓ |
| `article_user_relevance` | Users can SELECT/INSERT/UPDATE own rows |
| Published articles only | Enforced for reads and saved_articles insert ✓ |

#### Client-only authorization

| Check | Server equivalent? |
|-------|-------------------|
| `AdminRoute` `profile.is_admin` | `system-health` checks DB — but DB value is user-writable (F-01) |
| `ProtectedRoute` | Supabase JWT + RLS ✓ |

#### Duplicated business rules

| Rule | Locations |
|------|-----------|
| Groq model IDs | `types.ts` DEFAULT + env; `analyzer.ts` fallback; `intelligence.ts` hardcoded |
| Notification threshold default 55 | `PersonalizationSettings.tsx:214`; `profile` migration default; `profileToPreferences` |
| Min relevance for category pages | `CategoryArticlesPage.tsx:21` (`minRelevance: 45`) — server uses separate engine |

Authoritative for delivery: server `_shared/relevance` and `profiles.notification_threshold`.

#### Secrets in repo

No `.env` with real credentials found. Only `.env.example` (comment). No JWT keys in source. `package-lock.json` integrity hashes are not secrets.

`validateServerSecrets` in `src/lib/supabase/server.ts` references `SUPABASE_SERVICE_ROLE_KEY` but module is **not imported** from client code.

---

### Phase F — Rot and loose ends

#### TODO / FIXME / HACK

Grep across `*.{ts,tsx,sql}`: **no matches**.

#### Stubs / fixtures in production paths

| Location | Issue |
|----------|-------|
| `ArticleDetail.tsx:144-155` | Ask AI panel — placeholder |
| `src/lib/ai/providers/groq.ts` | Intentional browser stub throwing on `complete()` |
| `HomePage.tsx:89-93` | Stale “later phases” copy |
| `FeaturePlaceholder.tsx` | Unused scaffold component |

#### Console logging

`auth-context.tsx:42` — `console.error('Failed to fetch profile:', error.message)`

Edge functions: no `console.log` matches in `supabase/functions`.

#### False documentation

| Doc | Issue |
|-----|-------|
| `HomePage.tsx` | Claims features not built |
| `README.md:60` | “190+ tests” — actual 210 |
| `BUILD_SEQUENCE.md` | References missing `scripts/` files |
| `AI.md` | Documents decommissioned default models as current |

---

## 5. Coverage gaps

| Gap | What is needed |
|-----|----------------|
| Live Supabase project | `VITE_SUPABASE_*`, Edge Function secrets, applied migrations |
| AI pipeline verification | Valid `GROQ_API_KEY` + non-decommissioned model env vars |
| Telegram E2E | Bot token, webhook, **token generation UI or API** |
| Gmail E2E | Google OAuth client credentials |
| Cron/digest E2E | `CRON_SECRET`, pg_cron or manual dispatch |
| Browser E2E | Playwright/Cypress suite (not present) |
| pgTAP RLS tests | `supabase test db` against local/remote Postgres |
| Admin escalation PoC | Supabase client `update({ is_admin: true })` — **do not run in production** |

---

## 6. Blocked — requires operator

| Item | Operator action |
|------|-----------------|
| End-to-end auth and data | Complete Phase 19: fill `.env`, create Supabase project, deploy migrations |
| E2E browser tests | No suite exists; add Playwright or run manual checklist in `DEPLOYMENT.md` |
| Live AI ingestion | Provision Groq key + update model env vars to supported IDs |
| Telegram linking UAT | Implement Settings token UI **or** manually insert `telegram_link_tokens` row |
| pgTAP / live RLS | `supabase start` + `supabase test db` |
| Cron smoke test | Create `scripts/smoke-test.md` per build sequence and execute post-deploy |
| Lint gate in CI | Fix 11 ESLint errors or adjust CI policy |

---

## 7. Recommended fix order

Dependency-aware sequence (not pure severity sort):

1. **F-01** — Add `profiles` column-level protection (trigger or restricted UPDATE policy for `is_admin`, `telegram_chat_id`, `gmail_address`). *Blocks trustworthy admin.*
2. **F-02** — Add Settings UI to create `telegram_link_tokens` (or Edge Function). *Unblocks primary channel.*
3. **F-03 / F-11** — Phase 3 AI layer: env-only model IDs, remove hardcoded `llama-*`, add Gemini failover. *Unblocks ingestion pipeline.*
4. **F-05** — Fix `system-health` to use `attempted_at`. *Depends on F-01 for meaningful admin use.*
5. **F-09** — Fix ESLint errors so CI can gate merges.
6. **F-08, F-12** — Save error toasts; debounce settings saves.
7. **F-07** — Remove or implement Ask AI (wire to Telegram deep link or in-app).
8. **F-10, F-20, F-23** — Documentation alignment.
9. **F-04** — Phase 19 credentials (operator task after code fixes).

---

*End of report.*
