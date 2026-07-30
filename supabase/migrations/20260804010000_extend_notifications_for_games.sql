-- =========================================================
-- Extend the notification system for Gridster Games. Adds a
-- related_game_battle_id column (a real navigable entity, so a
-- dedicated FK like related_group_id - not the polymorphic
-- related_transaction_id, which stays reserved for ledger/claim ids
-- per its existing comment), six new notification_type values, and a
-- 17th create_or_group_notification() parameter.
--
-- Postgres matches function overloads by exact type signature, so
-- adding a parameter requires drop-then-create, not a plain
-- create-or-replace (same reasoning already documented in
-- 20260731040000_extend_notifications_for_group_feed.sql). Appending
-- the new parameter at the end (rather than inserting it among the
-- existing related_* params) avoids reshuffling any existing
-- positional meaning - every call site in this codebase already uses
-- named "=>" arguments, but there is no reason to take on that risk
-- for zero benefit.
-- =========================================================

-- No FK yet - gridster_game_photo_battles doesn't exist until
-- 20260804060000_create_gridster_game_photo_battles.sql. That later
-- migration adds the FK constraint once the table exists.
alter table public.gridster_notifications
  add column if not exists related_game_battle_id uuid;

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
    'group_post_pinned', 'group_join_request', 'group_join_approved',
    'game_spin_reward', 'game_trivia_daily_complete', 'photo_battle_won',
    'photo_battle_ended', 'game_level_up', 'game_achievement_unlocked'
  ));

drop function if exists public.create_or_group_notification(
  uuid, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer, text, text
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
  p_message text default null,
  p_related_game_battle_id uuid default null
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

  -- Extended for Games: an admin-triggered outcome (e.g. closing a
  -- Photo Battle) legitimately needs to system-notify OTHER users
  -- (the winner, other entrants) about a real result. auth.uid()
  -- reflects the real end-user's JWT regardless of how many
  -- SECURITY DEFINER calls deep this is, so an admin closing a battle
  -- looks identical to this check as any other authenticated caller -
  -- the is_admin check is what legitimately distinguishes them.
  -- Mirrors the same "system or admin" reasoning already used by
  -- generate_trivia_daily_challenge.
  if p_actor_user_id is null and auth.uid() is not null and p_recipient_user_id <> auth.uid() then
    if not exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true) then
      raise exception 'Cannot create a system notification for another user';
    end if;
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
    amount, title, message, grouped_actor_ids, actor_count, related_game_battle_id
  )
  values (
    p_recipient_user_id, p_actor_user_id, p_notification_type, computed_group_key,
    p_related_post_id, p_related_comment_id, p_related_message_id, p_related_event_id,
    p_related_group_id, p_related_group_post_id, p_related_group_comment_id,
    p_related_user_id, p_related_request_id, p_related_transaction_id,
    p_amount, p_title, p_message,
    case when p_actor_user_id is null then '{}'::uuid[] else array[p_actor_user_id] end,
    1, p_related_game_battle_id
  )
  returning id into result_id;

  return result_id;
end;
$$;

grant execute on function public.create_or_group_notification(
  uuid, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer, text, text, uuid
) to authenticated, service_role;
