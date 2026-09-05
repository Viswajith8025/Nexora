-- Scheduled intelligence delivery enhancements

create type public.notification_type as enum (
  'morning_digest',
  'evening_digest',
  'weekly_digest',
  'breaking_alert'
);

alter table public.notifications
  add column if not exists notification_type public.notification_type,
  add column if not exists dedupe_key text,
  add column if not exists sent_at timestamptz,
  add column if not exists error_message text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists notifications_dedupe_key_unique
  on public.notifications (user_id, notification_type, dedupe_key)
  where dedupe_key is not null and status in ('sent', 'scheduled', 'pending');

create index if not exists notifications_type_status_idx
  on public.notifications (notification_type, status);

create index if not exists notifications_sent_at_idx
  on public.notifications (sent_at desc nulls last);

alter table public.profiles
  add column if not exists morning_digest_hour smallint not null default 8
    check (morning_digest_hour between 0 and 23),
  add column if not exists evening_digest_hour smallint not null default 19
    check (evening_digest_hour between 0 and 23),
  add column if not exists last_morning_digest_at timestamptz,
  add column if not exists last_evening_digest_at timestamptz,
  add column if not exists last_weekly_digest_at timestamptz;

comment on column public.notifications.dedupe_key is 'Idempotency key to prevent duplicate delivery';
comment on column public.notifications.metadata is 'Article IDs and delivery context';
