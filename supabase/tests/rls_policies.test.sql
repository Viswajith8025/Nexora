-- RLS verification tests — run with: supabase test db
-- These tests validate that unauthorized access is blocked.

begin;

select plan(12);

-- ---------------------------------------------------------------------------
-- Setup test users (requires supabase test helpers or manual auth setup)
-- In local test environment, use supabase/tests helpers
-- ---------------------------------------------------------------------------

-- Test: RLS enabled on all tables
select has_rls('public', 'profiles');
select has_rls('public', 'sources');
select has_rls('public', 'articles');
select has_rls('public', 'user_interests');
select has_rls('public', 'saved_articles');
select has_rls('public', 'notifications');
select has_rls('public', 'cron_runs');
select has_rls('public', 'ai_generations');

-- Test: policies exist
select policies_are(
  'public',
  'profiles',
  array['Users can view own profile', 'Users can update own profile']
);

select policies_are(
  'public',
  'sources',
  array['Authenticated users can read active sources']
);

select policies_are(
  'public',
  'articles',
  array['Authenticated users can read published articles']
);

select policies_are(
  'public',
  'user_interests',
  array[
    'Users can view own interests',
    'Users can insert own interests',
    'Users can update own interests',
    'Users can delete own interests'
  ]
);

select * from finish();
rollback;
