-- =========================================================
-- Re-fix a regressed double-grant race in claim_daily_login_bonus,
-- claim_profile_complete_bonus, and claim_sl_verified_bonus.
--
-- 20260727000000_fix_security_audit_findings.sql made all three atomic
-- (insert into gridster_bonus_claims FIRST, gated on conflict, only
-- grant Bling Bits if that insert actually took effect). Two days
-- later, 20260729020000_add_notifications_to_grant_rpcs.sql silently
-- redefined all three back to a check-then-act body (select whether
-- already claimed, THEN mutate balance, THEN insert the claim row) --
-- reintroducing the exact race the earlier migration closed, purely as
-- a side effect of wiring in a notification call. Confirmed no
-- migration after 20260729020000 touches these three functions again.
--
-- This migration restores the 20260727000000 atomic bodies exactly,
-- keeping the create_or_group_notification() calls 20260729020000
-- added on the granted path. See supabase/tests/security_regressions.mjs
-- for the concurrency test that catches a third regression of this
-- same bug immediately.
-- =========================================================

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

  -- ATOMIC GATE - do not replace this with a select-then-insert check.
  -- This exact function was fixed for a double-grant race on
  -- 2026-07-27, then silently regressed back to check-then-act on
  -- 2026-07-29 when a notification call was added. The unique
  -- constraint on (user_id, bonus_type) plus this conditional
  -- "on conflict do update ... where" is what makes two concurrent
  -- callers impossible to both grant: Postgres takes a row lock to
  -- evaluate the ON CONFLICT branch, so only one caller can ever see
  -- "not yet claimed today" turn into an actual row change.
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

  perform public.create_or_group_notification(
    p_recipient_user_id => current_user_id,
    p_actor_user_id => null,
    p_notification_type => 'bling_bits_bonus',
    p_amount => 50,
    p_title => 'Daily login bonus'
  );

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

  -- ATOMIC GATE, same rationale as claim_daily_login_bonus above -
  -- insert is the only thing that decides whether this call grants.
  -- A concurrent caller that loses the unique-constraint race gets
  -- NULL back and skips the grant entirely.
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

  perform public.create_or_group_notification(
    p_recipient_user_id => current_user_id,
    p_actor_user_id => null,
    p_notification_type => 'bling_bits_bonus',
    p_amount => 200,
    p_title => 'Profile completed bonus'
  );

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

  -- ATOMIC GATE, same rationale as the two functions above.
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

  perform public.create_or_group_notification(
    p_recipient_user_id => current_user_id,
    p_actor_user_id => null,
    p_notification_type => 'bling_bits_bonus',
    p_amount => 250,
    p_title => 'Second Life verification bonus'
  );

  return jsonb_build_object('ok', true, 'bonus_type', 'sl_verified', 'granted', true, 'balance', new_balance);
end;
$$;
