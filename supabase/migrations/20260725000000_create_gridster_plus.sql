-- =========================================================
-- Gridster Plus
-- Paid subscription (Stripe) that unlocks a profile glow,
-- a premium crown badge, and a monthly Bling Bits bonus.
-- Subscription state is only ever written by the Cloudflare
-- Worker (service role, via Stripe webhook), never by the
-- client, mirroring the existing is_admin lockdown pattern.
-- =========================================================

alter table public.profiles
add column if not exists is_plus boolean not null default false;

alter table public.profiles
add column if not exists plus_status text not null default 'none';

alter table public.profiles
add column if not exists plus_current_period_end timestamptz;

alter table public.profiles
add column if not exists stripe_customer_id text;

alter table public.profiles
add column if not exists stripe_subscription_id text;

create unique index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists profiles_stripe_subscription_id_idx
  on public.profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

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
  );

comment on column public.profiles.is_plus is
  'Gridster Plus membership flag. Not settable by users themselves - only changeable by the Cloudflare Worker service role via the Stripe webhook, enforced by the update RLS policy.';
comment on column public.profiles.plus_status is
  'Mirrors the Stripe subscription status (none, active, trialing, past_due, canceled) for display purposes.';
comment on column public.profiles.plus_current_period_end is
  'Stripe subscription current_period_end. Used to show renewal/expiry date in the UI.';
comment on column public.profiles.stripe_customer_id is
  'Stripe Customer id for this user. Written once by the Worker on first checkout.';
comment on column public.profiles.stripe_subscription_id is
  'Stripe Subscription id for this user''s active Gridster Plus subscription, if any.';

-- =========================
-- Monthly Plus Bling Bits bonus, granted per paid Stripe
-- invoice. Keyed by invoice id so retried webhook deliveries
-- never double-credit.
-- =========================

create table if not exists public.gridster_plus_bonus_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_invoice_id text not null unique,
  bonus_amount integer not null,
  claimed_at timestamptz not null default now()
);

comment on table public.gridster_plus_bonus_claims is
  'One row per Stripe invoice that has already granted its Gridster Plus monthly Bling Bits bonus, so webhook retries never double-credit.';

alter table public.gridster_plus_bonus_claims enable row level security;

drop policy if exists "Users can read their own plus bonus claims" on public.gridster_plus_bonus_claims;

create policy "Users can read their own plus bonus claims"
on public.gridster_plus_bonus_claims
for select
to authenticated
using (auth.uid() = user_id);

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

  return jsonb_build_object('ok', true, 'granted', true, 'balance', new_balance);
end;
$$;

comment on function public.grant_plus_monthly_bonus is
  'Called by the Worker service role from the Stripe invoice.paid webhook handler. Idempotent per stripe_invoice_id.';
