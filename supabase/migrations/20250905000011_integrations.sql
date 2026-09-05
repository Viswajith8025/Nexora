-- Gmail integration, admin access, saved-articles policy note

alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists gmail_address text,
  add column if not exists last_gmail_delivery_at timestamptz;

-- OAuth tokens: service-role only (no client policies)
create table public.gmail_connections (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null,
  refresh_token text not null,
  connected_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger gmail_connections_set_updated_at
before update on public.gmail_connections
for each row execute function public.set_updated_at();

alter table public.gmail_connections enable row level security;

comment on table public.gmail_connections is
  'Gmail OAuth refresh tokens — service role only, never exposed to clients';

comment on table public.saved_articles is
  'User-saved articles — never automatically deleted by Nexora';

-- Admins can read own is_admin flag (already via profiles select own)
create index if not exists profiles_is_admin_idx on public.profiles (is_admin) where is_admin = true;
