-- AI intelligence layer enhancements

alter table public.articles
  add column if not exists what_happened text;

alter table public.ai_generations
  add column if not exists duration_ms integer check (duration_ms is null or duration_ms >= 0),
  add column if not exists status text not null default 'success'
    check (status in ('success', 'failure')),
  add column if not exists error text;

create index if not exists ai_generations_status_idx on public.ai_generations (status);
create index if not exists ai_generations_purpose_idx on public.ai_generations (purpose);

comment on column public.ai_generations.purpose is 'AI task identifier e.g. article_analysis, classification';
comment on column public.articles.what_happened is 'Factual description of the event from AI analysis';
