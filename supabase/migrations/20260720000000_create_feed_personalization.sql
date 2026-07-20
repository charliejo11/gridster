-- =========================================================
-- Feed Personalization
-- Real per-user feed preferences, hidden posts, mute/block
-- relationships, and post reports, backing the Feed
-- Preferences page (previously decorative/"coming soon").
-- =========================================================

-- ---------------------------------------------------------
-- 1. Feed tuning preferences (one row per profile)
-- ---------------------------------------------------------

alter table public.profiles
add column if not exists feed_show_more text[] not null default '{}';

alter table public.profiles
add column if not exists feed_show_less text[] not null default '{}';

alter table public.profiles
add column if not exists feed_ratings text[] not null default '{general,moderate}';

alter table public.profiles
add column if not exists feed_discovery_focus text[] not null default '{}';

comment on column public.profiles.feed_show_more is
  'Gridster Feed Preferences: content types to boost in the Home feed ranking.';
comment on column public.profiles.feed_show_less is
  'Gridster Feed Preferences: content types to demote in the Home feed ranking.';
comment on column public.profiles.feed_ratings is
  'Gridster Feed Preferences: maturity ratings allowed in the Home feed.';
comment on column public.profiles.feed_discovery_focus is
  'Gridster Feed Preferences: ranking focuses (Friends, New creators, Local trends, ...).';

-- ---------------------------------------------------------
-- 2. Post maturity rating
-- ---------------------------------------------------------

alter table public.gridster_posts
add column if not exists maturity_rating text not null default 'general';

alter table public.gridster_posts
drop constraint if exists valid_gridster_post_maturity_rating;

alter table public.gridster_posts
add constraint valid_gridster_post_maturity_rating
  check (maturity_rating in ('general', 'moderate', 'adult'));

-- ---------------------------------------------------------
-- 3. Hidden posts (per user)
-- ---------------------------------------------------------

create table if not exists public.gridster_hidden_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.gridster_posts(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint gridster_hidden_posts_unique unique (user_id, post_id)
);

create index if not exists gridster_hidden_posts_user_id_idx
  on public.gridster_hidden_posts (user_id);

comment on table public.gridster_hidden_posts is
  'Posts a user chose to hide from their own Home feed via the post safety menu.';

alter table public.gridster_hidden_posts enable row level security;

drop policy if exists "Users can view their own hidden posts" on public.gridster_hidden_posts;
create policy "Users can view their own hidden posts"
on public.gridster_hidden_posts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can hide posts for themselves" on public.gridster_hidden_posts;
create policy "Users can hide posts for themselves"
on public.gridster_hidden_posts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can unhide their own hidden posts" on public.gridster_hidden_posts;
create policy "Users can unhide their own hidden posts"
on public.gridster_hidden_posts
for delete
to authenticated
using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 4. Creator actions: mute / block (per user, per target)
-- ---------------------------------------------------------

create table if not exists public.gridster_creator_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now(),

  constraint valid_gridster_creator_action check (action in ('mute', 'block')),
  constraint gridster_creator_actions_unique unique (user_id, target_user_id, action),
  constraint gridster_creator_actions_no_self check (user_id <> target_user_id)
);

create index if not exists gridster_creator_actions_user_id_idx
  on public.gridster_creator_actions (user_id);

comment on table public.gridster_creator_actions is
  'Per-user mute/block relationships used to filter the Home feed and social features.';

alter table public.gridster_creator_actions enable row level security;

drop policy if exists "Users can view their own creator actions" on public.gridster_creator_actions;
create policy "Users can view their own creator actions"
on public.gridster_creator_actions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own creator actions" on public.gridster_creator_actions;
create policy "Users can create their own creator actions"
on public.gridster_creator_actions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own creator actions" on public.gridster_creator_actions;
create policy "Users can remove their own creator actions"
on public.gridster_creator_actions
for delete
to authenticated
using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 5. Post reports
-- ---------------------------------------------------------

create table if not exists public.gridster_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.gridster_posts(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'Spam',
  created_at timestamptz not null default now()
);

create index if not exists gridster_post_reports_post_id_idx
  on public.gridster_post_reports (post_id);

comment on table public.gridster_post_reports is
  'User-submitted reports on posts, for future moderation review.';

alter table public.gridster_post_reports enable row level security;

drop policy if exists "Users can view their own submitted reports" on public.gridster_post_reports;
create policy "Users can view their own submitted reports"
on public.gridster_post_reports
for select
to authenticated
using (auth.uid() = reporter_user_id);

drop policy if exists "Users can submit reports" on public.gridster_post_reports;
create policy "Users can submit reports"
on public.gridster_post_reports
for insert
to authenticated
with check (auth.uid() = reporter_user_id);
