-- =========================================================
-- Extend the notification system (built earlier this session) for the
-- group posting system: 6 new notification types, 2 new related-id
-- columns, and grouping for the two "liked/commented" types so they
-- collapse the same way the main feed's do ("X and N others liked
-- your post").
-- =========================================================

alter table public.gridster_notifications
  add column if not exists related_group_post_id uuid references public.gridster_group_posts(id) on delete cascade,
  add column if not exists related_group_comment_id uuid references public.gridster_group_post_comments(id) on delete cascade;

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

-- create_or_group_notification() gains p_related_group_post_id /
-- p_related_group_comment_id and groups group_post_liked/
-- group_post_commented by related_group_post_id, same mechanism as
-- the main feed's post_liked/post_commented. Adding parameters means
-- dropping the exact old signature first, not "or replace" over it -
-- Postgres treats a different parameter list as a new overload rather
-- than a true replacement, which would leave two versions behind.
drop function if exists public.create_or_group_notification(
  uuid, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer, text, text
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
