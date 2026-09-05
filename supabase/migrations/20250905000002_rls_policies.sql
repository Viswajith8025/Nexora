-- Nexora Row Level Security policies

-- ---------------------------------------------------------------------------
-- Enable RLS on all public tables
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.article_sources enable row level security;
alter table public.tags enable row level security;
alter table public.article_tags enable row level security;
alter table public.user_interests enable row level security;
alter table public.user_followed_topics enable row level security;
alter table public.saved_articles enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.learning_topics enable row level security;
alter table public.learning_progress enable row level security;
alter table public.cron_runs enable row level security;
alter table public.ai_generations enable row level security;
alter table public.user_feedback enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Sources (read-only for authenticated users)
-- ---------------------------------------------------------------------------

create policy "Authenticated users can read active sources"
  on public.sources for select
  to authenticated
  using (is_active = true);

-- ---------------------------------------------------------------------------
-- Articles (read published only)
-- ---------------------------------------------------------------------------

create policy "Authenticated users can read published articles"
  on public.articles for select
  to authenticated
  using (processing_status = 'published');

-- ---------------------------------------------------------------------------
-- Article sources (read when article is accessible)
-- ---------------------------------------------------------------------------

create policy "Authenticated users can read article sources"
  on public.article_sources for select
  to authenticated
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_sources.article_id
        and a.processing_status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- Tags & article tags (read-only)
-- ---------------------------------------------------------------------------

create policy "Authenticated users can read tags"
  on public.tags for select
  to authenticated
  using (true);

create policy "Authenticated users can read article tags"
  on public.article_tags for select
  to authenticated
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_tags.article_id
        and a.processing_status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- User interests
-- ---------------------------------------------------------------------------

create policy "Users can view own interests"
  on public.user_interests for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own interests"
  on public.user_interests for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own interests"
  on public.user_interests for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own interests"
  on public.user_interests for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- User followed topics
-- ---------------------------------------------------------------------------

create policy "Users can view own followed topics"
  on public.user_followed_topics for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own followed topics"
  on public.user_followed_topics for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own followed topics"
  on public.user_followed_topics for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Saved articles
-- ---------------------------------------------------------------------------

create policy "Users can view own saved articles"
  on public.saved_articles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can save articles"
  on public.saved_articles for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.articles a
      where a.id = article_id
        and a.processing_status = 'published'
    )
  );

create policy "Users can unsave articles"
  on public.saved_articles for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Notification deliveries (via notification ownership)
-- ---------------------------------------------------------------------------

create policy "Users can view own notification deliveries"
  on public.notification_deliveries for select
  to authenticated
  using (
    exists (
      select 1 from public.notifications n
      where n.id = notification_deliveries.notification_id
        and n.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Learning topics (read-only)
-- ---------------------------------------------------------------------------

create policy "Authenticated users can read learning topics"
  on public.learning_topics for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Learning progress
-- ---------------------------------------------------------------------------

create policy "Users can view own learning progress"
  on public.learning_progress for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own learning progress"
  on public.learning_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own learning progress"
  on public.learning_progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own learning progress"
  on public.learning_progress for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- User feedback
-- ---------------------------------------------------------------------------

create policy "Users can view own feedback"
  on public.user_feedback for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own feedback"
  on public.user_feedback for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.articles a
      where a.id = article_id
        and a.processing_status = 'published'
    )
  );

create policy "Users can update own feedback"
  on public.user_feedback for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own feedback"
  on public.user_feedback for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Service-only tables: no policies for authenticated/anon
-- cron_runs and ai_generations are accessible only via service role
-- ---------------------------------------------------------------------------
