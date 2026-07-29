-- =========================================================
-- Follow-up audit: messaging, groups, friend requests, photo challenges.
--
-- 1. Messaging: the "mark as read" UPDATE policy only checked
--    auth.uid() = recipient_id with no column pinning - a recipient
--    could rewrite content/sender_id on any message addressed to them
--    via a direct client update, forging what the other party said.
--    Also: the block feature (gridster_creator_actions) filtered the
--    Home feed but was never enforced on gridster_messages, so a
--    blocked user could still DM the blocker.
-- 2. Groups: "Groups are publicly readable" / "Group members are
--    publicly readable" used `using (true)` unconditionally - the
--    privacy column added later was never wired into these two
--    policies, so private groups (including their SLURL) and private
--    group member rosters were fully readable by anyone. Also: the
--    join-request approval RPC read the request row without a lock
--    (inconsistent with the pattern already used elsewhere), and
--    @mention notifications on group content didn't check whether the
--    mentioned user could actually see a private group, leaking its
--    existence to non-members.
-- 3. Friend requests: the recipient's response policy pinned
--    recipient_id but not sender_id, so a recipient with any real
--    pending inbound request could rewrite sender_id to an arbitrary
--    victim and call it "accepted", fabricating a friendship (and
--    thereby unlocking the friends-only DM gate) the victim never
--    agreed to. Also hardened the sender-side delete policy to only
--    apply to still-pending requests, so it can never silently delete
--    an already-accepted friendship.
-- 4. Photo challenges: vote_photo_entry allowed voting for your own
--    entry; the entry INSERT policy didn't check the challenge was
--    still active; and grant_photo_entry_bonus paid out +25 Bling
--    Bits on every entry INSERT with no claim tracking, so
--    submit -> collect -> delete -> resubmit could mint unlimited
--    currency.
-- =========================================================

-- ---------------------------------------------------------
-- 1a. Messages: pin every column except read_at on the
--     recipient's "mark as read" update.
-- ---------------------------------------------------------

drop policy if exists "Recipient can mark a message read" on public.gridster_messages;

create policy "Recipient can mark a message read"
on public.gridster_messages for update
to authenticated
using (auth.uid() = recipient_id)
with check (
  auth.uid() = recipient_id
  and sender_id = (select m.sender_id from public.gridster_messages m where m.id = gridster_messages.id)
  and recipient_id = (select m.recipient_id from public.gridster_messages m where m.id = gridster_messages.id)
  and content = (select m.content from public.gridster_messages m where m.id = gridster_messages.id)
  and created_at = (select m.created_at from public.gridster_messages m where m.id = gridster_messages.id)
);

-- ---------------------------------------------------------
-- 1b. Messages: a block in either direction blocks the DM, not just
--     the Home feed.
--
--     Both checks are pulled into their own SECURITY DEFINER helpers
--     rather than written as inline correlated subqueries in the
--     policy, for two concrete reasons hit while verifying this
--     migration against gridster-test:
--     1. gridster_creator_actions' own SELECT policy only lets a user
--        see rows where THEY are user_id - so an inline subquery
--        evaluated as the sender (the blocked party, not the blocker)
--        can never see the blocker's row and the check is silently a
--        no-op for exactly the direction that matters. security
--        definer bypasses that and lets it see both directions.
--     2. gridster_friend_requests has its own sender_id/recipient_id
--        columns, which collide with an inline subquery's bare
--        `sender_id`/`recipient_id` references - Postgres binds those
--        to the subquery's own fr.sender_id/fr.recipient_id (the
--        innermost matching scope), not this table's row, silently
--        turning "is there an accepted request between these two
--        people" into "does any accepted request exist at all".
--        Named parameters on a real function can't collide this way.
-- ---------------------------------------------------------

create or replace function public.are_users_friends(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gridster_friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.sender_id = user_a and fr.recipient_id = user_b)
        or (fr.sender_id = user_b and fr.recipient_id = user_a)
      )
  );
$$;

create or replace function public.is_blocked_either_direction(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gridster_creator_actions ca
    where ca.action = 'block'
      and (
        (ca.user_id = user_a and ca.target_user_id = user_b)
        or (ca.user_id = user_b and ca.target_user_id = user_a)
      )
  );
$$;

drop policy if exists "Users can send messages as themselves" on public.gridster_messages;

create policy "Users can send messages as themselves"
on public.gridster_messages for insert
to authenticated
with check (
  auth.uid() = sender_id
  and public.are_users_friends(sender_id, recipient_id)
  and not public.is_blocked_either_direction(sender_id, recipient_id)
);

comment on table public.gridster_messages is
  'Direct messages between two Gridster residents. Sending requires an accepted gridster_friend_requests row between sender and recipient AND no block (gridster_creator_actions) in either direction - both enforced by this table''s own insert policy, not application code alone.';

-- ---------------------------------------------------------
-- 2a. Groups: make the membership-check helpers SECURITY DEFINER so
--     they can be used in gridster_groups' and
--     gridster_group_members' OWN select policies without Postgres
--     raising "infinite recursion detected in policy" (a function
--     that queries the very table its result gates for RLS on that
--     same table needs to bypass RLS internally to avoid the self-
--     reference cycle). These only ever return a boolean derived from
--     a specific (group, user) pair - no arbitrary data exposure.
-- ---------------------------------------------------------

create or replace function public.is_active_group_member(target_group_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gridster_groups g
    where g.id = target_group_id
      and (g.privacy = 'public' or public.is_active_group_member(target_group_id, auth.uid()))
  );
$$;

-- ---------------------------------------------------------
-- 2b. Groups: private groups (and their SLURL, member count, etc.)
--     are now only visible to their own active members. Public
--     groups are unaffected - still visible to everyone, including
--     signed-out visitors.
--
--     Deliberately NOT can_view_group_content(id) here, unlike the
--     other tables below - that function queries gridster_groups
--     itself, and a self-referential query from gridster_groups' OWN
--     select policy breaks INSERT ... RETURNING on this table (the
--     row-visibility check Postgres runs to decide what RETURNING can
--     hand back can't see the row this very statement is still
--     inserting). Referencing this row's own `privacy`/`owner_user_id`
--     columns directly avoids that self-query. owner_user_id = auth.uid()
--     is also checked directly (not just via is_active_group_member,
--     which depends on auto_join_group_owner's AFTER INSERT trigger
--     having already run) so a creator can always see the private
--     group they just created regardless of trigger timing.
-- ---------------------------------------------------------

drop policy if exists "Groups are publicly readable" on public.gridster_groups;
drop policy if exists "Public groups readable by everyone, private groups by active members only" on public.gridster_groups;

create policy "Public groups readable by everyone, private groups by active members only"
on public.gridster_groups
for select
using (
  privacy = 'public'
  or owner_user_id = auth.uid()
  or public.is_active_group_member(id, auth.uid())
);

-- ---------------------------------------------------------
-- 2c. Groups: a private group's member roster is likewise only
--     visible to its own active members - previously anyone could
--     enumerate every member of any private group.
-- ---------------------------------------------------------

drop policy if exists "Group members are publicly readable" on public.gridster_group_members;
drop policy if exists "Group members readable for public groups, active-members-only for private groups" on public.gridster_group_members;

create policy "Group members readable for public groups, active-members-only for private groups"
on public.gridster_group_members
for select
using (public.can_view_group_content(group_id));

-- ---------------------------------------------------------
-- 2d. Groups: take a row lock before checking/updating a join
--     request's status, matching the pattern already used by
--     close_photo_challenge_and_award_winner - without it, two
--     concurrent approve/deny calls on the same request could both
--     pass the "still pending" check and each send its own
--     notification for the same event.
-- ---------------------------------------------------------

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
  select * into request_record
  from public.gridster_group_join_requests
  where id = target_request_id
  for update;

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

-- ---------------------------------------------------------
-- 2e. Groups: don't let an @mention on group content reveal that a
--     private group exists (or that its mentioner is a member of it)
--     to someone who isn't in that group. Checks the MENTIONED
--     user's membership, not the caller's - can_view_group_content()
--     answers "can the current caller see this", which is the wrong
--     question here.
-- ---------------------------------------------------------

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
  group_privacy text;
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

  if target_group_id is not null then
    select privacy into group_privacy from public.gridster_groups where id = target_group_id;
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
      if target_group_id is not null
        and group_privacy = 'private'
        and not public.is_active_group_member(target_group_id, resolved_user_id)
      then
        continue;
      end if;

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

-- ---------------------------------------------------------
-- 3a. Friend requests: pin sender_id (and created_at, for good
--     measure) on the recipient's own response policy - previously
--     only recipient_id was pinned, so a recipient with ANY real
--     pending inbound request could rewrite sender_id to an
--     arbitrary victim and set status = 'accepted' in the same
--     update, fabricating a friendship the victim never agreed to.
-- ---------------------------------------------------------

drop policy if exists "Recipient can respond to a friend request" on public.gridster_friend_requests;

create policy "Recipient can respond to a friend request"
on public.gridster_friend_requests for update
to authenticated
using (auth.uid() = recipient_id)
with check (
  auth.uid() = recipient_id
  and sender_id = (select fr.sender_id from public.gridster_friend_requests fr where fr.id = gridster_friend_requests.id)
  and created_at = (select fr.created_at from public.gridster_friend_requests fr where fr.id = gridster_friend_requests.id)
);

-- ---------------------------------------------------------
-- 3b. Friend requests: the sender's delete ("cancel") only ever runs
--     from the UI against a pending_sent request, but the RLS itself
--     had no status check, so a direct call could silently delete an
--     already-accepted friendship with no notice to the other side.
--     Restrict it to pending requests only - matches the only way
--     this is actually used.
-- ---------------------------------------------------------

drop policy if exists "Sender can delete their own request" on public.gridster_friend_requests;
drop policy if exists "Sender can delete their own pending request" on public.gridster_friend_requests;

create policy "Sender can delete their own pending request"
on public.gridster_friend_requests for delete
to authenticated
using (auth.uid() = sender_id and status = 'pending');

-- ---------------------------------------------------------
-- 4a. Photo challenges: reject self-votes.
-- ---------------------------------------------------------

create or replace function public.vote_photo_entry(target_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  entry_owner_id uuid;
  inserted_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select user_id into entry_owner_id
  from public.gridster_photo_entries
  where id = target_entry_id;

  if entry_owner_id is null then
    raise exception 'Entry not found';
  end if;

  if entry_owner_id = current_user_id then
    raise exception 'You can''t vote for your own entry';
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

-- ---------------------------------------------------------
-- 4b. Photo challenges: an entry can only be submitted while its
--     challenge is still active - previously the insert policy only
--     checked auth.uid() = user_id, so a direct call with any
--     challenge_id (including an already-closed one) was accepted.
-- ---------------------------------------------------------

drop policy if exists "Users can insert their own photo entries" on public.gridster_photo_entries;
drop policy if exists "Users can insert their own photo entries into an active challenge" on public.gridster_photo_entries;

create policy "Users can insert their own photo entries into an active challenge"
on public.gridster_photo_entries
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.gridster_photo_challenges c
    where c.id = challenge_id and c.status = 'active'
  )
);

-- ---------------------------------------------------------
-- 4c. Photo challenges: gate the +25 Bling Bits entry bonus on a
--     real, permanent per-(challenge, user) claim, not on the mere
--     existence of a current entry row. Previously
--     submit -> collect bonus -> delete entry -> resubmit granted
--     the bonus again every time, since the trigger fired on every
--     fresh INSERT with no memory of past claims. The claims table
--     is never touched by deletePhotoEntry, so it survives entry
--     deletion and closes the loop for good - same atomic-gate
--     pattern as gridster_bonus_claims for the other bonuses.
-- ---------------------------------------------------------

create table if not exists public.gridster_photo_entry_bonus_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.gridster_photo_challenges(id) on delete cascade,
  claimed_at timestamptz not null default now(),

  constraint gridster_photo_entry_bonus_claims_unique unique (user_id, challenge_id)
);

alter table public.gridster_photo_entry_bonus_claims enable row level security;

drop policy if exists "Users can view their own photo entry bonus claims" on public.gridster_photo_entry_bonus_claims;
create policy "Users can view their own photo entry bonus claims"
on public.gridster_photo_entry_bonus_claims
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.grant_photo_entry_bonus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  claim_id uuid;
begin
  insert into public.gridster_photo_entry_bonus_claims (user_id, challenge_id)
  values (new.user_id, new.challenge_id)
  on conflict (user_id, challenge_id) do nothing
  returning id into claim_id;

  if claim_id is null then
    return new;
  end if;

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
