-- =========================================================
-- ROLLBACK for:
--   20260804000000_refix_daily_bonus_claim_race.sql
--   20260804010000_extend_notifications_for_games.sql
--   20260804020000_create_gridster_game_profiles_and_progression.sql
--   20260804030000_create_gridster_game_rate_limits.sql
--   20260804040000_create_gridster_game_daily_spin.sql
--   20260804050000_create_gridster_game_trivia.sql
--   20260804060000_create_gridster_game_photo_battles.sql
--
-- Undoes the entire Gridster Games MVP (Daily Spin, Trivia, Photo
-- Challenge Battles, shared XP/level/title/achievement layer) and
-- restores the notification system + daily bonus RPCs to their exact
-- prior definitions. This is a manual, NOT auto-applied script - run it
-- by hand (e.g. `supabase db query --linked --file
-- supabase/rollback_20260804000000.sql`, or the SQL editor) only if
-- Gridster Games needs to be undone on a specific environment.
--
-- NOT run automatically by `supabase db push` - this file intentionally
-- lives outside supabase/migrations/ so it is never picked up as a
-- pending migration.
--
-- Sections are labeled by which migration they undo, IN REVERSE ORDER
-- (060000 first, 000000 last) - later migrations reference tables/
-- columns the earlier ones create, so undoing out of order will fail
-- with a dependency error. Run the whole file to fully remove Gridster
-- Games, or stop after any section to partially roll back (e.g. run
-- only the first section to remove just Photo Battles while keeping
-- Spin/Trivia/XP intact).
-- =========================================================

-- ---------------------------------------------------------
-- Undo 20260804060000: Photo Challenge Battles.
-- ---------------------------------------------------------

drop function if exists public.close_due_photo_battles();
drop function if exists public.admin_close_photo_battle_now(uuid);
drop function if exists public._close_single_photo_battle(uuid);
drop function if exists public.cast_photo_battle_vote(uuid);
drop function if exists public.submit_photo_battle_entry(uuid, text, text);

alter table public.gridster_notifications
  drop constraint if exists gridster_notifications_related_game_battle_id_fk;

drop table if exists public.gridster_game_photo_battle_prize_claims;
drop table if exists public.gridster_game_photo_battle_votes;

-- gridster_game_photo_battles.winner_entry_id FK's the entries table -
-- drop that constraint before entries, or the entries drop fails with
-- a dependency error (confirmed while testing this rollback script).
alter table public.gridster_game_photo_battles
  drop constraint if exists gridster_game_photo_battles_winner_entry_fk;

drop table if exists public.gridster_game_photo_battle_entries;
drop table if exists public.gridster_game_photo_battles;

-- Seeded badge item (photo-battle-champion) is left in place, same as
-- the existing rollback_20260801000000.sql leaves other seeded
-- bling_items rows alone - it's inert with no battles left to award it.

-- ---------------------------------------------------------
-- Undo 20260804050000: Trivia.
-- ---------------------------------------------------------

drop function if exists public.generate_trivia_daily_challenge(date);
drop function if exists public.submit_trivia_answer(uuid, text);
drop function if exists public.start_trivia_attempt(text, text, text);

drop table if exists public.gridster_game_trivia_daily_scores;
drop table if exists public.gridster_game_trivia_attempts;
drop table if exists public.gridster_game_trivia_daily_challenges;
drop table if exists public.gridster_game_trivia_answer_keys;
drop table if exists public.gridster_game_trivia_questions;
drop table if exists public.gridster_game_trivia_categories;

-- ---------------------------------------------------------
-- Undo 20260804040000: Daily Spin.
-- ---------------------------------------------------------

drop function if exists public.spin_daily(boolean);
drop table if exists public.gridster_game_spins;
drop table if exists public.gridster_game_spin_rewards;

-- ---------------------------------------------------------
-- Undo 20260804030000: rate limiting / abuse log.
-- ---------------------------------------------------------

drop function if exists public.check_game_rate_limit(uuid, text, text, integer, integer);
drop table if exists public.gridster_game_rate_limit_events;

-- ---------------------------------------------------------
-- Undo 20260804020000: XP / levels / titles / achievements.
-- ---------------------------------------------------------

drop function if exists public.check_and_grant_game_achievements(uuid);
drop function if exists public.grant_game_xp(uuid, integer, text);

drop table if exists public.gridster_game_user_achievements;
drop table if exists public.gridster_game_achievements;
drop table if exists public.gridster_game_level_rewards;
drop table if exists public.gridster_game_titles;
drop table if exists public.gridster_game_levels;
drop table if exists public.gridster_game_profiles;

-- bling_purchases.source: safe to drop only once every game_* value
-- that could be stored in it is gone (i.e. after the table drops
-- above) - existing 'shop_purchase' rows are unaffected either way.
alter table public.bling_purchases drop constraint if exists valid_bling_purchase_source;
alter table public.bling_purchases drop column if exists source;

-- Seeded level-reward badge items (game-level-*-badge) are left in
-- place, same rationale as the photo-battle-champion badge above.

-- ---------------------------------------------------------
-- Undo 20260804010000: notification system extension. Restores
-- create_or_group_notification to its exact 20260803000000-era 16-arg
-- body (this is the SAME restoration rollback_20260801000000.sql's
-- final section already performs - if that rollback has already been
-- run on this environment, this section is a harmless no-op re-apply).
-- ---------------------------------------------------------

alter table public.gridster_notifications drop column if exists related_game_battle_id;

-- Any existing notification row using one of the six game types below
-- would violate the restored (narrower) constraint - and its
-- related_game_battle_id target is gone anyway once the Photo Battles
-- tables above are dropped, so these rows are meaningless post-rollback.
-- Confirmed necessary while testing this script (the constraint ALTER
-- below fails outright otherwise, not a hypothetical).
delete from public.gridster_notifications where notification_type in (
  'game_spin_reward', 'game_trivia_daily_complete', 'photo_battle_won',
  'photo_battle_ended', 'game_level_up', 'game_achievement_unlocked'
);

alter table public.gridster_notifications
  drop constraint if exists valid_gridster_notification_type;

alter table public.gridster_notifications
  add constraint valid_gridster_notification_type check (notification_type in (
    'post_liked', 'post_commented', 'new_message',
    'friend_request_received', 'friend_request_accepted', 'follow_received',
    'mention', 'group_invite', 'group_activity',
    'event_invite', 'event_reminder',
    'bling_bits_bonus', 'bling_bits_purchase', 'account_announcement',
    'group_post_liked', 'group_post_commented', 'group_comment_reply',
    'group_post_pinned', 'group_join_request', 'group_join_approved'
  ));

drop function if exists public.create_or_group_notification(
  uuid, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer, text, text, uuid
);

create or replace function public.create_or_group_notification(
  p_recipient_user_id uuid,
  p_actor_user_id uuid,
  p_notification_type text,
  p_related_post_id uuid default null,
  p_related_comment_id uuid default null,
  p_related_message_id uuid default null,
  p_related_event_id uuid default null,
  p_related_group_id uuid default null,
  p_related_group_post_id uuid default null,
  p_related_group_comment_id uuid default null,
  p_related_user_id uuid default null,
  p_related_request_id uuid default null,
  p_related_transaction_id uuid default null,
  p_amount integer default null,
  p_title text default null,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  is_groupable boolean;
  computed_group_key text;
  existing_id uuid;
  result_id uuid;
begin
  if p_recipient_user_id is null or p_notification_type is null then
    raise exception 'recipient and notification_type are required';
  end if;

  if p_actor_user_id is not null and p_actor_user_id <> auth.uid() then
    raise exception 'actor_user_id must match the authenticated user';
  end if;

  if p_actor_user_id is not null and p_actor_user_id = p_recipient_user_id then
    return null;
  end if;

  if p_notification_type = 'new_message' then
    p_message := null;
  end if;

  is_groupable := p_notification_type in ('post_liked', 'post_commented', 'new_message', 'group_post_liked', 'group_post_commented');

  if is_groupable then
    computed_group_key := p_notification_type || ':' || p_recipient_user_id::text || ':' ||
      case p_notification_type
        when 'new_message' then coalesce(p_actor_user_id::text, '')
        when 'group_post_liked' then coalesce(p_related_group_post_id::text, '')
        when 'group_post_commented' then coalesce(p_related_group_post_id::text, '')
        else coalesce(p_related_post_id::text, '')
      end;

    perform pg_advisory_xact_lock(hashtext(computed_group_key));

    select id into existing_id
    from public.gridster_notifications
    where recipient_user_id = p_recipient_user_id
      and group_key = computed_group_key
      and is_read = false
    order by created_at desc
    limit 1
    for update;

    if existing_id is not null then
      update public.gridster_notifications
      set actor_user_id = coalesce(p_actor_user_id, actor_user_id),
          grouped_actor_ids = case
            when p_actor_user_id is null or p_actor_user_id = any(grouped_actor_ids) then grouped_actor_ids
            else (array[p_actor_user_id] || grouped_actor_ids)[1:6]
          end,
          actor_count = case
            when p_actor_user_id is null or p_actor_user_id = any(grouped_actor_ids) then actor_count
            else actor_count + 1
          end,
          title = coalesce(p_title, title),
          message = coalesce(p_message, message),
          amount = coalesce(p_amount, amount),
          related_comment_id = coalesce(p_related_comment_id, related_comment_id),
          related_message_id = coalesce(p_related_message_id, related_message_id),
          related_group_comment_id = coalesce(p_related_group_comment_id, related_group_comment_id),
          created_at = now(),
          updated_at = now()
      where id = existing_id
      returning id into result_id;

      return result_id;
    end if;
  end if;

  insert into public.gridster_notifications (
    recipient_user_id, actor_user_id, notification_type, group_key,
    related_post_id, related_comment_id, related_message_id, related_event_id,
    related_group_id, related_group_post_id, related_group_comment_id,
    related_user_id, related_request_id, related_transaction_id,
    amount, title, message, grouped_actor_ids, actor_count
  )
  values (
    p_recipient_user_id, p_actor_user_id, p_notification_type, computed_group_key,
    p_related_post_id, p_related_comment_id, p_related_message_id, p_related_event_id,
    p_related_group_id, p_related_group_post_id, p_related_group_comment_id,
    p_related_user_id, p_related_request_id, p_related_transaction_id,
    p_amount, p_title, p_message,
    case when p_actor_user_id is null then '{}'::uuid[] else array[p_actor_user_id] end,
    1
  )
  returning id into result_id;

  return result_id;
end;
$$;

grant execute on function public.create_or_group_notification(
  uuid, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer, text, text
) to authenticated, service_role;

-- ---------------------------------------------------------
-- Undo 20260804000000: daily bonus claim race re-fix.
--
-- WARNING: this restores the exact 20260729020000 CHECK-THEN-ACT
-- bodies - i.e. it REINTRODUCES a real, previously-fixed double-grant
-- race (two concurrent calls can both see "not yet claimed" and both
-- grant Bling Bits). This section should essentially never be run.
-- It exists only for symmetry/documentation completeness and to undo
-- this migration in true isolation if some future investigation
-- specifically requires reverting to the pre-fix behavior for
-- comparison. Do not run this against production.
-- ---------------------------------------------------------

create or replace function public.claim_daily_login_bonus()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  last_claimed_at timestamptz;
  granted boolean := false;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select claimed_at
  into last_claimed_at
  from public.gridster_bonus_claims
  where user_id = current_user_id and bonus_type = 'daily_login';

  if last_claimed_at is null or last_claimed_at::date < current_date then
    insert into public.bling_balances (user_id, balance)
    values (current_user_id, 1250)
    on conflict (user_id) do nothing;

    update public.bling_balances
    set balance = balance + 50
    where user_id = current_user_id;

    insert into public.gridster_bonus_claims (user_id, bonus_type, claimed_at)
    values (current_user_id, 'daily_login', now())
    on conflict (user_id, bonus_type) do update set claimed_at = now();

    granted := true;

    perform public.create_or_group_notification(
      p_recipient_user_id => current_user_id,
      p_actor_user_id => null,
      p_notification_type => 'bling_bits_bonus',
      p_amount => 50,
      p_title => 'Daily login bonus'
    );
  end if;

  return jsonb_build_object('ok', true, 'bonus_type', 'daily_login', 'granted', granted);
end;
$$;

create or replace function public.claim_profile_complete_bonus()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  profile_record public.profiles;
  already_claimed boolean;
  granted boolean := false;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into profile_record
  from public.profiles
  where user_id = current_user_id;

  select exists (
    select 1 from public.gridster_bonus_claims
    where user_id = current_user_id and bonus_type = 'profile_complete'
  )
  into already_claimed;

  if not already_claimed
    and coalesce(length(trim(profile_record.display_name)), 0) > 0
    and coalesce(length(trim(profile_record.sl_username)), 0) > 0
    and coalesce(length(trim(profile_record.bio)), 0) > 0
  then
    insert into public.bling_balances (user_id, balance)
    values (current_user_id, 1250)
    on conflict (user_id) do nothing;

    update public.bling_balances
    set balance = balance + 200
    where user_id = current_user_id;

    insert into public.gridster_bonus_claims (user_id, bonus_type)
    values (current_user_id, 'profile_complete')
    on conflict (user_id, bonus_type) do nothing;

    granted := true;

    perform public.create_or_group_notification(
      p_recipient_user_id => current_user_id,
      p_actor_user_id => null,
      p_notification_type => 'bling_bits_bonus',
      p_amount => 200,
      p_title => 'Profile completed bonus'
    );
  end if;

  return jsonb_build_object('ok', true, 'bonus_type', 'profile_complete', 'granted', granted);
end;
$$;

create or replace function public.claim_sl_verified_bonus()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  is_verified boolean;
  already_claimed boolean;
  granted boolean := false;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(sl_verified, false)
  into is_verified
  from public.profiles
  where user_id = current_user_id;

  select exists (
    select 1 from public.gridster_bonus_claims
    where user_id = current_user_id and bonus_type = 'sl_verified'
  )
  into already_claimed;

  if coalesce(is_verified, false) and not already_claimed then
    insert into public.bling_balances (user_id, balance)
    values (current_user_id, 1250)
    on conflict (user_id) do nothing;

    update public.bling_balances
    set balance = balance + 250
    where user_id = current_user_id;

    insert into public.gridster_bonus_claims (user_id, bonus_type)
    values (current_user_id, 'sl_verified')
    on conflict (user_id, bonus_type) do nothing;

    granted := true;

    perform public.create_or_group_notification(
      p_recipient_user_id => current_user_id,
      p_actor_user_id => null,
      p_notification_type => 'bling_bits_bonus',
      p_amount => 250,
      p_title => 'Second Life verification bonus'
    );
  end if;

  return jsonb_build_object('ok', true, 'bonus_type', 'sl_verified', 'granted', granted);
end;
$$;
