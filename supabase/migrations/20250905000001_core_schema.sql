-- Nexora core schema: tables, constraints, indexes, triggers

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.source_type as enum ('rss', 'github', 'api', 'web');

create type public.content_category as enum (
  'AI',
  'Development',
  'Cloud',
  'Security',
  'Developer Tools',
  'Databases',
  'Technology Industry'
);

create type public.processing_status as enum (
  'discovered',
  'pending',
  'processing',
  'analyzed',
  'published',
  'archived',
  'failed'
);

create type public.verification_status as enum (
  'unverified',
  'pending',
  'verified',
  'disputed',
  'rejected'
);

create type public.notification_level as enum (
  'breaking',
  'high',
  'normal',
  'low',
  'none'
);

create type public.interest_type as enum (
  'category',
  'technology',
  'company',
  'project',
  'topic'
);

create type public.notification_channel as enum ('telegram', 'email', 'web');

create type public.notification_status as enum (
  'pending',
  'scheduled',
  'sent',
  'failed',
  'cancelled'
);

create type public.delivery_status as enum ('success', 'failure');

create type public.cron_status as enum ('running', 'completed', 'failed');

create type public.feedback_signal as enum (
  'relevant',
  'not_relevant',
  'save',
  'dismiss'
);

create type public.learning_difficulty as enum (
  'beginner',
  'intermediate',
  'advanced'
);

-- ---------------------------------------------------------------------------
-- Utility: updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  telegram_enabled boolean not null default false,
  telegram_chat_id text,
  gmail_enabled boolean not null default false,
  morning_digest_enabled boolean not null default true,
  evening_digest_enabled boolean not null default false,
  weekly_digest_enabled boolean not null default true,
  breaking_alerts_enabled boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Sources
-- ---------------------------------------------------------------------------

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.source_type not null default 'rss',
  url text not null,
  category public.content_category not null,
  is_active boolean not null default true,
  fetch_interval_minutes integer not null default 60
    check (fetch_interval_minutes between 5 and 10080),
  last_fetched_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint sources_url_unique unique (url)
);

create trigger sources_set_updated_at
before update on public.sources
for each row execute function public.set_updated_at();

create index sources_is_active_idx on public.sources (is_active);
create index sources_category_idx on public.sources (category);
create index sources_active_category_idx on public.sources (is_active, category);

-- ---------------------------------------------------------------------------
-- Articles
-- ---------------------------------------------------------------------------

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  canonical_url text not null,
  source_id uuid references public.sources (id) on delete set null,
  author text,
  published_at timestamptz,
  discovered_at timestamptz not null default timezone('utc', now()),
  raw_excerpt text,
  image_url text,
  category public.content_category,
  tags text[] not null default '{}',
  content_hash text,
  processing_status public.processing_status not null default 'discovered',
  ai_summary text,
  one_sentence_takeaway text,
  why_it_matters text,
  developer_impact text,
  technical_impact text,
  who_should_care text,
  recommended_action text,
  importance_score smallint
    check (importance_score is null or importance_score between 0 and 100),
  developer_relevance_score smallint
    check (developer_relevance_score is null or developer_relevance_score between 0 and 100),
  urgency_score smallint
    check (urgency_score is null or urgency_score between 0 and 100),
  confidence_score smallint
    check (confidence_score is null or confidence_score between 0 and 100),
  novelty_score smallint
    check (novelty_score is null or novelty_score between 0 and 100),
  notification_level public.notification_level not null default 'none',
  verification_status public.verification_status not null default 'unverified',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint articles_canonical_url_unique unique (canonical_url),
  constraint articles_content_hash_unique unique (content_hash)
);

create trigger articles_set_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

create index articles_published_at_idx on public.articles (published_at desc nulls last);
create index articles_importance_score_idx on public.articles (importance_score desc nulls last);
create index articles_category_idx on public.articles (category);
create index articles_processing_status_idx on public.articles (processing_status);
create index articles_source_id_idx on public.articles (source_id);
create index articles_verification_status_idx on public.articles (verification_status);
create index articles_title_trgm_idx on public.articles using gin (title gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Article sources (many-to-many)
-- ---------------------------------------------------------------------------

create table public.article_sources (
  article_id uuid not null references public.articles (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  discovered_at timestamptz not null default timezone('utc', now()),
  primary key (article_id, source_id)
);

create index article_sources_source_id_idx on public.article_sources (source_id);

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  category public.content_category,
  created_at timestamptz not null default timezone('utc', now()),
  constraint tags_name_unique unique (name),
  constraint tags_slug_unique unique (slug)
);

create index tags_category_idx on public.tags (category);

-- ---------------------------------------------------------------------------
-- Article tags (many-to-many)
-- ---------------------------------------------------------------------------

create table public.article_tags (
  article_id uuid not null references public.articles (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (article_id, tag_id)
);

create index article_tags_tag_id_idx on public.article_tags (tag_id);

-- ---------------------------------------------------------------------------
-- User interests
-- ---------------------------------------------------------------------------

create table public.user_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  interest_type public.interest_type not null,
  value text not null,
  weight smallint not null default 50
    check (weight between 0 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_interests_unique unique (user_id, interest_type, value)
);

create trigger user_interests_set_updated_at
before update on public.user_interests
for each row execute function public.set_updated_at();

create index user_interests_user_id_idx on public.user_interests (user_id);
create index user_interests_type_value_idx on public.user_interests (interest_type, value);

-- ---------------------------------------------------------------------------
-- User followed topics
-- ---------------------------------------------------------------------------

create table public.user_followed_topics (
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, topic)
);

create index user_followed_topics_user_id_idx on public.user_followed_topics (user_id);

-- ---------------------------------------------------------------------------
-- Saved articles
-- ---------------------------------------------------------------------------

create table public.saved_articles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  saved_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, article_id)
);

create index saved_articles_user_id_idx on public.saved_articles (user_id);
create index saved_articles_article_id_idx on public.saved_articles (article_id);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  article_id uuid references public.articles (id) on delete set null,
  channel public.notification_channel not null,
  title text not null,
  body text not null,
  status public.notification_status not null default 'pending',
  notification_level public.notification_level not null default 'normal',
  scheduled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_status_scheduled_idx on public.notifications (status, scheduled_at);

-- ---------------------------------------------------------------------------
-- Notification deliveries
-- ---------------------------------------------------------------------------

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  channel public.notification_channel not null,
  status public.delivery_status not null,
  response jsonb not null default '{}'::jsonb,
  attempted_at timestamptz not null default timezone('utc', now())
);

create index notification_deliveries_notification_id_idx
  on public.notification_deliveries (notification_id);

-- ---------------------------------------------------------------------------
-- Learning topics
-- ---------------------------------------------------------------------------

create table public.learning_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category public.content_category,
  difficulty public.learning_difficulty not null default 'beginner',
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger learning_topics_set_updated_at
before update on public.learning_topics
for each row execute function public.set_updated_at();

create index learning_topics_category_idx on public.learning_topics (category);

-- ---------------------------------------------------------------------------
-- Learning progress
-- ---------------------------------------------------------------------------

create table public.learning_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic_id uuid not null references public.learning_topics (id) on delete cascade,
  progress smallint not null default 0 check (progress between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, topic_id)
);

create trigger learning_progress_set_updated_at
before update on public.learning_progress
for each row execute function public.set_updated_at();

create index learning_progress_user_id_idx on public.learning_progress (user_id);

-- ---------------------------------------------------------------------------
-- Cron runs (service-only audit)
-- ---------------------------------------------------------------------------

create table public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status public.cron_status not null default 'running',
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  items_processed integer not null default 0 check (items_processed >= 0),
  error text,
  metadata jsonb not null default '{}'::jsonb
);

create index cron_runs_job_started_idx on public.cron_runs (job_name, started_at desc);

-- ---------------------------------------------------------------------------
-- AI generations (service-only audit)
-- ---------------------------------------------------------------------------

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  purpose text not null,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  article_id uuid references public.articles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index ai_generations_article_id_idx on public.ai_generations (article_id);
create index ai_generations_created_at_idx on public.ai_generations (created_at desc);

-- ---------------------------------------------------------------------------
-- User feedback
-- ---------------------------------------------------------------------------

create table public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  signal public.feedback_signal not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_feedback_unique unique (user_id, article_id, signal)
);

create index user_feedback_user_id_idx on public.user_feedback (user_id);
create index user_feedback_article_id_idx on public.user_feedback (article_id);
