-- =========================================================
-- Security-definer RPCs for everything that needs elevated trust:
-- pinning, comment-locking, removing someone else's post/comment,
-- approving/denying join requests, and role/status changes. No
-- permissive moderator RLS policy exists on the raw tables - this is
-- what makes "don't trust the frontend" real. Same pattern already
-- used by admin_refund_boost / broadcast_account_announcement.
-- =========================================================

create or replace function public.pin_group_post(target_post_id uuid, pin boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  post_record public.gridster_group_posts;
begin
  select * into post_record from public.gridster_group_posts where id = target_post_id;

  if post_record.id is null then
    raise exception 'Post not found';
  end if;

  if not public.is_group_moderator_or_owner(post_record.group_id, auth.uid()) then
    raise exception 'Moderator or owner access required';
  end if;

  update public.gridster_group_posts
  set is_pinned = pin,
      pinned_at = case when pin then now() else null end,
      pinned_by = case when pin then auth.uid() else null end
  where id = target_post_id;

  if pin then
    perform public.create_or_group_notification(
      p_recipient_user_id => post_record.user_id,
      p_actor_user_id => auth.uid(),
      p_notification_type => 'group_post_pinned',
      p_related_group_id => post_record.group_id,
      p_related_group_post_id => target_post_id
    );
  end if;

  return jsonb_build_object('ok', true, 'is_pinned', pin);
end;
$$;

create or replace function public.set_group_post_comments_enabled(target_post_id uuid, enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  post_record public.gridster_group_posts;
begin
  select * into post_record from public.gridster_group_posts where id = target_post_id;

  if post_record.id is null then
    raise exception 'Post not found';
  end if;

  if auth.uid() <> post_record.user_id and not public.is_group_moderator_or_owner(post_record.group_id, auth.uid()) then
    raise exception 'Only the post author or a moderator can change this';
  end if;

  update public.gridster_group_posts
  set comments_enabled = enabled
  where id = target_post_id;

  return jsonb_build_object('ok', true, 'comments_enabled', enabled);
end;
$$;

create or replace function public.moderator_remove_group_post(target_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  post_record public.gridster_group_posts;
begin
  select * into post_record from public.gridster_group_posts where id = target_post_id;

  if post_record.id is null then
    return jsonb_build_object('ok', true, 'already_removed', true);
  end if;

  if not public.is_group_moderator_or_owner(post_record.group_id, auth.uid()) then
    raise exception 'Moderator or owner access required';
  end if;

  delete from public.gridster_group_posts where id = target_post_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.moderator_remove_group_comment(target_comment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  comment_group_id uuid;
begin
  select p.group_id into comment_group_id
  from public.gridster_group_post_comments c
  join public.gridster_group_posts p on p.id = c.post_id
  where c.id = target_comment_id;

  if comment_group_id is null then
    return jsonb_build_object('ok', true, 'already_removed', true);
  end if;

  if not public.is_group_moderator_or_owner(comment_group_id, auth.uid()) then
    raise exception 'Moderator or owner access required';
  end if;

  delete from public.gridster_group_post_comments where id = target_comment_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.respond_to_group_join_request(target_request_id uuid, approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.gridster_group_join_requests;
  requester_display_name text;
begin
  select * into request_record from public.gridster_group_join_requests where id = target_request_id;

  if request_record.id is null then
    raise exception 'Request not found';
  end if;

  if not public.is_group_moderator_or_owner(request_record.group_id, auth.uid()) then
    raise exception 'Moderator or owner access required';
  end if;

  if request_record.status <> 'pending' then
    return jsonb_build_object('ok', true, 'already_handled', true, 'status', request_record.status);
  end if;

  update public.gridster_group_join_requests
  set status = case when approve then 'approved' else 'denied' end,
      responded_at = now(),
      responded_by = auth.uid()
  where id = target_request_id;

  if approve then
    select coalesce(display_name, sl_username) into requester_display_name
    from public.profiles where user_id = request_record.user_id;

    insert into public.gridster_group_members (group_id, user_id, display_name, role, status)
    values (request_record.group_id, request_record.user_id, requester_display_name, 'member', 'active')
    on conflict (group_id, user_id) do update set status = 'active';

    perform public.create_or_group_notification(
      p_recipient_user_id => request_record.user_id,
      p_actor_user_id => auth.uid(),
      p_notification_type => 'group_join_approved',
      p_related_group_id => request_record.group_id
    );
  end if;

  return jsonb_build_object('ok', true, 'approved', approve);
end;
$$;

create or replace function public.set_group_member_role(target_group_id uuid, target_user_id uuid, new_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
begin
  select (owner_user_id = auth.uid()) into is_owner
  from public.gridster_groups where id = target_group_id;

  if not coalesce(is_owner, false) then
    raise exception 'Owner access required';
  end if;

  if new_role not in ('moderator', 'member') then
    raise exception 'Invalid role';
  end if;

  update public.gridster_group_members
  set role = new_role
  where group_id = target_group_id and user_id = target_user_id and role <> 'owner';

  return jsonb_build_object('ok', true, 'role', new_role);
end;
$$;

create or replace function public.moderator_update_group_member_status(target_group_id uuid, target_user_id uuid, new_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_moderator_or_owner(target_group_id, auth.uid()) then
    raise exception 'Moderator or owner access required';
  end if;

  if new_status not in ('active', 'suspended', 'banned', 'removed') then
    raise exception 'Invalid status';
  end if;

  if exists (
    select 1 from public.gridster_group_members
    where group_id = target_group_id and user_id = target_user_id and role = 'owner'
  ) then
    raise exception 'Cannot act on the group owner';
  end if;

  if new_status = 'removed' then
    delete from public.gridster_group_members
    where group_id = target_group_id and user_id = target_user_id;
  else
    update public.gridster_group_members
    set status = new_status
    where group_id = target_group_id and user_id = target_user_id;
  end if;

  return jsonb_build_object('ok', true, 'status', new_status);
end;
$$;

grant execute on function public.pin_group_post(uuid, boolean) to authenticated;
grant execute on function public.set_group_post_comments_enabled(uuid, boolean) to authenticated;
grant execute on function public.moderator_remove_group_post(uuid) to authenticated;
grant execute on function public.moderator_remove_group_comment(uuid) to authenticated;
grant execute on function public.respond_to_group_join_request(uuid, boolean) to authenticated;
grant execute on function public.set_group_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.moderator_update_group_member_status(uuid, uuid, text) to authenticated;
