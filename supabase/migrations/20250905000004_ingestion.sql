-- Ingestion enhancements: deduplication fields and cron preparation

alter table public.articles
  add column if not exists normalized_title text,
  add column if not exists cluster_key text;

create index if not exists articles_normalized_title_trgm_idx
  on public.articles using gin (normalized_title gin_trgm_ops);

create index if not exists articles_cluster_key_idx
  on public.articles (cluster_key)
  where cluster_key is not null;

create index if not exists articles_content_hash_idx
  on public.articles (content_hash)
  where content_hash is not null;

comment on column public.articles.normalized_title is
  'Lowercased, punctuation-stripped title used for similarity matching';

comment on column public.articles.cluster_key is
  'Groups articles describing the same event from different sources';

-- Prepare pg_cron for scheduled ingestion (requires Supabase Pro or self-hosted)
create extension if not exists pg_cron with schema extensions;

-- Idempotent cron job registration helper comment:
-- After deploying ingest-sources Edge Function, schedule via Supabase Dashboard
-- or run:
--   select cron.schedule(
--     'nexora-ingest-sources',
--     '0 */6 * * *',
--     $$ select net.http_post(
--       url := '<SUPABASE_URL>/functions/v1/ingest-sources',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'x-cron-secret', '<CRON_SECRET>'
--       ),
--       body := '{}'::jsonb
--     ) as request_id; $$
--   );
