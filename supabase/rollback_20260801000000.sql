-- =========================================================
-- ROLLBACK for 20260801000000_fix_messaging_groups_friends_photochallenge_findings.sql
-- AND 20260802000000_fix_join_request_visibility_regression.sql
--
-- Restores every policy/function these two migrations touched to their
-- exact prior definitions (pulled from the migrations that originally
-- created them: 20260710000000, 20260713000000, 20260714000000,
-- 20260727000000, 20260708000000, 20260729020000, 20260731000000,
-- 20260731030000, 20260731050000, 20260731060000). This is a manual,
-- NOT auto-applied script - run it by hand (e.g. via the Supabase SQL
-- editor or `psql "$DB_URL" -f supabase/rollback_20260801000000.sql`)
-- only if these need to be undone on a specific environment.
--
-- NOT run automatically by `supabase db push` - this file intentionally
-- lives outside supabase/migrations/ so it is never picked up as a
-- pending migration.
--
-- Run 0 first if 20260802000000 also needs undoing (it's the more
-- recent change, so revert it first).
--
-- ---------------------------------------------------------
-- 0. Undo 20260802000000: restore the join-request policy to its
--    20260731030000 form and drop the group_privacy() helper. NOTE:
--    this reintroduces the regression that migration fixed - only do
--    this if 20260801000000 below is ALSO being rolled back in the
--    same pass, since the regression only exists because of that one.
-- ---------------------------------------------------------

drop policy if exists "Users can request to join private groups" on public.gridster_group_join_requests;
create policy "Users can request to join private groups"
on public.gridster_group_join_requests for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (select 1 from public.gridster_groups g where g.id = group_id and g.privacy = 'private')
  and not public.is_active_group_member(group_id, auth.uid())
);

drop function if exists public.group_privacy(uuid);

-- 1a/1b. Messages
drop policy if exists "Recipient can mark a message read" on public.gridster_messages;
create policy "Recipient can mark a message read"
on public.gridster_messages for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

drop policy if exists "Users can send messages as themselves" on public.gridster_messages;
create policy "Users can send messages as themselves"
on public.gridster_messages for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.gridster_friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.sender_id = sender_id and fr.recipient_id = recipient_id)
        or (fr.sender_id = recipient_id and fr.recipient_id = sender_id)
      )
  )
);

drop function if exists public.are_users_friends(uuid, uuid);
drop function if exists public.is_blocked_either_direction(uuid, uuid);

-- 2a. Group helper functions - revert to non-SECURITY DEFINER.
create or replace function public.is_active_group_member(target_group_id uuid, target_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.gridster_group_members
    where group_id = target_group_id and user_id = target_user_id and status = 'active'
  );
$$;

create or replace function public.is_group_moderator_or_owner(target_group_id uuid, target_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.gridster_group_members
    where group_id = target_group_id and user_id = target_user_id
      and status = 'active' and role in ('owner', 'moderator')
  );
$$;

create or replace function public.can_view_group_content(target_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.gridster_groups g
    where g.id = target_group_id
      and (g.privacy = 'public' or public.is_active_group_member(target_group_id, auth.uid()))
  );
$$;

-- 2b/2c. Groups + members select policies.
drop policy if exists "Public groups readable by everyone, private groups by active members only" on public.gridster_groups;
create policy "Groups are publicly readable"
on public.gridster_groups
for select
using (true);

drop policy if exists "Group members readable for public groups, active-members-only for private groups" on public.gridster_group_members;
create policy "Group members are publicly readable"
on public.gridster_group_members
for select
using (true);

-- 2d. Join request approval - drop the row lock.
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

-- 2e. Mentions - drop the private-group membership check.
create or replace function public.parse_and_notify_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_text text;
  actor_id uuid;
  target_post_id uuid;
  target_comment_id uuid;
  target_group_post_id uuid;
  target_group_comment_id uuid;
  target_group_id uuid;
  candidate text;
  resolved_user_id uuid;
  match_count integer := 0;
begin
  if tg_table_name = 'gridster_posts' then
    source_text := to_jsonb(new) ->> 'content';
    actor_id := (to_jsonb(new) ->> 'user_id')::uuid;
    target_post_id := new.id;
  elsif tg_table_name = 'gridster_post_comments' then
    source_text := to_jsonb(new) ->> 'body';
    actor_id := (to_jsonb(new) ->> 'user_id')::uuid;
    target_post_id := (to_jsonb(new) ->> 'post_id')::uuid;
    target_comment_id := new.id;
  elsif tg_table_name = 'gridster_group_posts' then
    source_text := to_jsonb(new) ->> 'content';
    actor_id := (to_jsonb(new) ->> 'user_id')::uuid;
    target_group_post_id := new.id;
    target_group_id := new.group_id;
  elsif tg_table_name = 'gridster_group_post_comments' then
    source_text := to_jsonb(new) ->> 'content';
    actor_id := (to_jsonb(new) ->> 'author_user_id')::uuid;
    target_group_comment_id := new.id;
    select p.id, p.group_id into target_group_post_id, target_group_id
    from public.gridster_group_posts p
    where p.id = new.post_id;
  end if;

  if source_text is null then
    return new;
  end if;

  for candidate in
    select (regexp_matches(source_text, '@([a-zA-Z0-9._]+)', 'g'))[1]
    limit 20
  loop
    select user_id into resolved_user_id
    from public.profiles
    where lower(sl_username) = lower(candidate)
    order by created_at asc
    limit 1;

    if resolved_user_id is not null and resolved_user_id <> actor_id then
      perform public.create_or_group_notification(
        p_recipient_user_id => resolved_user_id,
        p_actor_user_id => actor_id,
        p_notification_type => 'mention',
        p_related_post_id => target_post_id,
        p_related_comment_id => target_comment_id,
        p_related_group_id => target_group_id,
        p_related_group_post_id => target_group_post_id,
        p_related_group_comment_id => target_group_comment_id
      );
      match_count := match_count + 1;
    end if;
  end loop;

  return new;
end;
$$;

-- 3a/3b. Friend requests.
drop policy if exists "Recipient can respond to a friend request" on public.gridster_friend_requests;
create policy "Recipient can respond to a friend request"
on public.gridster_friend_requests for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

drop policy if exists "Sender can delete their own pending request" on public.gridster_friend_requests;
create policy "Sender can delete their own request"
on public.gridster_friend_requests for delete
to authenticated
using (auth.uid() = sender_id);

-- 4a. Photo challenges - self-voting.
create or replace function public.vote_photo_entry(target_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  inserted_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.gridster_photo_votes (entry_id, user_id)
  values (target_entry_id, current_user_id)
  on conflict (entry_id, user_id) do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    update public.gridster_photo_entries
    set vote_count = vote_count + 1
    where id = target_entry_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'entry_id', target_entry_id,
    'already_voted', inserted_id is null
  );
end;
$$;

-- 4b. Photo entries insert policy - drop the active-challenge check.
drop policy if exists "Users can insert their own photo entries into an active challenge" on public.gridster_photo_entries;
create policy "Users can insert their own photo entries"
on public.gridster_photo_entries
for insert
to authenticated
with check (auth.uid() = user_id);

-- 4c. Bling Bits entry bonus - revert to unconditional per-insert grant,
-- and drop the claims table this migration introduced.
create or replace function public.grant_photo_entry_bonus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.bling_balances (user_id, balance)
  values (new.user_id, 1250)
  on conflict (user_id) do nothing;

  update public.bling_balances
  set balance = balance + 25
  where user_id = new.user_id;

  perform public.create_or_group_notification(
    p_recipient_user_id => new.user_id,
    p_actor_user_id => null,
    p_notification_type => 'bling_bits_bonus',
    p_amount => 25,
    p_title => 'Photo challenge entry bonus'
  );

  return new;
end;
$$;

drop table if exists public.gridster_photo_entry_bonus_claims;
