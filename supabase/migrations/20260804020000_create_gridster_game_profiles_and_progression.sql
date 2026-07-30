-- =========================================================
-- Gridster Games: shared XP/level/title/achievement layer.
--
-- A dedicated gridster_game_profiles satellite table, not new columns
-- on public.profiles - profiles' own UPDATE policy already pins nine
-- columns by name (is_admin, is_plus, plus_status, ...; see
-- 20260727000000_fix_security_audit_findings.sql), and one more
-- column to remember to pin is exactly the bug class this whole
-- session has been fixing. The codebase already moved satellite state
-- (bling_balances, equipped_cosmetics) out of profiles for the same
-- reason - see 20260727020000_fix_low_audit_findings.sql's note that
-- profiles.bling_bits/equipped_badges are superseded and unwritten.
--
-- Levels unlock cosmetic rewards and titles ONLY, never gameplay
-- advantages - grant_game_xp() below never touches anything that
-- affects odds, limits, or scoring.
-- =========================================================

-- bling_purchases.source lets the Prize Vault distinguish game-won
-- cosmetics from shop purchases. Added here (the first migration in
-- this batch that needs it) rather than later, since grant_game_xp
-- and check_and_grant_game_achievements below both write it
-- immediately. Purely additive with a default - does not touch the
-- standalone Photo Challenges feature or any existing shop purchase
-- row (they all default to 'shop_purchase').
alter table public.bling_purchases
  add column if not exists source text not null default 'shop_purchase';

alter table public.bling_purchases
  drop constraint if exists valid_bling_purchase_source;

alter table public.bling_purchases
  add constraint valid_bling_purchase_source check (
    source in ('shop_purchase', 'game_spin', 'game_photo_battle', 'game_level_reward', 'game_achievement')
  );

create table if not exists public.gridster_game_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  current_title text,
  spins_total integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gridster_game_profiles enable row level security;

drop policy if exists "Game profiles are publicly readable" on public.gridster_game_profiles;
create policy "Game profiles are publicly readable"
on public.gridster_game_profiles
for select
using (true);

-- No INSERT/UPDATE/DELETE policy at all, intentionally - only
-- grant_game_xp() (SECURITY DEFINER, no client grant) ever writes here.

create table if not exists public.gridster_game_levels (
  level integer primary key,
  xp_required integer not null unique check (xp_required >= 0)
);

create table if not exists public.gridster_game_titles (
  level_threshold integer primary key,
  title text not null
);

create table if not exists public.gridster_game_level_rewards (
  level integer primary key,
  cosmetic_item_id uuid references public.bling_items(id)
);

alter table public.gridster_game_levels enable row level security;
alter table public.gridster_game_titles enable row level security;
alter table public.gridster_game_level_rewards enable row level security;

drop policy if exists "Game levels are publicly readable" on public.gridster_game_levels;
create policy "Game levels are publicly readable" on public.gridster_game_levels for select using (true);
drop policy if exists "Admins can write game levels" on public.gridster_game_levels;
create policy "Admins can write game levels" on public.gridster_game_levels for all to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists "Game titles are publicly readable" on public.gridster_game_titles;
create policy "Game titles are publicly readable" on public.gridster_game_titles for select using (true);
drop policy if exists "Admins can write game titles" on public.gridster_game_titles;
create policy "Admins can write game titles" on public.gridster_game_titles for all to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists "Game level rewards are publicly readable" on public.gridster_game_level_rewards;
create policy "Game level rewards are publicly readable" on public.gridster_game_level_rewards for select using (true);
drop policy if exists "Admins can write game level rewards" on public.gridster_game_level_rewards;
create policy "Admins can write game level rewards" on public.gridster_game_level_rewards for all to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

-- Seed a level curve (1..100, quadratic - level 1 always requires 0 xp)
-- and the six suggested titles at their thresholds. Tune later via the
-- admin-write policy above - not a blocker for MVP.
insert into public.gridster_game_levels (level, xp_required)
select lvl, ((lvl - 1) * (lvl - 1) * 50)
from generate_series(1, 100) as lvl
on conflict (level) do nothing;

insert into public.gridster_game_titles (level_threshold, title) values
  (1, 'Grid Rookie'),
  (5, 'Button Masher'),
  (15, 'Grid Player'),
  (30, 'Pixel Competitor'),
  (50, 'Grid Champion'),
  (75, 'Legendary Menace')
on conflict (level_threshold) do nothing;

-- Seed a small set of level-reward badges, reusing the exact
-- upsert-by-slug pattern already used for the photo challenge badge.
insert into public.bling_items (slug, name, description, item_type, price, preview_class) values
  ('game-level-5-badge', 'Button Masher Badge', 'Awarded for reaching Level 5 in Gridster Games.', 'badge', 0, 'bling-badge-game-level-5'),
  ('game-level-15-badge', 'Grid Player Badge', 'Awarded for reaching Level 15 in Gridster Games.', 'badge', 0, 'bling-badge-game-level-15'),
  ('game-level-30-badge', 'Pixel Competitor Badge', 'Awarded for reaching Level 30 in Gridster Games.', 'badge', 0, 'bling-badge-game-level-30'),
  ('game-level-50-badge', 'Grid Champion Badge', 'Awarded for reaching Level 50 in Gridster Games.', 'badge', 0, 'bling-badge-game-level-50'),
  ('game-level-75-badge', 'Legendary Menace Badge', 'Awarded for reaching Level 75 in Gridster Games.', 'badge', 0, 'bling-badge-game-level-75')
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, item_type = excluded.item_type, preview_class = excluded.preview_class, is_active = true;

insert into public.gridster_game_level_rewards (level, cosmetic_item_id)
select 5, id from public.bling_items where slug = 'game-level-5-badge'
union all select 15, id from public.bling_items where slug = 'game-level-15-badge'
union all select 30, id from public.bling_items where slug = 'game-level-30-badge'
union all select 50, id from public.bling_items where slug = 'game-level-50-badge'
union all select 75, id from public.bling_items where slug = 'game-level-75-badge'
on conflict (level) do nothing;

-- =========================
-- Achievements
-- =========================

create table if not exists public.gridster_game_achievements (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  badge_item_id uuid references public.bling_items(id),
  criteria_type text not null check (criteria_type in ('spins_completed', 'trivia_correct_count', 'photo_battles_won')),
  criteria_value integer not null check (criteria_value > 0)
);

create table if not exists public.gridster_game_user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.gridster_game_achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  constraint gridster_game_user_achievements_unique unique (user_id, achievement_id)
);

create index if not exists gridster_game_user_achievements_user_idx on public.gridster_game_user_achievements (user_id);

alter table public.gridster_game_achievements enable row level security;
alter table public.gridster_game_user_achievements enable row level security;

drop policy if exists "Game achievements are publicly readable" on public.gridster_game_achievements;
create policy "Game achievements are publicly readable" on public.gridster_game_achievements for select using (true);
drop policy if exists "Admins can write game achievements" on public.gridster_game_achievements;
create policy "Admins can write game achievements" on public.gridster_game_achievements for all to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists "Unlocked game achievements are publicly readable" on public.gridster_game_user_achievements;
create policy "Unlocked game achievements are publicly readable"
on public.gridster_game_user_achievements
for select
using (true);
-- No write policy - only check_and_grant_game_achievements() (SECURITY DEFINER, no client grant) writes here.

insert into public.gridster_game_achievements (slug, name, description, criteria_type, criteria_value) values
  ('spin-streak-7', 'Spin Streak', 'Completed 7 Daily Spins.', 'spins_completed', 7),
  ('trivia-whiz-10', 'Trivia Whiz', 'Answered 10 trivia questions correctly.', 'trivia_correct_count', 10),
  ('battle-winner-1', 'Battle Winner', 'Won a Photo Challenge Battle.', 'photo_battles_won', 1)
on conflict (slug) do nothing;

-- =========================
-- grant_game_xp: internal-only. Updates XP/level/title, grants any
-- newly-crossed level's cosmetic reward (ownership only - never
-- auto-equipped, so a small win can't displace a badge/frame the user
-- chose on purpose), fires game_level_up on a real level change.
--
-- INVARIANT: this function has NO idempotency check of its own - it
-- is only safe to call from inside a block that has ALREADY passed
-- its own atomic gate (a claim-table insert, a row-locked one-time
-- transition, etc). Every call site in later migrations must be
-- audited against this invariant before being added. Do not call this
-- directly from client code or from a function without its own gate.
-- =========================

create or replace function public.grant_game_xp(target_user_id uuid, xp_amount integer, source text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  old_level integer;
  new_xp integer;
  new_level integer;
  new_title text;
  reward_level integer;
  reward_item_id uuid;
begin
  insert into public.gridster_game_profiles (user_id) values (target_user_id) on conflict (user_id) do nothing;

  select level into old_level from public.gridster_game_profiles where user_id = target_user_id for update;

  update public.gridster_game_profiles
  set xp = xp + greatest(xp_amount, 0), updated_at = now()
  where user_id = target_user_id
  returning xp into new_xp;

  select max(level) into new_level from public.gridster_game_levels where xp_required <= new_xp;
  new_level := coalesce(new_level, 1);

  if new_level > old_level then
    select title into new_title from public.gridster_game_titles where level_threshold <= new_level order by level_threshold desc limit 1;

    update public.gridster_game_profiles
    set level = new_level, current_title = coalesce(new_title, current_title)
    where user_id = target_user_id;

    for reward_level, reward_item_id in
      select lr.level, lr.cosmetic_item_id
      from public.gridster_game_level_rewards lr
      where lr.level > old_level and lr.level <= new_level and lr.cosmetic_item_id is not null
    loop
      insert into public.bling_purchases (user_id, item_id, source)
      values (target_user_id, reward_item_id, 'game_level_reward')
      on conflict (user_id, item_id) do nothing;
    end loop;

    perform public.create_or_group_notification(
      p_recipient_user_id => target_user_id,
      p_actor_user_id => null,
      p_notification_type => 'game_level_up',
      p_amount => new_level,
      p_title => 'Level up!',
      p_message => coalesce(new_title, '')
    );
  end if;

  return jsonb_build_object('ok', true, 'xp', new_xp, 'level', new_level, 'source', source);
end;
$$;

revoke execute on function public.grant_game_xp(uuid, integer, text) from public;

-- =========================
-- check_and_grant_game_achievements: internal-only, same posture.
-- Hardcoded MVP criteria (not a generic rules engine). References
-- gridster_game_spins, gridster_game_trivia_attempts, and
-- gridster_game_photo_battle_prize_claims, none of which exist until
-- later migrations in this same batch - safe, because PL/pgSQL does
-- not validate table references inside a function body until the
-- function actually executes, and this function is never called
-- until well after every migration in this batch has applied.
-- =========================

create or replace function public.check_and_grant_game_achievements(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  achievement record;
  current_count integer;
  inserted_id uuid;
begin
  for achievement in select * from public.gridster_game_achievements loop
    if exists (
      select 1 from public.gridster_game_user_achievements
      where user_id = target_user_id and achievement_id = achievement.id
    ) then
      continue;
    end if;

    current_count := case achievement.criteria_type
      when 'spins_completed' then (select count(*) from public.gridster_game_spins where user_id = target_user_id)
      when 'trivia_correct_count' then (select count(*) from public.gridster_game_trivia_attempts where user_id = target_user_id and is_correct = true)
      when 'photo_battles_won' then (select count(*) from public.gridster_game_photo_battle_prize_claims where user_id = target_user_id)
      else 0
    end;

    if current_count >= achievement.criteria_value then
      insert into public.gridster_game_user_achievements (user_id, achievement_id)
      values (target_user_id, achievement.id)
      on conflict (user_id, achievement_id) do nothing
      returning id into inserted_id;

      if inserted_id is not null then
        if achievement.badge_item_id is not null then
          insert into public.bling_purchases (user_id, item_id, source)
          values (target_user_id, achievement.badge_item_id, 'game_achievement')
          on conflict (user_id, item_id) do nothing;
        end if;

        perform public.create_or_group_notification(
          p_recipient_user_id => target_user_id,
          p_actor_user_id => null,
          p_notification_type => 'game_achievement_unlocked',
          p_title => achievement.name,
          p_message => achievement.description
        );
      end if;
    end if;
  end loop;
end;
$$;

revoke execute on function public.check_and_grant_game_achievements(uuid) from public;

-- Explicit table grants. RLS is still the real gate for everything
-- below - these grants only let the role attempt the operation at
-- all. Confirmed necessary: table-level GRANTs are a SEPARATE
-- mechanism from RLS policies, and relying on ambient default
-- privileges to cover this automatically turned out not to be safe to
-- assume (see the smoke-test finding this migration set was verified
-- against). No write grants for gridster_game_user_achievements or
-- gridster_game_profiles - both are RPC-only writes, and a
-- SECURITY DEFINER function's owner has implicit privileges on
-- objects it owns without needing a grant.
grant select on public.gridster_game_profiles to anon, authenticated;
grant select on public.gridster_game_levels to anon, authenticated;
grant insert, update, delete on public.gridster_game_levels to authenticated;
grant select on public.gridster_game_titles to anon, authenticated;
grant insert, update, delete on public.gridster_game_titles to authenticated;
grant select on public.gridster_game_level_rewards to anon, authenticated;
grant insert, update, delete on public.gridster_game_level_rewards to authenticated;
grant select on public.gridster_game_achievements to anon, authenticated;
grant insert, update, delete on public.gridster_game_achievements to authenticated;
grant select on public.gridster_game_user_achievements to anon, authenticated;
