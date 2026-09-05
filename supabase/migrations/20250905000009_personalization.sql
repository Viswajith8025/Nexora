-- Personalization and extended feedback signals

alter type public.feedback_signal add value if not exists 'more_like_this';
alter type public.feedback_signal add value if not exists 'less_like_this';
alter type public.feedback_signal add value if not exists 'too_technical';

alter table public.profiles
  add column if not exists notification_threshold smallint not null default 55
    check (notification_threshold between 30 and 90);

comment on column public.profiles.notification_threshold is
  'Minimum personalized relevance score (0-100) for digest/breaking delivery';

-- Allow users to upsert their own personalized relevance rows
create policy article_user_relevance_insert_own
  on public.article_user_relevance
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy article_user_relevance_update_own
  on public.article_user_relevance
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
