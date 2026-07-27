-- =========================================================================
-- Gridster Plus Linden payment RPC test script
--
-- SCRATCH / DEV SUPABASE DATABASE ONLY. NEVER RUN THIS AGAINST PRODUCTION.
-- It inserts throwaway rows into auth.users, public.profiles, and
-- public.bling_balances, and calls the real
-- public.credit_gridster_plus_linden_payment(...) RPC with fake data.
--
-- PREREQUISITE: apply this migration to the target database FIRST -
--   supabase/migrations/20260726000000_add_gridster_plus_linden_payments.sql
-- This script calls a function and reads/writes a table that only exist
-- after that migration runs. The preflight check below fails loudly and
-- immediately (before touching any data) if it hasn't been applied yet.
--
-- This script also depends on tables created by earlier, already-applied
-- migrations that ship with this repo:
--   - auth.users                (Supabase Auth, not part of this repo)
--   - public.profiles           (20260703084000_add_bling_depot_to_profiles.sql)
--   - public.bling_balances     (20260703090000_create_bling_depot_tables.sql)
--
-- All ids, emails, avatar keys, Stripe ids, and payment references below
-- are freshly random-generated or obviously-fake literals created and
-- destroyed entirely within this script. Nothing here is a real Gridster
-- user, a real Second Life avatar, or a real Stripe object.
--
-- HOW THIS SCRIPT REPORTS RESULTS
-- Every scenario below is its own DO block with an inner BEGIN/EXCEPTION
-- handler. Each assertion that fails does a real `raise exception` (so
-- failures are never silently swallowed) - but that exception is caught
-- one level up, inside the same scenario's block, recorded as a FAIL row,
-- and printed as a NOTICE, so one failing scenario does not stop the rest
-- of the suite from running and reporting. The very last statement in this
-- file is an unconditional `rollback`, and the final summary block never
-- raises (it only warns/notices), specifically so that ROLLBACK always
-- executes no matter how many scenarios failed - no fixture data is meant
-- to survive a run of this script, ever, pass or fail.
--
-- HOW TO RUN
-- Paste this whole file into the Supabase SQL Editor for your scratch/dev
-- project and run it once, or `psql "$SCRATCH_DB_URL" -f supabase/tests/gridster_plus_linden_payment_test.sql`.
-- Read the NOTICE output top to bottom for PASS/FAIL per scenario and the
-- final summary line.
-- =========================================================================

begin;

create temporary table linden_payment_test_results (
  scenario text not null,
  status text not null,
  detail text
);

-- ---------------------------------------------------------------------
-- Preflight: fail immediately (before creating any fixture data) if the
-- migration this test depends on has not been applied to this database.
-- ---------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.credit_gridster_plus_linden_payment(text, integer, text, text, integer)') is null then
    raise exception 'public.credit_gridster_plus_linden_payment(...) does not exist. Apply supabase/migrations/20260726000000_add_gridster_plus_linden_payments.sql to this database before running this test script.';
  end if;

  if to_regclass('public.gridster_plus_linden_payments') is null then
    raise exception 'public.gridster_plus_linden_payments does not exist. Apply supabase/migrations/20260726000000_add_gridster_plus_linden_payments.sql to this database before running this test script.';
  end if;

  if to_regclass('public.profiles') is null then
    raise exception 'public.profiles does not exist in this database - this script depends on the base Gridster schema, not just the Linden payment migration.';
  end if;

  if to_regclass('public.bling_balances') is null then
    raise exception 'public.bling_balances does not exist in this database - this script depends on the base Gridster schema, not just the Linden payment migration.';
  end if;

  raise notice 'Preflight OK: credit_gridster_plus_linden_payment(...) and its tables exist. Starting test scenarios.';
end;
$$;

-- =========================================================================
-- Scenario 1: active Stripe MONTHLY member pays the kiosk -> rejected
-- =========================================================================
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_avatar_uuid text := gen_random_uuid()::text;
  v_reference text := 'test-linden-ref-' || gen_random_uuid()::text;
  v_period_end timestamptz := now() + interval '20 days';
  v_stripe_customer text := 'cus_test_fixture_' || gen_random_uuid()::text;
  v_stripe_subscription text := 'sub_test_fixture_' || gen_random_uuid()::text;
  v_result jsonb;
  v_payment_count integer;
  v_balance integer;
  v_profile record;
begin
  begin
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'gridster-plus-linden-test+' || v_user_id || '@example.invalid',
      '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb,
      '', '', '', ''
    );

    insert into public.profiles (
      user_id, sl_avatar_uuid, sl_verified, sl_verified_at,
      is_plus, plus_status, plus_price_tier, plus_current_period_end,
      stripe_customer_id, stripe_subscription_id
    ) values (
      v_user_id, v_avatar_uuid, true, now(),
      true, 'active', 'monthly', v_period_end,
      v_stripe_customer, v_stripe_subscription
    );

    insert into public.bling_balances (user_id, balance) values (v_user_id, 1000);

    v_result := public.credit_gridster_plus_linden_payment(
      v_avatar_uuid, 1750, v_reference, gen_random_uuid()::text, 500
    );

    if (v_result->>'ok')::boolean then
      raise exception 'expected ok=false, got %', v_result;
    end if;

    if v_result->>'reason' is distinct from 'active_stripe_subscription' then
      raise exception 'expected reason=active_stripe_subscription, got %', v_result;
    end if;

    select count(*) into v_payment_count
    from public.gridster_plus_linden_payments
    where user_id = v_user_id;

    if v_payment_count <> 0 then
      raise exception 'expected 0 rows in gridster_plus_linden_payments, found %', v_payment_count;
    end if;

    select balance into v_balance from public.bling_balances where user_id = v_user_id;

    if v_balance <> 1000 then
      raise exception 'expected Bling balance unchanged at 1000, got %', v_balance;
    end if;

    select * into v_profile from public.profiles where user_id = v_user_id;

    if v_profile.is_plus is distinct from true
       or v_profile.plus_price_tier is distinct from 'monthly'
       or v_profile.plus_current_period_end is distinct from v_period_end
       or v_profile.stripe_customer_id is distinct from v_stripe_customer
       or v_profile.stripe_subscription_id is distinct from v_stripe_subscription
    then
      raise exception 'profile row changed unexpectedly: is_plus=%, tier=%, period_end=%, stripe_customer=%, stripe_sub=%',
        v_profile.is_plus, v_profile.plus_price_tier, v_profile.plus_current_period_end,
        v_profile.stripe_customer_id, v_profile.stripe_subscription_id;
    end if;

    insert into linden_payment_test_results values ('1: active Stripe monthly member rejected', 'PASS', null);
    raise notice 'PASS - Scenario 1: active Stripe monthly member rejected, refund path expected, no DB side effects.';
  exception when others then
    insert into linden_payment_test_results values ('1: active Stripe monthly member rejected', 'FAIL', sqlerrm);
    raise notice 'FAIL - Scenario 1: %', sqlerrm;
  end;
end;
$$;

-- =========================================================================
-- Scenario 2: active Stripe ANNUAL member pays the kiosk -> rejected
-- =========================================================================
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_avatar_uuid text := gen_random_uuid()::text;
  v_reference text := 'test-linden-ref-' || gen_random_uuid()::text;
  v_period_end timestamptz := now() + interval '200 days';
  v_stripe_customer text := 'cus_test_fixture_' || gen_random_uuid()::text;
  v_stripe_subscription text := 'sub_test_fixture_' || gen_random_uuid()::text;
  v_result jsonb;
  v_payment_count integer;
  v_balance integer;
  v_profile record;
begin
  begin
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'gridster-plus-linden-test+' || v_user_id || '@example.invalid',
      '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb,
      '', '', '', ''
    );

    insert into public.profiles (
      user_id, sl_avatar_uuid, sl_verified, sl_verified_at,
      is_plus, plus_status, plus_price_tier, plus_current_period_end,
      stripe_customer_id, stripe_subscription_id
    ) values (
      v_user_id, v_avatar_uuid, true, now(),
      true, 'active', 'annual', v_period_end,
      v_stripe_customer, v_stripe_subscription
    );

    insert into public.bling_balances (user_id, balance) values (v_user_id, 2000);

    v_result := public.credit_gridster_plus_linden_payment(
      v_avatar_uuid, 1750, v_reference, gen_random_uuid()::text, 500
    );

    if (v_result->>'ok')::boolean then
      raise exception 'expected ok=false, got %', v_result;
    end if;

    if v_result->>'reason' is distinct from 'active_stripe_subscription' then
      raise exception 'expected reason=active_stripe_subscription, got %', v_result;
    end if;

    select count(*) into v_payment_count
    from public.gridster_plus_linden_payments
    where user_id = v_user_id;

    if v_payment_count <> 0 then
      raise exception 'expected 0 rows in gridster_plus_linden_payments, found %', v_payment_count;
    end if;

    select balance into v_balance from public.bling_balances where user_id = v_user_id;

    if v_balance <> 2000 then
      raise exception 'expected Bling balance unchanged at 2000, got %', v_balance;
    end if;

    select * into v_profile from public.profiles where user_id = v_user_id;

    if v_profile.is_plus is distinct from true
       or v_profile.plus_price_tier is distinct from 'annual'
       or v_profile.plus_current_period_end is distinct from v_period_end
       or v_profile.stripe_customer_id is distinct from v_stripe_customer
       or v_profile.stripe_subscription_id is distinct from v_stripe_subscription
    then
      raise exception 'profile row changed unexpectedly: is_plus=%, tier=%, period_end=%, stripe_customer=%, stripe_sub=%',
        v_profile.is_plus, v_profile.plus_price_tier, v_profile.plus_current_period_end,
        v_profile.stripe_customer_id, v_profile.stripe_subscription_id;
    end if;

    insert into linden_payment_test_results values ('2: active Stripe annual member rejected', 'PASS', null);
    raise notice 'PASS - Scenario 2: active Stripe annual member rejected, refund path expected, no DB side effects.';
  exception when others then
    insert into linden_payment_test_results values ('2: active Stripe annual member rejected', 'FAIL', sqlerrm);
    raise notice 'FAIL - Scenario 2: %', sqlerrm;
  end;
end;
$$;

-- =========================================================================
-- Scenario 3: active Stripe FOUNDING member pays the kiosk -> rejected
-- =========================================================================
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_avatar_uuid text := gen_random_uuid()::text;
  v_reference text := 'test-linden-ref-' || gen_random_uuid()::text;
  v_period_end timestamptz := now() + interval '15 days';
  v_stripe_customer text := 'cus_test_fixture_' || gen_random_uuid()::text;
  v_stripe_subscription text := 'sub_test_fixture_' || gen_random_uuid()::text;
  v_result jsonb;
  v_payment_count integer;
  v_balance integer;
  v_profile record;
begin
  begin
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'gridster-plus-linden-test+' || v_user_id || '@example.invalid',
      '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb,
      '', '', '', ''
    );

    insert into public.profiles (
      user_id, sl_avatar_uuid, sl_verified, sl_verified_at,
      is_plus, plus_status, plus_price_tier, plus_current_period_end,
      stripe_customer_id, stripe_subscription_id
    ) values (
      v_user_id, v_avatar_uuid, true, now(),
      true, 'active', 'founding', v_period_end,
      v_stripe_customer, v_stripe_subscription
    );

    insert into public.bling_balances (user_id, balance) values (v_user_id, 3000);

    v_result := public.credit_gridster_plus_linden_payment(
      v_avatar_uuid, 1750, v_reference, gen_random_uuid()::text, 500
    );

    if (v_result->>'ok')::boolean then
      raise exception 'expected ok=false, got %', v_result;
    end if;

    if v_result->>'reason' is distinct from 'active_stripe_subscription' then
      raise exception 'expected reason=active_stripe_subscription, got %', v_result;
    end if;

    select count(*) into v_payment_count
    from public.gridster_plus_linden_payments
    where user_id = v_user_id;

    if v_payment_count <> 0 then
      raise exception 'expected 0 rows in gridster_plus_linden_payments, found %', v_payment_count;
    end if;

    select balance into v_balance from public.bling_balances where user_id = v_user_id;

    if v_balance <> 3000 then
      raise exception 'expected Bling balance unchanged at 3000, got %', v_balance;
    end if;

    select * into v_profile from public.profiles where user_id = v_user_id;

    if v_profile.is_plus is distinct from true
       or v_profile.plus_price_tier is distinct from 'founding'
       or v_profile.plus_current_period_end is distinct from v_period_end
       or v_profile.stripe_customer_id is distinct from v_stripe_customer
       or v_profile.stripe_subscription_id is distinct from v_stripe_subscription
    then
      raise exception 'profile row changed unexpectedly: is_plus=%, tier=%, period_end=%, stripe_customer=%, stripe_sub=%',
        v_profile.is_plus, v_profile.plus_price_tier, v_profile.plus_current_period_end,
        v_profile.stripe_customer_id, v_profile.stripe_subscription_id;
    end if;

    insert into linden_payment_test_results values ('3: active Stripe founding member rejected', 'PASS', null);
    raise notice 'PASS - Scenario 3: active Stripe founding member rejected, refund path expected, no DB side effects.';
  exception when others then
    insert into linden_payment_test_results values ('3: active Stripe founding member rejected', 'FAIL', sqlerrm);
    raise notice 'FAIL - Scenario 3: %', sqlerrm;
  end;
end;
$$;

-- =========================================================================
-- Scenario 4: active LINDEN member pays again -> extends exactly 30 days
-- from the EXISTING plus_current_period_end (not from now()), grants
-- exactly one more 500-Bit bonus, and creates exactly one new payment row.
-- =========================================================================
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_avatar_uuid text := gen_random_uuid()::text;
  v_reference text := 'test-linden-ref-' || gen_random_uuid()::text;
  v_period_end_before timestamptz := now() + interval '10 days';
  v_result jsonb;
  v_payment_count integer;
  v_balance integer;
  v_profile record;
  v_payment record;
begin
  begin
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'gridster-plus-linden-test+' || v_user_id || '@example.invalid',
      '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb,
      '', '', '', ''
    );

    insert into public.profiles (
      user_id, sl_avatar_uuid, sl_verified, sl_verified_at,
      is_plus, plus_status, plus_price_tier, plus_current_period_end
    ) values (
      v_user_id, v_avatar_uuid, true, now(),
      true, 'active', 'linden', v_period_end_before
    );

    insert into public.bling_balances (user_id, balance) values (v_user_id, 2000);

    v_result := public.credit_gridster_plus_linden_payment(
      v_avatar_uuid, 1750, v_reference, gen_random_uuid()::text, 500
    );

    if not (v_result->>'ok')::boolean then
      raise exception 'expected ok=true, got %', v_result;
    end if;

    if (v_result->>'duplicate')::boolean then
      raise exception 'expected duplicate=false, got %', v_result;
    end if;

    select * into v_profile from public.profiles where user_id = v_user_id;

    -- Exact equality is safe here (not a wall-clock tolerance check): both
    -- sides are deterministic interval arithmetic on the SAME fixed
    -- v_period_end_before value, not on now().
    if v_profile.plus_current_period_end is distinct from v_period_end_before + interval '30 days' then
      raise exception 'expected plus_current_period_end = % (existing + 30 days), got %',
        v_period_end_before + interval '30 days', v_profile.plus_current_period_end;
    end if;

    if v_profile.plus_price_tier is distinct from 'linden' or v_profile.is_plus is distinct from true then
      raise exception 'expected is_plus=true, plus_price_tier=linden, got is_plus=%, tier=%',
        v_profile.is_plus, v_profile.plus_price_tier;
    end if;

    select count(*) into v_payment_count
    from public.gridster_plus_linden_payments
    where user_id = v_user_id;

    if v_payment_count <> 1 then
      raise exception 'expected exactly 1 row in gridster_plus_linden_payments, found %', v_payment_count;
    end if;

    select * into v_payment from public.gridster_plus_linden_payments where user_id = v_user_id;

    if v_payment.plus_start is distinct from v_period_end_before
       or v_payment.plus_end is distinct from v_period_end_before + interval '30 days'
       or v_payment.bonus_amount <> 500
    then
      raise exception 'unexpected payment row: plus_start=%, plus_end=%, bonus_amount=%',
        v_payment.plus_start, v_payment.plus_end, v_payment.bonus_amount;
    end if;

    select balance into v_balance from public.bling_balances where user_id = v_user_id;

    if v_balance <> 2500 then
      raise exception 'expected Bling balance 2000 + 500 = 2500, got %', v_balance;
    end if;

    insert into linden_payment_test_results values ('4: active Linden member extends 30 days', 'PASS', null);
    raise notice 'PASS - Scenario 4: active Linden member extended by exactly 30 days from the existing period end, +500 Bling Bits granted once.';
  exception when others then
    insert into linden_payment_test_results values ('4: active Linden member extends 30 days', 'FAIL', sqlerrm);
    raise notice 'FAIL - Scenario 4: %', sqlerrm;
  end;
end;
$$;

-- =========================================================================
-- Scenario 5: expired LINDEN member pays again -> reactivates from
-- approximately now() + 30 days (not from the stale past period end).
-- Also confirms leftover Stripe identifiers from a past, unrelated Stripe
-- history are preserved untouched even on a path that DOES write to the
-- profile, not just on the rejection paths in scenarios 1-3.
-- =========================================================================
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_avatar_uuid text := gen_random_uuid()::text;
  v_reference text := 'test-linden-ref-' || gen_random_uuid()::text;
  v_period_end_before timestamptz := now() - interval '5 days';
  v_old_stripe_customer text := 'cus_test_fixture_stale_' || gen_random_uuid()::text;
  v_old_stripe_subscription text := 'sub_test_fixture_stale_' || gen_random_uuid()::text;
  v_call_started_at timestamptz;
  v_call_finished_at timestamptz;
  v_result jsonb;
  v_payment_count integer;
  v_balance integer;
  v_profile record;
begin
  begin
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'gridster-plus-linden-test+' || v_user_id || '@example.invalid',
      '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb,
      '', '', '', ''
    );

    -- is_plus = false: this member's Linden period has lapsed. The stale
    -- Stripe fields simulate someone who tried (and canceled) Stripe long
    -- ago, then separately bought Linden Plus - the Linden RPC must never
    -- touch these regardless of whether it rejects or credits.
    insert into public.profiles (
      user_id, sl_avatar_uuid, sl_verified, sl_verified_at,
      is_plus, plus_status, plus_price_tier, plus_current_period_end,
      stripe_customer_id, stripe_subscription_id
    ) values (
      v_user_id, v_avatar_uuid, true, now(),
      false, 'expired', 'linden', v_period_end_before,
      v_old_stripe_customer, v_old_stripe_subscription
    );

    insert into public.bling_balances (user_id, balance) values (v_user_id, 300);

    v_call_started_at := clock_timestamp();
    v_result := public.credit_gridster_plus_linden_payment(
      v_avatar_uuid, 1750, v_reference, gen_random_uuid()::text, 500
    );
    v_call_finished_at := clock_timestamp();

    if not (v_result->>'ok')::boolean then
      raise exception 'expected ok=true, got %', v_result;
    end if;

    if (v_result->>'duplicate')::boolean then
      raise exception 'expected duplicate=false, got %', v_result;
    end if;

    select * into v_profile from public.profiles where user_id = v_user_id;

    if v_profile.is_plus is distinct from true or v_profile.plus_status is distinct from 'active' then
      raise exception 'expected is_plus=true, plus_status=active, got is_plus=%, plus_status=%',
        v_profile.is_plus, v_profile.plus_status;
    end if;

    -- now() inside the function is evaluated at call time, a few
    -- milliseconds after v_call_started_at - use a wide-enough wall-clock
    -- window (clock_timestamp(), not now()/transaction snapshot time) so
    -- this is a meaningful "approximately" check, not a flaky one.
    if v_profile.plus_current_period_end < v_call_started_at + interval '30 days' - interval '10 seconds'
       or v_profile.plus_current_period_end > v_call_finished_at + interval '30 days' + interval '10 seconds'
    then
      raise exception 'expected plus_current_period_end approximately now() + 30 days (between % and %), got %',
        v_call_started_at + interval '30 days', v_call_finished_at + interval '30 days', v_profile.plus_current_period_end;
    end if;

    if v_profile.stripe_customer_id is distinct from v_old_stripe_customer
       or v_profile.stripe_subscription_id is distinct from v_old_stripe_subscription
    then
      raise exception 'expected stale Stripe identifiers preserved (customer=%, sub=%), got customer=%, sub=%',
        v_old_stripe_customer, v_old_stripe_subscription,
        v_profile.stripe_customer_id, v_profile.stripe_subscription_id;
    end if;

    select count(*) into v_payment_count
    from public.gridster_plus_linden_payments
    where user_id = v_user_id;

    if v_payment_count <> 1 then
      raise exception 'expected exactly 1 row in gridster_plus_linden_payments, found %', v_payment_count;
    end if;

    select balance into v_balance from public.bling_balances where user_id = v_user_id;

    if v_balance <> 800 then
      raise exception 'expected Bling balance 300 + 500 = 800, got %', v_balance;
    end if;

    insert into linden_payment_test_results values ('5: expired Linden member reactivates', 'PASS', null);
    raise notice 'PASS - Scenario 5: expired Linden member reactivated from approximately now() + 30 days, stale Stripe ids preserved, +500 Bling Bits granted once.';
  exception when others then
    insert into linden_payment_test_results values ('5: expired Linden member reactivates', 'FAIL', sqlerrm);
    raise notice 'FAIL - Scenario 5: %', sqlerrm;
  end;
end;
$$;

-- =========================================================================
-- Scenario 6: replaying the same payment_reference is treated as a
-- duplicate - no second extension, no second bonus, no second row.
-- =========================================================================
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_avatar_uuid text := gen_random_uuid()::text;
  v_reference text := 'test-linden-ref-' || gen_random_uuid()::text;
  v_object_uuid text := gen_random_uuid()::text;
  v_result_first jsonb;
  v_result_second jsonb;
  v_payment_count integer;
  v_balance integer;
  v_period_end_after_first timestamptz;
  v_profile record;
begin
  begin
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'gridster-plus-linden-test+' || v_user_id || '@example.invalid',
      '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb,
      '', '', '', ''
    );

    -- Fresh non-member: is_plus=false, no prior plus_price_tier at all.
    insert into public.profiles (
      user_id, sl_avatar_uuid, sl_verified, sl_verified_at,
      is_plus, plus_status
    ) values (
      v_user_id, v_avatar_uuid, true, now(),
      false, 'none'
    );

    insert into public.bling_balances (user_id, balance) values (v_user_id, 0);

    -- First call: same reference and object both times, simulating the
    -- kiosk script retrying its own earlier HTTP call for one money() event.
    v_result_first := public.credit_gridster_plus_linden_payment(
      v_avatar_uuid, 1750, v_reference, v_object_uuid, 500
    );

    if not (v_result_first->>'ok')::boolean or (v_result_first->>'duplicate')::boolean then
      raise exception 'expected first call ok=true, duplicate=false, got %', v_result_first;
    end if;

    select plus_current_period_end into v_period_end_after_first
    from public.profiles where user_id = v_user_id;

    -- Second call: identical payment_reference.
    v_result_second := public.credit_gridster_plus_linden_payment(
      v_avatar_uuid, 1750, v_reference, v_object_uuid, 500
    );

    if not (v_result_second->>'ok')::boolean then
      raise exception 'expected second call ok=true, got %', v_result_second;
    end if;

    if not (v_result_second->>'duplicate')::boolean then
      raise exception 'expected second call duplicate=true, got %', v_result_second;
    end if;

    select * into v_profile from public.profiles where user_id = v_user_id;

    if v_profile.plus_current_period_end is distinct from v_period_end_after_first then
      raise exception 'expected plus_current_period_end unchanged by the duplicate call (still %), got %',
        v_period_end_after_first, v_profile.plus_current_period_end;
    end if;

    select count(*) into v_payment_count
    from public.gridster_plus_linden_payments
    where user_id = v_user_id;

    if v_payment_count <> 1 then
      raise exception 'expected exactly 1 row in gridster_plus_linden_payments after two calls with the same reference, found %', v_payment_count;
    end if;

    select balance into v_balance from public.bling_balances where user_id = v_user_id;

    if v_balance <> 500 then
      raise exception 'expected Bling balance to receive the 500-Bit bonus exactly once (0 + 500 = 500), got %', v_balance;
    end if;

    insert into linden_payment_test_results values ('6: replayed payment_reference is a no-op duplicate', 'PASS', null);
    raise notice 'PASS - Scenario 6: replaying the same payment_reference did not re-extend the period or re-grant the bonus.';
  exception when others then
    insert into linden_payment_test_results values ('6: replayed payment_reference is a no-op duplicate', 'FAIL', sqlerrm);
    raise notice 'FAIL - Scenario 6: %', sqlerrm;
  end;
end;
$$;

-- =========================================================================
-- Final summary. Deliberately never raises an exception - only NOTICE or
-- WARNING - so the trailing ROLLBACK below always runs regardless of how
-- many scenarios failed.
-- =========================================================================
do $$
declare
  v_total integer;
  v_failed integer;
  v_failed_list text;
begin
  select count(*) into v_total from linden_payment_test_results;
  select count(*), string_agg(scenario, '; ' order by scenario)
    into v_failed, v_failed_list
    from linden_payment_test_results where status = 'FAIL';

  if v_failed > 0 then
    raise warning 'TEST SUMMARY: % of % scenario(s) FAILED: %', v_failed, v_total, v_failed_list;
  else
    raise notice 'TEST SUMMARY: all % scenario(s) PASSED.', v_total;
  end if;
end;
$$;

-- Plain SELECT of the same results, in addition to the NOTICE/WARNING
-- output above - some clients (e.g. `supabase db query`, which runs SQL
-- through the Management API rather than a real psql session) only surface
-- a query's final result rows, not server-side NOTICE/WARNING log output.
-- This is read-only and does not change anything about the ROLLBACK below.
select scenario, status, coalesce(detail, '') as detail
from linden_payment_test_results
order by scenario;

-- Unconditional: every fixture row created above (auth.users, profiles,
-- bling_balances, gridster_plus_linden_payments, and the temp results
-- table itself) is discarded here. No test data is meant to survive a run
-- of this script, whether every scenario passed or some of them failed.
rollback;
