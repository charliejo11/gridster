-- =========================================================
-- Group activity notifications + site-wide account announcements.
--
-- "Group activity" is scoped to the one existing owner-gated broadcast
-- mechanic (post_type = 'announcement', already RLS-restricted to
-- gridster_groups.owner_user_id) rather than every regular post, which
-- would spam every member's notifications on a busy group.
-- =========================================================

create or replace function public.notify_group_announcement_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member record;
begin
  if new.post_type <> 'announcement' then
    return new;
  end if;

  for member in
    select user_id from public.gridster_group_members
    where group_id = new.group_id and user_id <> new.user_id
  loop
    perform public.create_or_group_notification(
      p_recipient_user_id => member.user_id,
      p_actor_user_id => new.user_id,
      p_notification_type => 'group_activity',
      p_related_group_id => new.group_id,
      p_related_post_id => new.id,
      p_message => left(new.content, 140)
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_group_announcement_trigger on public.gridster_group_posts;
create trigger notify_group_announcement_trigger
after insert on public.gridster_group_posts
for each row execute function public.notify_group_announcement_members();

-- ---------------------------------------------------------
-- Site-wide admin announcements.
-- ---------------------------------------------------------

create or replace function public.broadcast_account_announcement(
  target_title text,
  target_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin_user boolean;
  sent_count integer;
begin
  select coalesce(is_admin, false) into is_admin_user
  from public.profiles where user_id = auth.uid();

  if not coalesce(is_admin_user, false) then
    raise exception 'Admin access required';
  end if;

  if coalesce(length(trim(target_title)), 0) = 0 then
    raise exception 'Announcement title is required';
  end if;

  -- Set-based insert rather than a per-user loop through
  -- create_or_group_notification(): account_announcement is never
  -- grouped and actor is always null, so the grouping/advisory-lock
  -- machinery buys nothing here and a bulk insert is far cheaper.
  with inserted as (
    insert into public.gridster_notifications (recipient_user_id, actor_user_id, notification_type, title, message)
    select id, null, 'account_announcement', target_title, target_message
    from auth.users
    returning 1
  )
  select count(*) into sent_count from inserted;

  return jsonb_build_object('ok', true, 'recipients', sent_count);
end;
$$;

grant execute on function public.broadcast_account_announcement(text, text) to authenticated;
