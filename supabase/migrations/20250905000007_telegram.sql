-- Telegram account linking tokens (server-side only)

create table public.telegram_link_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint telegram_link_tokens_token_unique unique (token)
);

create index telegram_link_tokens_user_id_idx on public.telegram_link_tokens (user_id);
create index telegram_link_tokens_expires_at_idx on public.telegram_link_tokens (expires_at);

alter table public.telegram_link_tokens enable row level security;

create policy telegram_link_tokens_select_own
  on public.telegram_link_tokens
  for select
  to authenticated
  using (user_id = auth.uid());

create policy telegram_link_tokens_insert_own
  on public.telegram_link_tokens
  for insert
  to authenticated
  with check (user_id = auth.uid());

comment on table public.telegram_link_tokens is 'One-time tokens for linking Telegram chat to Nexora profile via /start';
