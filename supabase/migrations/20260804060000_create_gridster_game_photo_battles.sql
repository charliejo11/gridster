-- =========================================================
-- Gridster Games: Photo Challenge Battles.
--
-- Brand-new tables, fully separate from the existing standalone
-- gridster_photo_challenges/gridster_photo_entries/gridster_photo_votes
-- feature (which stays untouched) - Battles need scheduled open/close
-- windows, a per-battle configurable vote cap, and XP/achievement
-- integration that the existing single-active-challenge design was
-- never built for.
--
-- "One eligible photo per challenge" -> unique(battle_id, user_id) on
-- entries. "Rewards only after close" and "no duplicate prizes" ->
-- the prize-claims insert (unique on battle_id) is the actual reward
-- gate, not the battle's own status flip, so even a duplicate close
-- call can't double-grant. Entries CAN be edited in place (caption/
-- photo) while the battle is open - the UPDATE policy pins
-- battle_id/user_id/created_at/vote_count via self-referencing
-- subqueries so a user can never inflate their own vote_count through
-- this path, same idiom as the message-content and friend-request-
-- sender pinning fixes from 20260801000000. This is a real, previously
-- proven-safe pattern (gridster_messages/gridster_friend_requests both
-- have simple, non-self-referential SELECT policies, so the pinning
-- subquery here doesn't risk the RLS-recursion trap - it's the exact
-- same shape, not merely similar).
-- =========================================================

create table if not exists public.gridster_game_photo_battles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  prompt text,
  open_at timestamptz not null,
  close_at timestamptz not null check (close_at > open_at),
  vote_cap_per_user integer not null default 1 check (vote_cap_per_user >= 1),
  reward_bling_bits integer not null default 0 check (reward_bling_bits >= 0),
  reward_badge_item_id uuid references public.bling_items(id),
  status text not null default 'scheduled' check (status in ('scheduled', 'open', 'closed')),
  winner_entry_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gridster_game_photo_battle_entries (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.gridster_game_photo_battles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text not null,
  caption text,
  vote_count integer not null default 0 check (vote_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gridster_game_photo_battle_entries_unique unique (battle_id, user_id)
);

alter table public.gridster_game_photo_battles
  drop constraint if exists gridster_game_photo_battles_winner_entry_fk;

alter table public.gridster_game_photo_battles
  add constraint gridster_game_photo_battles_winner_entry_fk
  foreign key (winner_entry_id) references public.gridster_game_photo_battle_entries(id);

create table if not exists public.gridster_game_photo_battle_votes (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.gridster_game_photo_battles(id) on delete cascade,
  entry_id uuid not null references public.gridster_game_photo_battle_entries(id) on delete cascade,
  voter_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint gridster_game_photo_battle_votes_unique unique (battle_id, entry_id, voter_user_id)
);

create index if not exists gridster_game_photo_battle_votes_voter_idx
  on public.gridster_game_photo_battle_votes (battle_id, voter_user_id);

create table if not exists public.gridster_game_photo_battle_prize_claims (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null unique references public.gridster_game_photo_battles(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  claimed_at timestamptz not null default now()
);

-- Deferred from 20260804010000_extend_notifications_for_games.sql -
-- this table didn't exist yet when that migration ran.
alter table public.gridster_notifications
  drop constraint if exists gridster_notifications_related_game_battle_id_fk;

alter table public.gridster_notifications
  add constraint gridster_notifications_related_game_battle_id_fk
  foreign key (related_game_battle_id) references public.gridster_game_photo_battles(id) on delete cascade;

-- =========================
-- RLS
-- =========================

alter table public.gridster_game_photo_battles enable row level security;
alter table public.gridster_game_photo_battle_entries enable row level security;
alter table public.gridster_game_photo_battle_votes enable row level security;
alter table public.gridster_game_photo_battle_prize_claims enable row level security;

drop policy if exists "Photo battles are publicly readable" on public.gridster_game_photo_battles;
create policy "Photo battles are publicly readable"
on public.gridster_game_photo_battles for select using (true);

drop policy if exists "Admins can write photo battles" on public.gridster_game_photo_battles;
create policy "Admins can write photo battles"
on public.gridster_game_photo_battles for all to authenticated
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists "Photo battle entries are publicly readable" on public.gridster_game_photo_battle_entries;
create policy "Photo battle entries are publicly readable"
on public.gridster_game_photo_battle_entries for select using (true);

drop policy if exists "Users can enter an open photo battle" on public.gridster_game_photo_battle_entries;
create policy "Users can enter an open photo battle"
on public.gridster_game_photo_battle_entries
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.gridster_game_photo_battles b
    where b.id = battle_id and b.status <> 'closed' and now() between b.open_at and b.close_at
  )
);

drop policy if exists "Users can withdraw their own entry while the battle is open" on public.gridster_game_photo_battle_entries;
create policy "Users can withdraw their own entry while the battle is open"
on public.gridster_game_photo_battle_entries
for delete
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.gridster_game_photo_battles b
    where b.id = battle_id and b.status <> 'closed'
  )
);

-- Caption/photo edits in place, confirmed wanted - but battle_id,
-- user_id, created_at, and CRITICALLY vote_count are pinned to their
-- current stored values via self-referencing subqueries, so a user
-- can never inflate their own vote count through this path.
drop policy if exists "Users can edit their own entry while the battle is open" on public.gridster_game_photo_battle_entries;
create policy "Users can edit their own entry while the battle is open"
on public.gridster_game_photo_battle_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and battle_id = (select e2.battle_id from public.gridster_game_photo_battle_entries e2 where e2.id = gridster_game_photo_battle_entries.id)
  and user_id = (select e2.user_id from public.gridster_game_photo_battle_entries e2 where e2.id = gridster_game_photo_battle_entries.id)
  and created_at = (select e2.created_at from public.gridster_game_photo_battle_entries e2 where e2.id = gridster_game_photo_battle_entries.id)
  and vote_count = (select e2.vote_count from public.gridster_game_photo_battle_entries e2 where e2.id = gridster_game_photo_battle_entries.id)
  and exists (
    select 1 from public.gridster_game_photo_battles b
    where b.id = gridster_game_photo_battle_entries.battle_id and b.status <> 'closed'
  )
);

drop policy if exists "Users can view their own photo battle votes" on public.gridster_game_photo_battle_votes;
create policy "Users can view their own photo battle votes"
on public.gridster_game_photo_battle_votes for select to authenticated using (auth.uid() = voter_user_id);
-- No write policy - only cast_photo_battle_vote() writes here.

drop policy if exists "Users can view their own photo battle prize claims" on public.gridster_game_photo_battle_prize_claims;
create policy "Users can view their own photo battle prize claims"
on public.gridster_game_photo_battle_prize_claims for select to authenticated using (auth.uid() = user_id);
-- No write policy - only _close_single_photo_battle() writes here.

-- Explicit table grants (RLS remains the real gate) - see
-- 20260804020000 for why these aren't left to ambient default
-- privileges.
grant select on public.gridster_game_photo_battles to anon, authenticated;
grant insert, update, delete on public.gridster_game_photo_battles to authenticated;
grant select on public.gridster_game_photo_battle_entries to anon, authenticated;
grant insert, update, delete on public.gridster_game_photo_battle_entries to authenticated;
grant select on public.gridster_game_photo_battle_votes to authenticated;
grant select on public.gridster_game_photo_battle_prize_claims to authenticated;

-- =========================
-- Seed: a starter badge item for battle rewards. Battles themselves
-- are admin-created dynamically through the UI, not seeded here.
-- =========================

insert into public.bling_items (slug, name, description, item_type, price, preview_class) values
  ('photo-battle-champion', 'Photo Battle Champion', 'Awarded for winning a Gridster Games Photo Challenge Battle.', 'badge', 0, 'bling-badge-photo-battle-champion')
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, item_type = excluded.item_type, preview_class = excluded.preview_class, is_active = true;

-- =========================
-- RPCs
-- =========================

create or replace function public.submit_photo_battle_entry(target_battle_id uuid, photo_url text, caption text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  rate_limited boolean;
  battle_row public.gridster_game_photo_battles;
  inserted_id uuid;
  existing_entry public.gridster_game_photo_battle_entries;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  rate_limited := public.check_game_rate_limit(current_user_id, 'photo_battle_entry_attempt', target_battle_id::text, 60, 10);

  if rate_limited then
    raise exception 'Too many attempts - please slow down';
  end if;

  select * into battle_row from public.gridster_game_photo_battles where id = target_battle_id;

  if battle_row.id is null then
    raise exception 'Battle not found';
  end if;

  if battle_row.status = 'closed' or now() < battle_row.open_at or now() > battle_row.close_at then
    raise exception 'This battle is not currently open for entries';
  end if;

  insert into public.gridster_game_photo_battle_entries (battle_id, user_id, photo_url, caption)
  values (target_battle_id, current_user_id, photo_url, caption)
  on conflict (battle_id, user_id) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    select * into existing_entry from public.gridster_game_photo_battle_entries where battle_id = target_battle_id and user_id = current_user_id;
    return jsonb_build_object('ok', true, 'already_entered', true, 'entry_id', existing_entry.id);
  end if;

  return jsonb_build_object('ok', true, 'already_entered', false, 'entry_id', inserted_id);
end;
$$;

create or replace function public.cast_photo_battle_vote(target_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  rate_limited boolean;
  entry_row public.gridster_game_photo_battle_entries;
  battle_row public.gridster_game_photo_battles;
  existing_vote_count integer;
  inserted_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into entry_row from public.gridster_game_photo_battle_entries where id = target_entry_id;

  if entry_row.id is null then
    raise exception 'Entry not found';
  end if;

  if entry_row.user_id = current_user_id then
    raise exception 'You can''t vote for your own entry';
  end if;

  select * into battle_row from public.gridster_game_photo_battles where id = entry_row.battle_id;

  if battle_row.status = 'closed' or now() < battle_row.open_at or now() > battle_row.close_at then
    raise exception 'This battle is not currently open for voting';
  end if;

  rate_limited := public.check_game_rate_limit(current_user_id, 'photo_battle_vote_attempt', battle_row.id::text, 60, 20);

  if rate_limited then
    raise exception 'Too many attempts - please slow down';
  end if;

  -- Serializes concurrent vote attempts by this same (battle, voter)
  -- pair so the vote-cap count-then-insert below can't race itself -
  -- same idiom already used by create_or_group_notification's
  -- grouping logic (pg_advisory_xact_lock on a hashed key).
  perform pg_advisory_xact_lock(hashtext('game_photo_battle_vote:' || battle_row.id::text || ':' || current_user_id::text));

  select count(*) into existing_vote_count
  from public.gridster_game_photo_battle_votes
  where battle_id = battle_row.id and voter_user_id = current_user_id;

  if existing_vote_count >= battle_row.vote_cap_per_user then
    return jsonb_build_object('ok', true, 'vote_cast', false, 'reason', 'vote_cap_reached');
  end if;

  insert into public.gridster_game_photo_battle_votes (battle_id, entry_id, voter_user_id)
  values (battle_row.id, target_entry_id, current_user_id)
  on conflict (battle_id, entry_id, voter_user_id) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return jsonb_build_object('ok', true, 'vote_cast', false, 'reason', 'already_voted_for_this_entry');
  end if;

  update public.gridster_game_photo_battle_entries
  set vote_count = vote_count + 1
  where id = target_entry_id;

  return jsonb_build_object('ok', true, 'vote_cast', true);
end;
$$;

-- Private helper: no grant to any role. Only callable from within the
-- two functions below, both owned by the same role, so it runs with
-- that role's implicit privileges rather than the end caller's.
create or replace function public._close_single_photo_battle(target_battle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  battle_row public.gridster_game_photo_battles;
  winner_row public.gridster_game_photo_battle_entries;
  inserted_claim_id uuid;
  new_balance integer;
  entrant record;
begin
  select * into battle_row from public.gridster_game_photo_battles where id = target_battle_id for update;

  if battle_row.id is null then
    raise exception 'Battle not found';
  end if;

  if battle_row.status = 'closed' then
    return jsonb_build_object('ok', true, 'already_closed', true, 'winner_entry_id', battle_row.winner_entry_id);
  end if;

  select * into winner_row
  from public.gridster_game_photo_battle_entries
  where battle_id = target_battle_id
  order by vote_count desc, created_at asc
  limit 1;

  update public.gridster_game_photo_battles
  set status = 'closed', winner_entry_id = winner_row.id, updated_at = now()
  where id = target_battle_id;

  if winner_row.id is null then
    return jsonb_build_object('ok', true, 'already_closed', false, 'winner_entry_id', null);
  end if;

  -- THE reward gate - not the status flip above. Even a duplicate
  -- close call (racing cron/admin, or a bug calling this twice) can
  -- never grant the prize a second time.
  insert into public.gridster_game_photo_battle_prize_claims (battle_id, user_id)
  values (target_battle_id, winner_row.user_id)
  on conflict (battle_id) do nothing
  returning id into inserted_claim_id;

  if inserted_claim_id is not null then
    if battle_row.reward_bling_bits > 0 then
      insert into public.bling_balances (user_id, balance) values (winner_row.user_id, 1250) on conflict (user_id) do nothing;

      update public.bling_balances
      set balance = balance + battle_row.reward_bling_bits
      where user_id = winner_row.user_id
      returning balance into new_balance;
    end if;

    if battle_row.reward_badge_item_id is not null then
      insert into public.bling_purchases (user_id, item_id, source)
      values (winner_row.user_id, battle_row.reward_badge_item_id, 'game_photo_battle')
      on conflict (user_id, item_id) do nothing;
    end if;

    perform public.grant_game_xp(winner_row.user_id, 50, 'photo_battle_won');
    perform public.check_and_grant_game_achievements(winner_row.user_id);

    perform public.create_or_group_notification(
      p_recipient_user_id => winner_row.user_id,
      p_actor_user_id => null,
      p_notification_type => 'photo_battle_won',
      p_amount => battle_row.reward_bling_bits,
      p_title => battle_row.title,
      p_related_game_battle_id => target_battle_id
    );

    for entrant in
      select distinct user_id from public.gridster_game_photo_battle_entries
      where battle_id = target_battle_id and user_id <> winner_row.user_id
    loop
      perform public.create_or_group_notification(
        p_recipient_user_id => entrant.user_id,
        p_actor_user_id => null,
        p_notification_type => 'photo_battle_ended',
        p_title => battle_row.title,
        p_related_game_battle_id => target_battle_id
      );
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'already_closed', false, 'winner_entry_id', winner_row.id, 'winner_user_id', winner_row.user_id);
end;
$$;

revoke execute on function public._close_single_photo_battle(uuid) from public;

create or replace function public.admin_close_photo_battle_now(target_battle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin_user boolean;
begin
  select coalesce(is_admin, false) into is_admin_user from public.profiles where user_id = auth.uid();

  if not coalesce(is_admin_user, false) then
    raise exception 'Admin access required';
  end if;

  return public._close_single_photo_battle(target_battle_id);
end;
$$;

-- Sweeps both directions: flips 'scheduled' -> 'open' once open_at has
-- passed (display accuracy only - entry/vote enforcement in
-- submit_photo_battle_entry/cast_photo_battle_vote already derives the
-- real open/closed state from open_at/close_at directly and never
-- depended on this transition happening), and closes+awards battles
-- past close_at via the shared _close_single_photo_battle path.
create or replace function public.close_due_photo_battles()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  due_battle record;
  closed_count integer := 0;
  opened_count integer;
begin
  update public.gridster_game_photo_battles
  set status = 'open', updated_at = now()
  where status = 'scheduled' and open_at <= now() and close_at > now();

  get diagnostics opened_count = row_count;

  for due_battle in
    select id from public.gridster_game_photo_battles
    where status <> 'closed' and close_at <= now()
  loop
    perform public._close_single_photo_battle(due_battle.id);
    closed_count := closed_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'opened_count', opened_count, 'closed_count', closed_count);
end;
$$;

revoke execute on function public.close_due_photo_battles() from public;
revoke execute on function public.close_due_photo_battles() from authenticated;
grant execute on function public.close_due_photo_battles() to service_role;
