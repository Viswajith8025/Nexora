# Nexora Telegram Integration

## Overview

Telegram is Nexora's **primary notification channel**. Users receive breaking alerts, morning/evening/weekly digests, and can interact via natural-language commands.

## Setup

### 1. Create a bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. `/newbot` → choose name and username
3. Save the **bot token** → set as `TELEGRAM_BOT_TOKEN` in Supabase secrets

### 2. Generate webhook secret

```bash
openssl rand -hex 32
```

Set as `TELEGRAM_WEBHOOK_SECRET` in Supabase secrets.

### 3. Register webhook

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<ref>.supabase.co/functions/v1/telegram-webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"
  }'
```

### 4. Deploy function

```bash
supabase functions deploy telegram-webhook
```

## Security

- Every webhook request must include `X-Telegram-Bot-Api-Secret-Token` matching `TELEGRAM_WEBHOOK_SECRET`
- Invalid or missing secret → `401 Unauthorized`
- Bot token never exposed to frontend
- User linking uses one-time codes stored server-side

## User linking

1. User enables Telegram in Settings
2. User sends `/start <link-code>` to the bot (code generated during account linking flow)
3. `profiles.telegram_chat_id` is set
4. User can toggle `telegram_enabled` in Settings

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Link account / welcome |
| `/brief <topic>` | Meeting-ready brief |
| `/learn <topic>` | Learning guide |
| `/compare <a> vs <b>` | Technology comparison |
| `/care <topic>` | Should you care? |
| `/changes <topic>` | Recent changes summary |
| `/help` | Command list |

Natural language queries are routed to the intelligence layer when no command matches.

## Notification delivery

Digests and breaking alerts are sent via `dispatch-*` cron jobs:

1. Articles selected by relevance score and user threshold
2. Quiet hours respected (except critical breaking)
3. Deduplication via `dedupe_key` prevents duplicate sends
4. Delivery recorded in `notifications` + `notification_deliveries`

## Failure handling

- Telegram API errors → notification marked `failed`, logged in `notification_deliveries`
- User sees "Telegram delivery failed" guidance in Settings if delivery fails
- Cron job continues for other users (per-user isolation)
- Failed deliveries visible in admin System Health view

## Testing locally

Use the Vitest suite:

```bash
npm test -- tests/telegram
```

Webhook auth is tested in `tests/telegram/auth.test.ts`.
