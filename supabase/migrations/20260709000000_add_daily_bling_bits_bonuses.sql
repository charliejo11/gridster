-- =========================================================
-- Gridster Daily Bling Bits
-- Small engagement rewards: daily login, profile completion,
-- SL verification, and photo challenge participation.
-- =========================================================

create table if not exists public.gridster_bonus_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bonus_type text not null,
  claimed_at timestamptz not null default now(),

  constraint valid_bonus_type check (
    bonus_type in ('daily_login', 'profile_complete', 'sl_verified')
  ),
  constraint gridster_bonus_claims_unique unique (user_id, bonus_type)
);

comment on table public.gridster_bonus_claims is
  'Tracks which one-time or daily Bling Bits bonuses a user has already received, so claim RPCs never double-grant.';

alter table public.gridster_bonus_claims enable row level security;

drop policy if exists "Users can read their own bonus claims" on public.gridster_bonus_claims;

create policy "Users can read their own bonus claims"
on public.gridster_bonus_claims
for select
to authenticated
using (auth.uid() = user_id);

-- =========================
-- Daily login bonus (+50, once per calendar day)
-- =========================

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
  end if;

  return jsonb_build_object('ok', true, 'bonus_type', 'daily_login', 'granted', granted);
end;
$$;

-- =========================
-- Profile complete bonus (+200, once ever)
-- =========================

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
  end if;

  return jsonb_build_object('ok', true, 'bonus_type', 'profile_complete', 'granted', granted);
end;
$$;

-- =========================
-- SL verified bonus (+250, once ever)
-- =========================

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
  end if;

  return jsonb_build_object('ok', true, 'bonus_type', 'sl_verified', 'granted', granted);
end;
$$;

-- =========================
-- Photo entry bonus (+25 per submission, via trigger)
-- =========================

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

  return new;
end;
$$;

drop trigger if exists grant_photo_entry_bonus_trigger on public.gridster_photo_entries;

create trigger grant_photo_entry_bonus_trigger
after insert on public.gridster_photo_entries
for each row
execute function public.grant_photo_entry_bonus();
