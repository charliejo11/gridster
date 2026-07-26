-- =========================================================
-- Gridster Plus founding member tier
-- Tracks which billing tier a subscriber is on (monthly,
-- annual, or founding) so the $3.99/mo founding rate can be
-- capped and grandfathered in even after the public price
-- changes. Cap enforcement itself lives in the Worker
-- (counts plus_price_tier = 'founding' before checkout).
-- =========================================================

alter table public.profiles
add column if not exists plus_price_tier text;

comment on column public.profiles.plus_price_tier is
  'Which Gridster Plus billing tier the subscriber is on: monthly, annual, or founding. Not settable by users themselves - only changeable by the Worker service role via the Stripe webhook.';

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
  );
