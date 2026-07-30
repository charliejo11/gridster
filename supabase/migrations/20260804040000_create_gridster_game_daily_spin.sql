-- =========================================================
-- Gridster Games: Daily Spin.
--
-- One free spin per user per UTC calendar day; premium members
-- (profiles.is_plus, re-checked live server-side - never trusted from
-- the client) get one additional spin. Reward selection is a
-- server-side weighted random draw. gridster_game_spins is both the
-- auditable record AND the atomic claim gate in one table - the
-- unique (user_id, spin_date, spin_number) constraint is what makes
-- "no duplicate rewards on refresh/replay" true regardless of how many
-- times the client calls spin_daily() for a slot already spent today.
-- =========================================================

create table if not exists public.gridster_game_spin_rewards (
  id uuid primary key default gen_random_uuid(),
  reward_type text not null check (reward_type in ('bling_bits', 'cosmetic', 'badge', 'no_prize')),
  bling_bits_amount integer check (bling_bits_amount is null or bling_bits_amount > 0),
  cosmetic_item_id uuid references public.bling_items(id),
  weight integer not null check (weight > 0),
  is_active boolean not null default true,
  label text,
  constraint spin_reward_shape check (
    (reward_type = 'bling_bits' and bling_bits_amount is not null and cosmetic_item_id is null)
    or (reward_type in ('cosmetic', 'badge') and cosmetic_item_id is not null and bling_bits_amount is null)
    or (reward_type = 'no_prize' and bling_bits_amount is null and cosmetic_item_id is null)
  )
);

alter table public.gridster_game_spin_rewards enable row level security;

drop policy if exists "Active spin rewards are publicly readable" on public.gridster_game_spin_rewards;
create policy "Active spin rewards are publicly readable"
on public.gridster_game_spin_rewards
for select
using (is_active = true);

drop policy if exists "Admins can write spin rewards" on public.gridster_game_spin_rewards;
create policy "Admins can write spin rewards"
on public.gridster_game_spin_rewards
for all
to authenticated
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

create table if not exists public.gridster_game_spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spin_date date not null default ((now() at time zone 'utc')::date),
  spin_number smallint not null check (spin_number in (1, 2)),
  reward_id uuid references public.gridster_game_spin_rewards(id),
  reward_type text not null,
  bling_bits_amount integer,
  cosmetic_item_id uuid references public.bling_items(id),
  created_at timestamptz not null default now(),
  constraint gridster_game_spins_unique unique (user_id, spin_date, spin_number)
);

create index if not exists gridster_game_spins_user_idx on public.gridster_game_spins (user_id, spin_date);

alter table public.gridster_game_spins enable row level security;

drop policy if exists "Users can view their own spins" on public.gridster_game_spins;
create policy "Users can view their own spins"
on public.gridster_game_spins
for select
to authenticated
using (auth.uid() = user_id);
-- No write policy - only spin_daily() writes here.

-- Seed a starter reward pool. Tune weights/items later via the
-- admin-write policy above - not a blocker for MVP.
grant select on public.gridster_game_spin_rewards to anon, authenticated;
grant insert, update, delete on public.gridster_game_spin_rewards to authenticated;
grant select on public.gridster_game_spins to authenticated;

insert into public.gridster_game_spin_rewards (reward_type, bling_bits_amount, weight, label) values
  ('bling_bits', 25, 35, 'Small Bling Bits win'),
  ('bling_bits', 50, 20, 'Medium Bling Bits win'),
  ('bling_bits', 100, 8, 'Big Bling Bits win'),
  ('no_prize', null, 30, 'No prize this time')
on conflict do nothing;

create or replace function public.spin_daily(is_bonus_spin boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  is_premium boolean;
  target_spin_number smallint;
  today_utc date;
  rate_limited boolean;
  selected_reward_id uuid;
  selected_reward_type text;
  selected_bling_amount integer;
  selected_cosmetic_id uuid;
  inserted_id uuid;
  existing_spin public.gridster_game_spins;
  new_balance integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  today_utc := (now() at time zone 'utc')::date;
  target_spin_number := case when is_bonus_spin then 2 else 1 end;

  if target_spin_number = 2 then
    select coalesce(is_plus, false) into is_premium from public.profiles where user_id = current_user_id;

    if not coalesce(is_premium, false) then
      raise exception 'A Gridster Plus membership is required for the bonus spin';
    end if;
  end if;

  rate_limited := public.check_game_rate_limit(current_user_id, 'spin_attempt', today_utc::text, 60, 20);

  if rate_limited then
    raise exception 'Too many spin attempts - please slow down';
  end if;

  -- ATOMIC GATE: weighted reward selection happens BEFORE the insert
  -- attempt, but nothing is granted until the insert actually takes.
  -- If this slot is already spent (conflict), we throw the draw away
  -- and return the ALREADY-STORED reward instead - never a reroll.
  with weighted as (
    select id, reward_type, bling_bits_amount, cosmetic_item_id,
           sum(weight) over (order by id) as cumulative_weight,
           sum(weight) over () as total_weight
    from public.gridster_game_spin_rewards
    where is_active = true
  )
  select id, reward_type, bling_bits_amount, cosmetic_item_id
  into selected_reward_id, selected_reward_type, selected_bling_amount, selected_cosmetic_id
  from weighted
  where cumulative_weight >= (random() * total_weight)
  order by cumulative_weight asc
  limit 1;

  if selected_reward_type is null then
    raise exception 'No active spin rewards configured';
  end if;

  insert into public.gridster_game_spins (user_id, spin_date, spin_number, reward_id, reward_type, bling_bits_amount, cosmetic_item_id)
  values (current_user_id, today_utc, target_spin_number, selected_reward_id, selected_reward_type, selected_bling_amount, selected_cosmetic_id)
  on conflict (user_id, spin_date, spin_number) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    select * into existing_spin
    from public.gridster_game_spins
    where user_id = current_user_id and spin_date = today_utc and spin_number = target_spin_number;

    return jsonb_build_object(
      'ok', true, 'already_spun', true,
      'reward_type', existing_spin.reward_type,
      'bling_bits_amount', existing_spin.bling_bits_amount,
      'cosmetic_item_id', existing_spin.cosmetic_item_id
    );
  end if;

  if selected_reward_type = 'bling_bits' then
    insert into public.bling_balances (user_id, balance) values (current_user_id, 1250) on conflict (user_id) do nothing;

    update public.bling_balances
    set balance = balance + selected_bling_amount
    where user_id = current_user_id
    returning balance into new_balance;
  elsif selected_reward_type in ('cosmetic', 'badge') then
    insert into public.bling_purchases (user_id, item_id, source)
    values (current_user_id, selected_cosmetic_id, 'game_spin')
    on conflict (user_id, item_id) do nothing;
  end if;

  insert into public.gridster_game_profiles (user_id) values (current_user_id) on conflict (user_id) do nothing;
  update public.gridster_game_profiles set spins_total = spins_total + 1 where user_id = current_user_id;

  perform public.grant_game_xp(current_user_id, 10, 'daily_spin');
  perform public.check_and_grant_game_achievements(current_user_id);

  perform public.create_or_group_notification(
    p_recipient_user_id => current_user_id,
    p_actor_user_id => null,
    p_notification_type => 'game_spin_reward',
    p_amount => selected_bling_amount,
    p_title => 'Daily Spin result',
    p_related_transaction_id => inserted_id
  );

  return jsonb_build_object(
    'ok', true, 'already_spun', false,
    'reward_type', selected_reward_type,
    'bling_bits_amount', selected_bling_amount,
    'cosmetic_item_id', selected_cosmetic_id,
    'balance', new_balance
  );
end;
$$;
