-- =========================================================
-- Gridster Notification Center — core table + grouping RPC.
--
-- Every notification in Gridster flows through this one table and one
-- insert path (create_or_group_notification). There is deliberately no
-- insert policy for anon/authenticated: a permissive
-- "actor_user_id = auth.uid()" policy would let any user fabricate a
-- fake "X liked your post" against anyone else with no verification
-- that the underlying event actually happened. Routing every insert
-- through the RPC below closes that off while also being the one place
-- grouping logic lives (no duplication between JS and SQL).
-- =========================================================

create table if not exists public.gridster_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  notification_type text not null,
  title text,
  message text,
  related_post_id uuid references public.gridster_posts(id) on delete cascade,
  related_comment_id uuid references public.gridster_post_comments(id) on delete cascade,
  related_message_id uuid references public.gridster_messages(id) on delete cascade,
  related_event_id uuid references public.gridster_events(id) on delete cascade,
  related_group_id uuid references public.gridster_groups(id) on delete cascade,
  related_user_id uuid references auth.users(id) on delete cascade,
  related_request_id uuid,
  related_transaction_id uuid,
  amount integer,
  group_key text,
  actor_count integer not null default 1,
  grouped_actor_ids uuid[] not null default '{}',
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_gridster_notification_type check (notification_type in (
    'post_liked', 'post_commented', 'new_message',
    'friend_request_received', 'friend_request_accepted', 'follow_received',
    'mention', 'group_invite', 'group_activity',
    'event_invite', 'event_reminder',
    'bling_bits_bonus', 'bling_bits_purchase', 'account_announcement'
  )),
  constraint gridster_notifications_no_self_action check (actor_user_id is null or actor_user_id <> recipient_user_id),
  constraint gridster_notifications_no_message_content check (notification_type <> 'new_message' or message is null)
);

comment on table public.gridster_notifications is
  'The only table backing Gridster''s notification bell. Insert exclusively via create_or_group_notification() - there is no client insert policy.';
comment on column public.gridster_notifications.related_request_id is
  'Polymorphic, not an FK: gridster_friend_requests.id / gridster_group_invites.id / gridster_event_invites.id depending on notification_type. Powers inline accept/decline in the dropdown.';
comment on column public.gridster_notifications.related_transaction_id is
  'Polymorphic, not an FK: bling_purchases.id / post_boosts.id / a Linden payment or Plus bonus claim id, depending on notification_type. No single ledger table covers every Bling Bits grant path.';

create index if not exists gridster_notifications_recipient_unread_idx
  on public.gridster_notifications (recipient_user_id, is_read, created_at desc);
create index if not exists gridster_notifications_recipient_created_idx
  on public.gridster_notifications (recipient_user_id, created_at desc);
create index if not exists gridster_notifications_group_key_idx
  on public.gridster_notifications (recipient_user_id, group_key) where is_read = false;

alter table public.gridster_notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.gridster_notifications;
create policy "Users can view their own notifications"
  on public.gridster_notifications for select
  to authenticated
  using (auth.uid() = recipient_user_id);

drop policy if exists "Users can update their own notifications" on public.gridster_notifications;
create policy "Users can update their own notifications"
  on public.gridster_notifications for update
  to authenticated
  using (auth.uid() = recipient_user_id)
  with check (auth.uid() = recipient_user_id);

drop policy if exists "Users can delete their own notifications" on public.gridster_notifications;
create policy "Users can delete their own notifications"
  on public.gridster_notifications for delete
  to authenticated
  using (auth.uid() = recipient_user_id);

grant select, update, delete on public.gridster_notifications to authenticated;
grant select, insert, update, delete on public.gridster_notifications to service_role;

alter publication supabase_realtime add table public.gridster_notifications;
alter table public.gridster_notifications replica identity full;

-- ---------------------------------------------------------
-- The one insert path: create-or-group.
-- security definer so it can be called both by regular users (for
-- peer actions: likes, comments, friends, follows, messages, invites)
-- and from inside other security-definer functions/triggers (for
-- system-generated notifications: bonuses, purchases, reminders,
-- announcements), where p_actor_user_id is passed as null.
-- ---------------------------------------------------------

create or replace function public.create_or_group_notification(
  p_recipient_user_id uuid,
  p_actor_user_id uuid,
  p_notification_type text,
  p_related_post_id uuid default null,
  p_related_comment_id uuid default null,
  p_related_message_id uuid default null,
  p_related_event_id uuid default null,
  p_related_group_id uuid default null,
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

  -- Nobody can fabricate someone else as the actor of a social action.
  -- System-generated notifications pass p_actor_user_id => null and skip this.
  if p_actor_user_id is not null and p_actor_user_id <> auth.uid() then
    raise exception 'actor_user_id must match the authenticated user';
  end if;

  -- Never notify a user about their own action.
  if p_actor_user_id is not null and p_actor_user_id = p_recipient_user_id then
    return null;
  end if;

  -- A message notification must never carry DM text, regardless of caller.
  if p_notification_type = 'new_message' then
    p_message := null;
  end if;

  is_groupable := p_notification_type in ('post_liked', 'post_commented', 'new_message');

  if is_groupable then
    computed_group_key := p_notification_type || ':' || p_recipient_user_id::text || ':' ||
      case p_notification_type
        when 'new_message' then coalesce(p_actor_user_id::text, '')
        else coalesce(p_related_post_id::text, '')
      end;

    -- Serialize concurrent callers on the same group target within this
    -- transaction so two near-simultaneous likes can't both miss the
    -- existing unread row and each insert a separate one.
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
    related_group_id, related_user_id, related_request_id, related_transaction_id,
    amount, title, message, grouped_actor_ids, actor_count
  )
  values (
    p_recipient_user_id, p_actor_user_id, p_notification_type, computed_group_key,
    p_related_post_id, p_related_comment_id, p_related_message_id, p_related_event_id,
    p_related_group_id, p_related_user_id, p_related_request_id, p_related_transaction_id,
    p_amount, p_title, p_message,
    case when p_actor_user_id is null then '{}'::uuid[] else array[p_actor_user_id] end,
    1
  )
  returning id into result_id;

  return result_id;
end;
$$;

grant execute on function public.create_or_group_notification(
  uuid, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer, text, text
) to authenticated, service_role;
