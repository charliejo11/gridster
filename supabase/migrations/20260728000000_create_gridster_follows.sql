-- =========================================================
-- Real followers/following system.
--
-- Gridster previously had no directional follow relationship at all -
-- only a mutual gridster_friend_requests table, plus a "Followers" /
-- "Following" stat pair on the profile stats card that was pure mock
-- data (gridsterLeftSidebarProfile.stats in gridsterMockData.js).
-- This adds a real one-directional follow table so those numbers -
-- and a real Follow button on resident profiles - reflect actual data.
-- =========================================================

create table if not exists public.gridster_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint gridster_follows_no_self_follow check (follower_id <> followed_id),
  constraint gridster_follows_unique unique (follower_id, followed_id)
);

create index if not exists gridster_follows_follower_idx on public.gridster_follows (follower_id);
create index if not exists gridster_follows_followed_idx on public.gridster_follows (followed_id);

comment on table public.gridster_follows is
  'One row per (follower_id, followed_id) directional follow. Separate from gridster_friend_requests, which is a mutual accept/decline relationship - a user can follow someone without them accepting anything.';

alter table public.gridster_follows enable row level security;

drop policy if exists "Gridster follows are publicly readable" on public.gridster_follows;

create policy "Gridster follows are publicly readable"
  on public.gridster_follows for select
  using (true);

drop policy if exists "Users can follow as themselves" on public.gridster_follows;

create policy "Users can follow as themselves"
  on public.gridster_follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow as themselves" on public.gridster_follows;

create policy "Users can unfollow as themselves"
  on public.gridster_follows for delete
  using (auth.uid() = follower_id);

-- A freshly created table isn't guaranteed to inherit anon/authenticated/
-- service_role grants from schema defaults (confirmed missing for this
-- exact table on gridster-test until granted explicitly) - granting
-- outright rather than relying on that.
grant select, insert, update, delete on public.gridster_follows to anon, authenticated, service_role;
