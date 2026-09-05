-- Relevance and notification decision engine

create type public.source_trust_tier as enum (
  'official_doc',
  'official_announcement',
  'github',
  'reputable_publication',
  'community',
  'unknown'
);

create type public.relevance_decision as enum (
  'breaking',
  'digest',
  'store_only',
  'ignore'
);

alter table public.sources
  add column if not exists trust_tier public.source_trust_tier not null default 'unknown';

create index if not exists sources_trust_tier_idx on public.sources (trust_tier);

alter table public.articles
  add column if not exists relevance_score smallint
    check (relevance_score is null or relevance_score between 0 and 100),
  add column if not exists relevance_decision public.relevance_decision,
  add column if not exists relevance_factors jsonb not null default '{}'::jsonb;

create index if not exists articles_relevance_score_idx
  on public.articles (relevance_score desc nulls last);
create index if not exists articles_relevance_decision_idx
  on public.articles (relevance_decision);

-- Per-user personalized relevance (explainable, no ML)
create table public.article_user_relevance (
  user_id uuid not null references public.profiles (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  final_score smallint not null check (final_score between 0 and 100),
  relevance_decision public.relevance_decision not null,
  factors jsonb not null default '{}'::jsonb,
  explanations text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, article_id)
);

create trigger article_user_relevance_set_updated_at
before update on public.article_user_relevance
for each row execute function public.set_updated_at();

create index article_user_relevance_user_decision_idx
  on public.article_user_relevance (user_id, relevance_decision);

alter table public.article_user_relevance enable row level security;

create policy article_user_relevance_select_own
  on public.article_user_relevance
  for select
  to authenticated
  using (user_id = auth.uid());

-- Seed trust tiers for known sources
update public.sources set trust_tier = 'official_announcement'
where metadata ->> 'official' = 'true'
  and category in ('AI', 'Development', 'Cloud', 'Security', 'Developer Tools', 'Databases');

update public.sources set trust_tier = 'official_doc'
where name in ('React Blog', 'Node.js Blog', 'TypeScript Blog', 'Rust Blog', 'PostgreSQL News');

update public.sources set trust_tier = 'github'
where name = 'GitHub Blog' or name = 'GitHub Security Advisories';

update public.sources set trust_tier = 'reputable_publication'
where name in ('The Verge - Tech', 'Ars Technica', 'TechCrunch');

comment on column public.articles.relevance_score is 'Normalized 0-100 relevance score after noise filtering';
comment on column public.articles.relevance_decision is 'Global notification decision: breaking, digest, store_only, ignore';
comment on table public.article_user_relevance is 'Per-user personalized relevance with explainable factor breakdown';
