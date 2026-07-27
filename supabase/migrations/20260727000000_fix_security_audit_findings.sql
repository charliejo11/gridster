-- =========================================================
-- Security audit fixes (highest-priority findings)
--
-- 1. account_status was addable by the user it gates - a suspended
--    account could un-suspend itself with a direct profile update.
-- 2. Messaging had no server-side friends-only check - any
--    authenticated user could DM any other user directly via the
--    client, bypassing the app-code-only restriction.
-- 3. Either party could update a friend request's status - the
--    sender could accept their own request.
-- 4. claim_daily_login_bonus / claim_profile_complete_bonus /
--    claim_sl_verified_bonus checked-then-acted with no atomic gate,
--    so concurrent calls could grant the same bonus more than once.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Pin account_status the same way is_admin/is_plus/etc. are
--    already pinned - not settable by the user it applies to.
-- ---------------------------------------------------------

drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and is_admin = (select p.is_admin from public.profiles p where p.user_id = auth.uid())
    and is_plus = (select p.is_plus from public.profiles p where p.user_id = auth.uid())
    and plus_status = (select p.plus_status from public.profiles p where p.user_id = auth.uid())
    and plus_current_period_end is not distinct from (select p.plus_current_period_end from public.profiles p where p.user_id = auth.uid())
    and stripe_customer_id is not distinct from (select p.stripe_customer_id from public.profiles p where p.user_id = auth.uid())
    and stripe_subscription_id is not distinct from (select p.stripe_subscription_id from public.profiles p where p.user_id = auth.uid())
    and plus_price_tier is not distinct from (select p.plus_price_tier from public.profiles p where p.user_id = auth.uid())
    and account_status = (select p.account_status from public.profiles p where p.user_id = auth.uid())
  );

-- ---------------------------------------------------------
-- 2. Messaging: require an accepted friendship between sender and
--    recipient at insert time, server-side - not just in
--    gridsterMessages.js. Direction-agnostic (a friendship is a
--    single row regardless of who originally sent the request).
-- ---------------------------------------------------------

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

comment on table public.gridster_messages is
  'Direct messages between two Gridster residents. Sending requires an accepted gridster_friend_requests row between sender and recipient, enforced by this table''s own insert policy - not application code alone.';

-- ---------------------------------------------------------
-- 3. Friend requests: only the recipient can change status/
--    responded_at (accept/decline). The sender keeps a separate,
--    narrower policy that only lets them flip their own
--    sender_seen flag (markFriendNotificationsSeen) - everything
--    else on the row must stay exactly as it was for a sender-
--    originated update to be allowed. Postgres combines multiple
--    permissive policies for the same command with OR, both for
--    USING and WITH CHECK, so a sender changing status satisfies
--    neither policy's WITH CHECK and is correctly rejected, while a
--    sender only touching sender_seen satisfies this one.
-- ---------------------------------------------------------

drop policy if exists "Participants can update a friend request" on public.gridster_friend_requests;

create policy "Recipient can respond to a friend request"
on public.gridster_friend_requests for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

create policy "Sender can mark their own notification seen"
on public.gridster_friend_requests for update
to authenticated
using (auth.uid() = sender_id)
with check (
  auth.uid() = sender_id
  and status = (select fr.status from public.gridster_friend_requests fr where fr.id = gridster_friend_requests.id)
  and recipient_id = (select fr.recipient_id from public.gridster_friend_requests fr where fr.id = gridster_friend_requests.id)
  and responded_at is not distinct from (select fr.responded_at from public.gridster_friend_requests fr where fr.id = gridster_friend_requests.id)
  and recipient_seen = (select fr.recipient_seen from public.gridster_friend_requests fr where fr.id = gridster_friend_requests.id)
);

comment on table public.gridster_friend_requests is
  'Friend requests between Gridster profiles. A row with status=accepted means both users are friends. Only the recipient can change status/responded_at (see "Recipient can respond..."); the sender may only flip their own sender_seen flag (see "Sender can mark...") - the sender cannot accept their own request.';

-- ---------------------------------------------------------
-- 4. Bonus claim RPCs: gate the balance grant on the atomic insert/
--    update actually taking effect, not on a separate pre-check.
--    Matches the pattern already used by grant_plus_monthly_bonus /
--    credit_gridster_plus_linden_payment (insert ... on conflict do
--    nothing returning id, only grant if a row came back) and
--    buy_bling_item (row lock). The previous versions checked
--    "already claimed?" and granted Bling Bits BEFORE the insert
--    that was supposed to prevent a repeat - two concurrent calls
--    could both pass the check before either committed, and both
--    would grant the balance even though only one insert could ever
--    succeed.
-- ---------------------------------------------------------

create or replace function public.claim_daily_login_bonus()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  updated_rows integer;
  new_balance integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- The unique constraint on (user_id, bonus_type) plus this
  -- conditional "do update ... where" is the atomic gate: Postgres
  -- takes a row lock to evaluate the ON CONFLICT branch, so two
  -- concurrent callers can never both see "not yet claimed today" -
  -- exactly one gets a row affected, the other gets zero.
  insert into public.gridster_bonus_claims (user_id, bonus_type, claimed_at)
  values (current_user_id, 'daily_login', now())
  on conflict (user_id, bonus_type) do update
    set claimed_at = now()
    where public.gridster_bonus_claims.claimed_at::date < current_date;

  get diagnostics updated_rows = row_count;

  if updated_rows = 0 then
    return jsonb_build_object('ok', true, 'bonus_type', 'daily_login', 'granted', false);
  end if;

  insert into public.bling_balances (user_id, balance)
  values (current_user_id, 1250)
  on conflict (user_id) do nothing;

  update public.bling_balances
  set balance = balance + 50
  where user_id = current_user_id
  returning balance into new_balance;

  return jsonb_build_object('ok', true, 'bonus_type', 'daily_login', 'granted', true, 'balance', new_balance);
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
  inserted_id uuid;
  new_balance integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into profile_record
  from public.profiles
  where user_id = current_user_id;

  if coalesce(length(trim(profile_record.display_name)), 0) = 0
    or coalesce(length(trim(profile_record.sl_username)), 0) = 0
    or coalesce(length(trim(profile_record.bio)), 0) = 0
  then
    return jsonb_build_object('ok', true, 'bonus_type', 'profile_complete', 'granted', false);
  end if;

  -- Insert is the atomic gate - only the caller who actually inserts
  -- the row (id returned, not null) grants the balance. A concurrent
  -- caller that loses the unique-constraint race gets NULL back and
  -- skips the grant entirely, unlike the previous check-then-act
  -- version where both could grant before either committed.
  insert into public.gridster_bonus_claims (user_id, bonus_type)
  values (current_user_id, 'profile_complete')
  on conflict (user_id, bonus_type) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return jsonb_build_object('ok', true, 'bonus_type', 'profile_complete', 'granted', false);
  end if;

  insert into public.bling_balances (user_id, balance)
  values (current_user_id, 1250)
  on conflict (user_id) do nothing;

  update public.bling_balances
  set balance = balance + 200
  where user_id = current_user_id
  returning balance into new_balance;

  return jsonb_build_object('ok', true, 'bonus_type', 'profile_complete', 'granted', true, 'balance', new_balance);
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
  inserted_id uuid;
  new_balance integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(sl_verified, false)
  into is_verified
  from public.profiles
  where user_id = current_user_id;

  if not coalesce(is_verified, false) then
    return jsonb_build_object('ok', true, 'bonus_type', 'sl_verified', 'granted', false);
  end if;

  insert into public.gridster_bonus_claims (user_id, bonus_type)
  values (current_user_id, 'sl_verified')
  on conflict (user_id, bonus_type) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return jsonb_build_object('ok', true, 'bonus_type', 'sl_verified', 'granted', false);
  end if;

  insert into public.bling_balances (user_id, balance)
  values (current_user_id, 1250)
  on conflict (user_id) do nothing;

  update public.bling_balances
  set balance = balance + 250
  where user_id = current_user_id
  returning balance into new_balance;

  return jsonb_build_object('ok', true, 'bonus_type', 'sl_verified', 'granted', true, 'balance', new_balance);
end;
$$;
