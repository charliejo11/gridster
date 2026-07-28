-- =========================================================
-- Wire notifications into every existing Bling Bits grant and
-- Bling Depot purchase path. Each function body below is otherwise
-- byte-for-byte identical to its prior version - only a
-- create_or_group_notification() call was added on the success path.
-- actor_user_id is always null here: these are all system/Gridster
-- grants, not another resident's action.
-- =========================================================

create or replace function public.claim_daily_login_bonus()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  last_claimed_at timestamptz;
  granted boolean := false;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select claimed_at
  into last_claimed_at
  from public.gridster_bonus_claims
  where user_id = current_user_id and bonus_type = 'daily_login';

  if last_claimed_at is null or last_claimed_at::date < current_date then
    insert into public.bling_balances (user_id, balance)
    values (current_user_id, 1250)
    on conflict (user_id) do nothing;

    update public.bling_balances
    set balance = balance + 50
    where user_id = current_user_id;

    insert into public.gridster_bonus_claims (user_id, bonus_type, claimed_at)
    values (current_user_id, 'daily_login', now())
    on conflict (user_id, bonus_type) do update set claimed_at = now();

    granted := true;

    perform public.create_or_group_notification(
      p_recipient_user_id => current_user_id,
      p_actor_user_id => null,
      p_notification_type => 'bling_bits_bonus',
      p_amount => 50,
      p_title => 'Daily login bonus'
    );
  end if;

  return jsonb_build_object('ok', true, 'bonus_type', 'daily_login', 'granted', granted);
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
  already_claimed boolean;
  granted boolean := false;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into profile_record
  from public.profiles
  where user_id = current_user_id;

  select exists (
    select 1 from public.gridster_bonus_claims
    where user_id = current_user_id and bonus_type = 'profile_complete'
  )
  into already_claimed;

  if not already_claimed
    and coalesce(length(trim(profile_record.display_name)), 0) > 0
    and coalesce(length(trim(profile_record.sl_username)), 0) > 0
    and coalesce(length(trim(profile_record.bio)), 0) > 0
  then
    insert into public.bling_balances (user_id, balance)
    values (current_user_id, 1250)
    on conflict (user_id) do nothing;

    update public.bling_balances
    set balance = balance + 200
    where user_id = current_user_id;

    insert into public.gridster_bonus_claims (user_id, bonus_type)
    values (current_user_id, 'profile_complete')
    on conflict (user_id, bonus_type) do nothing;

    granted := true;

    perform public.create_or_group_notification(
      p_recipient_user_id => current_user_id,
      p_actor_user_id => null,
      p_notification_type => 'bling_bits_bonus',
      p_amount => 200,
      p_title => 'Profile completed bonus'
    );
  end if;

  return jsonb_build_object('ok', true, 'bonus_type', 'profile_complete', 'granted', granted);
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
  already_claimed boolean;
  granted boolean := false;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(sl_verified, false)
  into is_verified
  from public.profiles
  where user_id = current_user_id;

  select exists (
    select 1 from public.gridster_bonus_claims
    where user_id = current_user_id and bonus_type = 'sl_verified'
  )
  into already_claimed;

  if coalesce(is_verified, false) and not already_claimed then
    insert into public.bling_balances (user_id, balance)
    values (current_user_id, 1250)
    on conflict (user_id) do nothing;

    update public.bling_balances
    set balance = balance + 250
    where user_id = current_user_id;

    insert into public.gridster_bonus_claims (user_id, bonus_type)
    values (current_user_id, 'sl_verified')
    on conflict (user_id, bonus_type) do nothing;

    granted := true;

    perform public.create_or_group_notification(
      p_recipient_user_id => current_user_id,
      p_actor_user_id => null,
      p_notification_type => 'bling_bits_bonus',
      p_amount => 250,
      p_title => 'Second Life verification bonus'
    );
  end if;

  return jsonb_build_object('ok', true, 'bonus_type', 'sl_verified', 'granted', granted);
end;
$$;

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

create or replace function public.buy_bling_item(target_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  item_record public.bling_items;
  balance_record public.bling_balances;
  already_owned boolean;
  new_balance integer;
  purchase_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into item_record
  from public.bling_items
  where id = target_item_id
  and is_active = true;

  if item_record.id is null then
    raise exception 'Item not found';
  end if;

  insert into public.bling_balances (user_id, balance)
  values (current_user_id, 1250)
  on conflict (user_id)
  do nothing;

  select *
  into balance_record
  from public.bling_balances
  where user_id = current_user_id
  for update;

  select exists (
    select 1
    from public.bling_purchases
    where user_id = current_user_id
    and item_id = target_item_id
  )
  into already_owned;

  if already_owned then
    return jsonb_build_object(
      'ok', true,
      'already_owned', true,
      'balance', balance_record.balance
    );
  end if;

  if balance_record.balance < item_record.price then
    raise exception 'Not enough Bling Bits';
  end if;

  new_balance := balance_record.balance - item_record.price;

  update public.bling_balances
  set balance = new_balance
  where user_id = current_user_id;

  insert into public.bling_purchases (user_id, item_id)
  values (current_user_id, target_item_id)
  returning id into purchase_id;

  perform public.create_or_group_notification(
    p_recipient_user_id => current_user_id,
    p_actor_user_id => null,
    p_notification_type => 'bling_bits_purchase',
    p_related_transaction_id => purchase_id,
    p_amount => item_record.price,
    p_title => item_record.name
  );

  return jsonb_build_object(
    'ok', true,
    'already_owned', false,
    'balance', new_balance,
    'item_id', target_item_id
  );
end;
$$;

create or replace function public.admin_refund_boost(
  target_boost_id uuid,
  target_reason text default 'Admin refund'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin_user boolean;
  boost_record public.post_boosts;
  balance_record public.bling_balances;
  new_balance integer;
begin
  select coalesce(is_admin, false) into is_admin_user
  from public.profiles
  where user_id = auth.uid();

  if not coalesce(is_admin_user, false) then
    raise exception 'Admin access required';
  end if;

  select * into boost_record from public.post_boosts where id = target_boost_id for update;

  if boost_record.id is null then
    raise exception 'Boost not found';
  end if;

  if boost_record.status = 'refunded' then
    return jsonb_build_object('ok', true, 'already_refunded', true);
  end if;

  insert into public.bling_balances (user_id, balance)
  values (boost_record.user_id, 1250)
  on conflict (user_id) do nothing;

  select * into balance_record
  from public.bling_balances
  where user_id = boost_record.user_id
  for update;

  new_balance := balance_record.balance + boost_record.bits_spent;

  update public.bling_balances
  set balance = new_balance
  where user_id = boost_record.user_id;

  insert into public.bling_transactions
    (user_id, amount, reason, reference_type, reference_id, balance_after)
  values
    (boost_record.user_id, boost_record.bits_spent, coalesce(target_reason, 'Admin refund'), 'post_boost_refund', boost_record.id, new_balance);

  update public.post_boosts
  set status = 'refunded'
  where id = target_boost_id;

  perform public.create_or_group_notification(
    p_recipient_user_id => boost_record.user_id,
    p_actor_user_id => null,
    p_notification_type => 'bling_bits_bonus',
    p_related_transaction_id => boost_record.id,
    p_amount => boost_record.bits_spent,
    p_title => 'Boost refunded'
  );

  return jsonb_build_object('ok', true, 'balance', new_balance);
end;
$$;

create or replace function public.credit_gridster_plus_linden_payment(
  target_sl_avatar_uuid text,
  target_amount_linden integer,
  target_payment_reference text,
  target_object_uuid text,
  target_bonus_amount integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile record;
  inserted_id uuid;
  computed_start timestamptz;
  computed_end timestamptz;
  new_balance integer;
begin
  -- `for update` locks this profile row for the rest of the transaction.
  -- Any concurrent writer to the same row - in practice, the Stripe webhook's
  -- `update public.profiles ... where user_id = ...` in stripe-webhook.js -
  -- blocks until this function commits or rolls back, and then re-reads the
  -- row it just wrote. That is what makes the Stripe-tier check below and
  -- the crediting further down a single atomic unit: there is no window
  -- between "check" and "write" for a webhook to land in.
  select user_id, is_plus, plus_price_tier, plus_current_period_end
  into target_profile
  from public.profiles
  where sl_avatar_uuid = target_sl_avatar_uuid
    and sl_verified = true
  limit 1
  for update;

  if target_profile.user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'unlinked_avatar');
  end if;

  -- Stripe and Linden Plus are mutually exclusive. An active Stripe-billed
  -- member (monthly/annual/founding) cannot also buy Linden Plus - the kiosk
  -- payment is rejected and refunded instead of stacking a second, competing
  -- expiry clock on top of the Stripe subscription. A lapsed/canceled Stripe
  -- member (is_plus = false) is not blocked here - they fall through to the
  -- normal activate/extend path below like any other non-member.
  if target_profile.is_plus and target_profile.plus_price_tier in ('monthly', 'annual', 'founding') then
    return jsonb_build_object(
      'ok', false,
      'reason', 'active_stripe_subscription',
      'current_tier', target_profile.plus_price_tier
    );
  end if;

  computed_start := greatest(now(), coalesce(target_profile.plus_current_period_end, now()));
  computed_end := computed_start + interval '30 days';

  insert into public.gridster_plus_linden_payments (
    sl_avatar_uuid,
    user_id,
    amount_linden,
    payment_reference,
    object_uuid,
    plus_start,
    plus_end,
    bonus_amount
  )
  values (
    target_sl_avatar_uuid,
    target_profile.user_id,
    target_amount_linden,
    target_payment_reference,
    target_object_uuid,
    computed_start,
    computed_end,
    target_bonus_amount
  )
  on conflict (payment_reference) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return jsonb_build_object('ok', true, 'duplicate', true, 'user_id', target_profile.user_id);
  end if;

  update public.profiles
  set is_plus = true,
      plus_status = 'active',
      plus_price_tier = 'linden',
      plus_current_period_end = computed_end
  where user_id = target_profile.user_id;

  insert into public.bling_balances (user_id, balance)
  values (target_profile.user_id, 1250)
  on conflict (user_id) do nothing;

  update public.bling_balances
  set balance = balance + target_bonus_amount
  where user_id = target_profile.user_id
  returning balance into new_balance;

  perform public.create_or_group_notification(
    p_recipient_user_id => target_profile.user_id,
    p_actor_user_id => null,
    p_notification_type => 'bling_bits_bonus',
    p_related_transaction_id => inserted_id,
    p_amount => target_bonus_amount,
    p_title => 'Gridster Plus activated'
  );

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'user_id', target_profile.user_id,
    'plus_current_period_end', computed_end,
    'balance', new_balance
  );
end;
$$;

create or replace function public.grant_plus_monthly_bonus(
  target_user_id uuid,
  invoice_id text,
  bonus_amount integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
  new_balance integer;
begin
  insert into public.gridster_plus_bonus_claims (user_id, stripe_invoice_id, bonus_amount)
  values (target_user_id, invoice_id, bonus_amount)
  on conflict (stripe_invoice_id) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return jsonb_build_object('ok', true, 'granted', false, 'reason', 'already_claimed');
  end if;

  insert into public.bling_balances (user_id, balance)
  values (target_user_id, 1250)
  on conflict (user_id) do nothing;

  update public.bling_balances
  set balance = balance + bonus_amount
  where user_id = target_user_id
  returning balance into new_balance;

  perform public.create_or_group_notification(
    p_recipient_user_id => target_user_id,
    p_actor_user_id => null,
    p_notification_type => 'bling_bits_bonus',
    p_related_transaction_id => inserted_id,
    p_amount => bonus_amount,
    p_title => 'Gridster Plus monthly bonus'
  );

  return jsonb_build_object('ok', true, 'granted', true, 'balance', new_balance);
end;
$$;
