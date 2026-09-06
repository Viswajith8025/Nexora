-- Short-term Telegram chat memory for conversational replies (ChatGPT-style)

create table if not exists public.telegram_chat_history (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  user_id uuid references public.profiles (id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists telegram_chat_history_chat_created_idx
  on public.telegram_chat_history (chat_id, created_at desc);

alter table public.telegram_chat_history enable row level security;

comment on table public.telegram_chat_history is
  'Recent Telegram chat turns for multi-turn AI conversations — service role only';
