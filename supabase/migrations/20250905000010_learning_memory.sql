-- User learning memory for /brief, /learn, /compare, /care, /changes

create table public.user_learning_memory (
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic text not null,
  last_command text not null default 'learn',
  view_count integer not null default 1 check (view_count >= 0),
  interest_level smallint not null default 50 check (interest_level between 0 and 100),
  last_viewed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, topic)
);

create trigger user_learning_memory_set_updated_at
before update on public.user_learning_memory
for each row execute function public.set_updated_at();

create index user_learning_memory_user_interest_idx
  on public.user_learning_memory (user_id, interest_level desc);

alter table public.user_learning_memory enable row level security;

create policy user_learning_memory_select_own
  on public.user_learning_memory for select to authenticated
  using (user_id = auth.uid());

create policy user_learning_memory_insert_own
  on public.user_learning_memory for insert to authenticated
  with check (user_id = auth.uid());

create policy user_learning_memory_update_own
  on public.user_learning_memory for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_learning_memory_delete_own
  on public.user_learning_memory for delete to authenticated
  using (user_id = auth.uid());

-- Service role writes from Telegram webhook (uses service key)
create policy user_learning_memory_service_all
  on public.user_learning_memory for all to service_role
  using (true) with check (true);

alter table public.learning_progress
  add column if not exists last_viewed_at timestamptz,
  add column if not exists interest_level smallint not null default 50
    check (interest_level between 0 and 100);

comment on table public.user_learning_memory is
  'Tracks ad-hoc learning queries from Telegram intelligence commands';
