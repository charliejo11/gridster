-- =========================================================
-- Real post engagement + boost-eligibility prerequisites
--
-- Before this migration, "likes"/"saves" were per-browser
-- localStorage flags and comments/shares/clicks had no backing
-- table at all - there was nothing for an honest organic Trending
-- score to read. This migration adds real, server-tracked
-- engagement so Trending (and later, boost eligibility/labeling)
-- can be computed from genuine user actions instead of faked.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Account standing (gates boosting; does not affect anything
--    else - no suspension mechanism exists yet, so this column
--    defaults every account to good standing until an admin flow
--    sets it otherwise).
-- ---------------------------------------------------------

alter table public.profiles
add column if not exists account_status text not null default 'good_standing';

alter table public.profiles
drop constraint if exists valid_profile_account_status;

alter table public.profiles
add constraint valid_profile_account_status
  check (account_status in ('good_standing', 'warned', 'suspended'));

comment on column public.profiles.account_status is
  'Account standing used to gate paid post boosting. Defaults to good_standing for every account - no suspension UI exists yet, this is the column an admin flow will set.';

-- ---------------------------------------------------------
-- 2. Post moderation/visibility + event-post linkage
-- ---------------------------------------------------------

alter table public.gridster_posts
add column if not exists is_public boolean not null default true;

alter table public.gridster_posts
add column if not exists is_deleted boolean not null default false;

alter table public.gridster_posts
add column if not exists moderation_status text not null default 'clear';

alter table public.gridster_posts
drop constraint if exists valid_gridster_post_moderation_status;

alter table public.gridster_posts
add constraint valid_gridster_post_moderation_status
  check (moderation_status in ('clear', 'under_review', 'removed'));

comment on column public.gridster_posts.is_public is
  'Whether the post is publicly visible. Defaults true for backward compatibility - the existing public-read policy is unchanged, this only gates boost eligibility for now.';
comment on column public.gridster_posts.is_deleted is
  'Soft-delete flag for boost-eligibility checks. The existing hard-delete flow (deleteGridsterPost) is unchanged; this column exists so a boosted post can be gated without requiring a real delete.';
comment on column public.gridster_posts.moderation_status is
  'Moderation state used to gate boosting. Defaults clear for every existing/new post - no moderation review workflow exists yet, this is the column that workflow will set.';

-- Add 'event' as a valid post_type and link event posts to a real
-- gridster_events row so Event Push boosts can check event.starts_at
-- / event.is_approved like a normal boostable post.
alter table public.gridster_posts
drop constraint if exists valid_gridster_post_type;

alter table public.gridster_posts
add constraint valid_gridster_post_type
  check (post_type in ('general', 'photo', 'blog', 'store', 'event'));

alter table public.gridster_posts
add column if not exists linked_event_id uuid references public.gridster_events(id) on delete set null;

create index if not exists gridster_posts_linked_event_id_idx
  on public.gridster_posts (linked_event_id);

comment on column public.gridster_posts.linked_event_id is
  'Optional link to a gridster_events row when post_type = event. Required for Event Push boost eligibility (event must be approved and upcoming).';

-- ---------------------------------------------------------
-- 3. Event scheduling/approval (event_type check already exists;
--    this adds the real datetime + approval flag Event Push needs -
--    when_label stays the free-text display string).
-- ---------------------------------------------------------

alter table public.gridster_events
add column if not exists starts_at timestamptz;

alter table public.gridster_events
add column if not exists is_approved boolean not null default true;

comment on column public.gridster_events.starts_at is
  'Real, checkable event start time. Nullable - when_label remains the free-text display string. Required (and must be in the future) for a post to be Event Push boost eligible.';
comment on column public.gridster_events.is_approved is
  'Whether an admin has approved this event as eligible for paid promotion (Event Push boost). Defaults true for pre-existing events, mirrors gridster_places.is_approved.';

-- ---------------------------------------------------------
-- 4. Reactions (likes)
-- ---------------------------------------------------------

create table if not exists public.gridster_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.gridster_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint gridster_post_reactions_unique unique (post_id, user_id)
);

create index if not exists gridster_post_reactions_post_id_idx
  on public.gridster_post_reactions (post_id);

comment on table public.gridster_post_reactions is
  'Real per-user post likes, replacing the previous localStorage-only "likedPosts" flag. One row per (post, user) - toggled by delete/insert, not updated.';

alter table public.gridster_post_reactions enable row level security;

drop policy if exists "Anyone can view post reactions" on public.gridster_post_reactions;
create policy "Anyone can view post reactions"
on public.gridster_post_reactions
for select
using (true);

drop policy if exists "Users can react to posts" on public.gridster_post_reactions;
create policy "Users can react to posts"
on public.gridster_post_reactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own reaction" on public.gridster_post_reactions;
create policy "Users can remove their own reaction"
on public.gridster_post_reactions
for delete
to authenticated
using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 5. Comments
-- ---------------------------------------------------------

create table if not exists public.gridster_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.gridster_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),

  constraint gridster_post_comments_body_not_blank check (length(trim(body)) > 0)
);

create index if not exists gridster_post_comments_post_id_idx
  on public.gridster_post_comments (post_id, created_at);

comment on table public.gridster_post_comments is
  'Real post comments, replacing the previous hardcoded sample comment list shown in the feed comment panel.';

alter table public.gridster_post_comments enable row level security;

drop policy if exists "Anyone can view post comments" on public.gridster_post_comments;
create policy "Anyone can view post comments"
on public.gridster_post_comments
for select
using (true);

drop policy if exists "Users can comment on posts" on public.gridster_post_comments;
create policy "Users can comment on posts"
on public.gridster_post_comments
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own comments" on public.gridster_post_comments;
create policy "Users can delete their own comments"
on public.gridster_post_comments
for delete
to authenticated
using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 6. Saves
-- ---------------------------------------------------------

create table if not exists public.gridster_post_saves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.gridster_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint gridster_post_saves_unique unique (post_id, user_id)
);

create index if not exists gridster_post_saves_user_id_idx
  on public.gridster_post_saves (user_id);
create index if not exists gridster_post_saves_post_id_idx
  on public.gridster_post_saves (post_id);

comment on table public.gridster_post_saves is
  'Real per-user saved posts, replacing the previous localStorage-only "savedPosts" flag.';

alter table public.gridster_post_saves enable row level security;

-- Saves are intentionally private (unlike reactions/comments/shares,
-- which are public social signals) - a viewer should not be able to
-- see who bookmarked what. Public save *counts* are still available
-- via gridster_post_engagement_stats, which is a plain view owned by
-- the migration role and so reads these rows without going through
-- this per-user policy - it exposes only the aggregate count, never
-- the underlying (post_id, user_id) rows. Do not add a public select
-- policy here; that would defeat this privacy boundary.
drop policy if exists "Users can view their own saves" on public.gridster_post_saves;
create policy "Users can view their own saves"
on public.gridster_post_saves
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Anyone can view save counts" on public.gridster_post_saves;

drop policy if exists "Users can save posts" on public.gridster_post_saves;
create policy "Users can save posts"
on public.gridster_post_saves
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can unsave their own saves" on public.gridster_post_saves;
create policy "Users can unsave their own saves"
on public.gridster_post_saves
for delete
to authenticated
using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 7. Shares
-- ---------------------------------------------------------

create table if not exists public.gridster_post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.gridster_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  share_type text not null default 'repost',
  created_at timestamptz not null default now(),

  constraint valid_gridster_share_type
    check (share_type in ('repost', 'message', 'copy_link', 'copy_slurl'))
);

create index if not exists gridster_post_shares_post_id_idx
  on public.gridster_post_shares (post_id);

comment on table public.gridster_post_shares is
  'Real share/repost events, replacing the previous share panel that only showed a toast with no persistence.';

alter table public.gridster_post_shares enable row level security;

drop policy if exists "Anyone can view share counts" on public.gridster_post_shares;
create policy "Anyone can view share counts"
on public.gridster_post_shares
for select
using (true);

drop policy if exists "Users can log their own shares" on public.gridster_post_shares;
create policy "Users can log their own shares"
on public.gridster_post_shares
for insert
to authenticated
with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 8. Profile / teleport clicks (organic signal - distinct from
--    gridster_boost_events, which tracks the same click types but
--    scoped to a specific paid boost for the creator dashboard).
-- ---------------------------------------------------------

create table if not exists public.gridster_post_clicks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.gridster_posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  click_type text not null,
  created_at timestamptz not null default now(),

  constraint valid_gridster_post_click_type check (click_type in ('profile', 'teleport'))
);

create index if not exists gridster_post_clicks_post_id_idx
  on public.gridster_post_clicks (post_id, click_type);

comment on table public.gridster_post_clicks is
  'Organic profile-click / teleport-click tracking for posts. Insert is best-effort from the client and must never block teleporting or profile navigation, matching gridster_featured_teleport_clicks.';

alter table public.gridster_post_clicks enable row level security;

drop policy if exists "Anyone can record a post click" on public.gridster_post_clicks;
create policy "Anyone can record a post click"
on public.gridster_post_clicks
for insert
to anon, authenticated
with check (user_id is null or user_id = auth.uid());

drop policy if exists "Anyone can view post click counts" on public.gridster_post_clicks;
create policy "Anyone can view post click counts"
on public.gridster_post_clicks
for select
using (true);

-- ---------------------------------------------------------
-- 9. Aggregated engagement stats view
--
-- Unique-user-deduplicated per post, plus a recent-window count for
-- the growth-rate term in the organic Trending formula. The client
-- fetches this one row per post instead of raw event rows, and the
-- creator's own actions are excluded everywhere here (anti-gaming:
-- a creator liking/saving/sharing/clicking their own post never
-- counts toward their own Trending score).
-- ---------------------------------------------------------

create or replace view public.gridster_post_engagement_stats as
select
  p.id as post_id,
  p.user_id as author_id,
  p.created_at as post_created_at,
  (select count(distinct r.user_id) from public.gridster_post_reactions r
    where r.post_id = p.id and r.user_id <> p.user_id) as reaction_count,
  (select count(distinct c.user_id) from public.gridster_post_comments c
    where c.post_id = p.id and c.user_id <> p.user_id) as comment_count,
  (select count(distinct s.user_id) from public.gridster_post_saves s
    where s.post_id = p.id and s.user_id <> p.user_id) as save_count,
  (select count(distinct sh.user_id) from public.gridster_post_shares sh
    where sh.post_id = p.id and sh.user_id <> p.user_id) as share_count,
  -- Distinct per signed-in viewer (repeated clicks from the same
  -- account don't keep adding weight); each anonymous click still
  -- counts once since coalesce falls back to the row's own id.
  (select count(distinct coalesce(pc.user_id::text, pc.id::text)) from public.gridster_post_clicks pc
    where pc.post_id = p.id and pc.click_type = 'profile'
      and (pc.user_id is null or pc.user_id <> p.user_id)) as profile_click_count,
  (select count(distinct coalesce(pc.user_id::text, pc.id::text)) from public.gridster_post_clicks pc
    where pc.post_id = p.id and pc.click_type = 'teleport'
      and (pc.user_id is null or pc.user_id <> p.user_id)) as teleport_click_count,
  (
    select count(distinct engager) from (
      select user_id as engager from public.gridster_post_reactions where post_id = p.id
      union
      select user_id as engager from public.gridster_post_comments where post_id = p.id
      union
      select user_id as engager from public.gridster_post_saves where post_id = p.id
      union
      select user_id as engager from public.gridster_post_shares where post_id = p.id
    ) engagers
    where engager <> p.user_id
  ) as unique_engaged_users,
  (
    select count(*) from (
      select created_at from public.gridster_post_reactions where post_id = p.id and user_id <> p.user_id
      union all
      select created_at from public.gridster_post_comments where post_id = p.id and user_id <> p.user_id
      union all
      select created_at from public.gridster_post_saves where post_id = p.id and user_id <> p.user_id
      union all
      select created_at from public.gridster_post_shares where post_id = p.id and user_id <> p.user_id
    ) recent_engagement
    where created_at >= now() - interval '48 hours'
  ) as recent_engagement_count
from public.gridster_posts p;

comment on view public.gridster_post_engagement_stats is
  'Per-post, unique-user-deduplicated engagement counts (creator self-engagement excluded) backing the organic Trending formula. recent_engagement_count is the 48h window used for the growth-rate term.';
