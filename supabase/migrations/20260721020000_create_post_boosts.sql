-- =========================================================
-- Bling Bits post boosting
--
-- Paid visibility, not paid popularity: this migration adds the
-- boost packages, the boost record itself, a Bling Bits transaction
-- ledger (none existed before this), and boost-performance analytics.
-- None of this feeds the organic Trending score - that is computed
-- separately from public.gridster_post_engagement_stats (see the
-- previous migration). Every balance mutation goes through a
-- security definer RPC using the same select-for-update + reject
-- pattern as the existing buy_bling_item function, so a purchase can
-- never deduct bits without creating the boost (and vice versa).
-- =========================================================

-- ---------------------------------------------------------
-- 1. Boost packages (server-authoritative price/duration - the
--    client never supplies a price, it only supplies a slug).
-- ---------------------------------------------------------

create table if not exists public.boost_packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  bits_cost integer not null,
  duration_hours integer,
  placement_type text not null,
  grants_spotlight boolean not null default false,
  feed_weight integer not null default 1,
  default_impression_limit integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_boost_package_placement
    check (placement_type in ('feed', 'spotlight', 'event_push')),
  constraint valid_boost_package_cost check (bits_cost > 0),
  constraint valid_boost_package_duration check (duration_hours is null or duration_hours > 0)
);

comment on table public.boost_packages is
  'Single source of truth for boost pricing/duration. duration_hours is null only for event_push, whose end time is the linked event''s starts_at instead of a fixed duration.';
comment on column public.boost_packages.feed_weight is
  'Relative feed-insertion frequency weight (higher = picked more often when interleaving boosted slots). Not a Trending input.';

drop trigger if exists set_boost_packages_updated_at on public.boost_packages;
create trigger set_boost_packages_updated_at
before update on public.boost_packages
for each row
execute function public.set_updated_at();

insert into public.boost_packages
  (slug, name, description, bits_cost, duration_hours, placement_type, grants_spotlight, feed_weight, default_impression_limit)
values
  ('small_boost', 'Small Boost', 'Extra feed reach for a few hours.', 100, 6, 'feed', false, 1, 2000),
  ('standard_boost', 'Standard Boost', 'Increased feed reach for a full day.', 250, 24, 'feed', false, 2, 6000),
  ('spotlight_boost', 'Spotlight Boost', 'Feed placement plus Boosted spotlight/sidebar eligibility for a full day.', 500, 24, 'spotlight', true, 3, 12000),
  ('event_push', 'Event Push', 'Promotes an approved, upcoming event post until the event begins.', 350, null, 'event_push', false, 2, 8000)
on conflict (slug) do nothing;

alter table public.boost_packages enable row level security;

drop policy if exists "Anyone can view active boost packages" on public.boost_packages;
create policy "Anyone can view active boost packages"
on public.boost_packages
for select
using (is_active = true);

drop policy if exists "Admins can view all boost packages" on public.boost_packages;
create policy "Admins can view all boost packages"
on public.boost_packages
for select
to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);

drop policy if exists "Admins can manage boost packages" on public.boost_packages;
create policy "Admins can manage boost packages"
on public.boost_packages
for all
to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
)
with check (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);

-- ---------------------------------------------------------
-- 2. Boost limits (singleton config row - anti-gaming knobs an
--    admin can tune without a new migration).
-- ---------------------------------------------------------

create table if not exists public.boost_limits (
  id boolean primary key default true,
  max_active_per_account integer not null default 3,
  max_active_per_post integer not null default 1,
  cooldown_hours_same_post integer not null default 24,
  max_post_age_days_for_boost integer not null default 14,
  max_promoted_per_creator_per_feed_window integer not null default 1,
  impression_dedup_minutes integer not null default 15,
  updated_at timestamptz not null default now(),

  constraint boost_limits_singleton check (id)
);

comment on table public.boost_limits is
  'Singleton anti-gaming configuration for post boosting. max_promoted_per_creator_per_feed_window is enforced client-side by the feed interleaving logic, not by SQL.';
comment on column public.boost_limits.impression_dedup_minutes is
  'Rolling window record_boost_event uses to skip a repeated impression/click from the same signed-in viewer for the same boost.';

insert into public.boost_limits (id) values (true) on conflict (id) do nothing;

drop trigger if exists set_boost_limits_updated_at on public.boost_limits;
create trigger set_boost_limits_updated_at
before update on public.boost_limits
for each row
execute function public.set_updated_at();

alter table public.boost_limits enable row level security;

drop policy if exists "Admins can view boost limits" on public.boost_limits;
create policy "Admins can view boost limits"
on public.boost_limits
for select
to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);

drop policy if exists "Admins can update boost limits" on public.boost_limits;
create policy "Admins can update boost limits"
on public.boost_limits
for update
to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
)
with check (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);

-- ---------------------------------------------------------
-- 3. Bling Bits transaction ledger (none existed before this -
--    scoped to boost purchases/refunds; existing purchase flows
--    like buy_bling_item are left untouched).
-- ---------------------------------------------------------

create table if not exists public.bling_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  reference_type text,
  reference_id uuid,
  balance_after integer not null,
  created_at timestamptz not null default now()
);

create index if not exists bling_transactions_user_id_idx
  on public.bling_transactions (user_id, created_at desc);

comment on table public.bling_transactions is
  'Bling Bits ledger for boost spend/refunds. Written exclusively by security definer RPCs (purchase_post_boost, admin_refund_boost) - there is no insert policy, so a client can never write or forge a ledger entry.';

alter table public.bling_transactions enable row level security;

drop policy if exists "Users can view their own transactions" on public.bling_transactions;
create policy "Users can view their own transactions"
on public.bling_transactions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can view all transactions" on public.bling_transactions;
create policy "Admins can view all transactions"
on public.bling_transactions
for select
to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);

-- ---------------------------------------------------------
-- 4. Post boosts
-- ---------------------------------------------------------

create table if not exists public.post_boosts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.gridster_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id uuid not null references public.boost_packages(id),
  package_type text not null,
  bits_spent integer not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active',
  impression_limit integer,
  impressions_used integer not null default 0,
  placement_type text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_post_boost_status
    check (status in ('pending', 'active', 'completed', 'cancelled', 'refunded')),
  constraint valid_post_boost_placement
    check (placement_type in ('feed', 'spotlight', 'event_push')),
  constraint valid_post_boost_bits_spent check (bits_spent > 0),
  constraint valid_post_boost_dates check (ends_at > starts_at),
  constraint post_boosts_idempotency_unique unique (user_id, idempotency_key)
);

create index if not exists post_boosts_post_id_idx on public.post_boosts (post_id);
create index if not exists post_boosts_user_id_idx on public.post_boosts (user_id);
create index if not exists post_boosts_status_window_idx on public.post_boosts (status, starts_at, ends_at);

comment on table public.post_boosts is
  'A single paid boost on a post. package_type/bits_spent/placement_type are a snapshot taken at purchase time so historical rows stay meaningful even if boost_packages changes later.';

drop trigger if exists set_post_boosts_updated_at on public.post_boosts;
create trigger set_post_boosts_updated_at
before update on public.post_boosts
for each row
execute function public.set_updated_at();

alter table public.post_boosts enable row level security;

-- Owners can see their own boosts in full (dashboard). No client
-- insert/update/delete policy exists here at all - every mutation
-- happens through purchase_post_boost / record_boost_event /
-- admin_refund_boost / admin_cancel_boost, all security definer.
drop policy if exists "Users can view their own boosts" on public.post_boosts;
create policy "Users can view their own boosts"
on public.post_boosts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can view all boosts" on public.post_boosts;
create policy "Admins can view all boosts"
on public.post_boosts
for select
to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);

-- Public-safe projection: only the columns needed to label a post as
-- Boosted / decide feed and spotlight eligibility. Deliberately
-- excludes user_id, bits_spent, impression_limit, impressions_used,
-- idempotency_key - a viewer never needs those to see "Boosted".
create or replace view public.active_post_boosts as
select
  pb.id as boost_id,
  pb.post_id,
  pb.package_type,
  pb.placement_type,
  pb.starts_at,
  pb.ends_at
from public.post_boosts pb
where pb.status = 'active'
  and pb.starts_at <= now()
  and pb.ends_at > now()
  and pb.impressions_used < coalesce(pb.impression_limit, pb.impressions_used + 1);

comment on view public.active_post_boosts is
  'Public read surface for "which posts are currently boosted" (feed labeling, spotlight widget, eligibility). Expiry is expressed as a live WHERE clause here rather than a cron job, so a lapsed boost stops appearing immediately without any batch process.';

-- ---------------------------------------------------------
-- 5. Boost performance events (creator dashboard analytics only -
--    distinct from the organic gridster_post_* engagement tables,
--    which never know about boosts at all).
-- ---------------------------------------------------------

create table if not exists public.gridster_boost_events (
  id uuid primary key default gen_random_uuid(),
  boost_id uuid not null references public.post_boosts(id) on delete cascade,
  post_id uuid not null references public.gridster_posts(id) on delete cascade,
  viewer_user_id uuid references auth.users(id) on delete set null,
  placement text,
  event_type text not null,
  occurred_at timestamptz not null default now(),

  constraint valid_boost_event_type
    check (event_type in ('impression', 'click', 'profile_click', 'teleport_click'))
);

create index if not exists gridster_boost_events_boost_id_idx
  on public.gridster_boost_events (boost_id, event_type, occurred_at);

comment on table public.gridster_boost_events is
  'Boost impression/click analytics for the creator dashboard. No insert policy exists - every row is written by record_boost_event (security definer), which also owns dedup and the impressions_used counter, so a client can never increment its own impression counter directly.';

alter table public.gridster_boost_events enable row level security;

drop policy if exists "Boost owners and admins can view boost events" on public.gridster_boost_events;
create policy "Boost owners and admins can view boost events"
on public.gridster_boost_events
for select
to authenticated
using (
  exists (select 1 from public.post_boosts pb where pb.id = boost_id and pb.user_id = auth.uid())
  or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);

-- ---------------------------------------------------------
-- 6. purchase_post_boost - the atomic purchase.
--
-- Row locks on gridster_posts then bling_balances serialize
-- concurrent attempts on the same post and the same account, so the
-- per-post / per-account limit checks below can't be raced by a
-- double-click or two tabs. The idempotency_key short-circuit
-- additionally guards against a retried network request re-charging
-- an already-processed purchase.
-- ---------------------------------------------------------

create or replace function public.purchase_post_boost(
  target_post_id uuid,
  target_package_slug text,
  target_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  post_record public.gridster_posts;
  package_record public.boost_packages;
  limits_record public.boost_limits;
  event_record public.gridster_events;
  balance_record public.bling_balances;
  existing_boost public.post_boosts;
  account_status_value text;
  active_count integer;
  last_boost_ended_at timestamptz;
  computed_starts_at timestamptz := now();
  computed_ends_at timestamptz;
  new_balance integer;
  new_boost public.post_boosts;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if target_idempotency_key is null or length(trim(target_idempotency_key)) = 0 then
    raise exception 'Missing idempotency key';
  end if;

  select * into existing_boost
  from public.post_boosts
  where user_id = current_user_id and idempotency_key = target_idempotency_key;

  if existing_boost.id is not null then
    select balance into new_balance from public.bling_balances where user_id = current_user_id;

    return jsonb_build_object(
      'ok', true,
      'already_processed', true,
      'boost_id', existing_boost.id,
      'balance', new_balance
    );
  end if;

  select * into post_record
  from public.gridster_posts
  where id = target_post_id
  for update;

  if post_record.id is null then
    raise exception 'Post not found';
  end if;

  if post_record.user_id <> current_user_id then
    raise exception 'You can only boost your own posts';
  end if;

  if not post_record.is_public then
    raise exception 'Only public posts can be boosted';
  end if;

  if post_record.is_deleted then
    raise exception 'This post has been deleted';
  end if;

  if post_record.moderation_status <> 'clear' then
    raise exception 'This post is not eligible for boosting';
  end if;

  select account_status into account_status_value
  from public.profiles
  where user_id = current_user_id;

  if coalesce(account_status_value, 'good_standing') <> 'good_standing' then
    raise exception 'Your account is not in good standing and cannot boost posts right now';
  end if;

  select * into limits_record from public.boost_limits where id = true;

  if post_record.created_at < now() - (limits_record.max_post_age_days_for_boost * interval '1 day') then
    raise exception 'This post is too old to boost';
  end if;

  select *
  into package_record
  from public.boost_packages
  where slug = target_package_slug
  and is_active = true;

  if package_record.id is null then
    raise exception 'Boost package not found';
  end if;

  if package_record.placement_type = 'event_push' then
    if post_record.post_type <> 'event' or post_record.linked_event_id is null then
      raise exception 'Event Push is only available for posts linked to an approved, upcoming event';
    end if;

    select * into event_record
    from public.gridster_events
    where id = post_record.linked_event_id;

    if event_record.id is null or not event_record.is_approved then
      raise exception 'The linked event has not been approved for promotion';
    end if;

    if event_record.starts_at is null or event_record.starts_at <= now() then
      raise exception 'The linked event must be upcoming to use Event Push';
    end if;

    computed_ends_at := event_record.starts_at;
  else
    computed_ends_at := computed_starts_at + (package_record.duration_hours * interval '1 hour');
  end if;

  -- Balance row lock also serializes concurrent purchases by this
  -- account, so the active-boost-per-account count below is safe.
  insert into public.bling_balances (user_id, balance)
  values (current_user_id, 1250)
  on conflict (user_id) do nothing;

  select * into balance_record
  from public.bling_balances
  where user_id = current_user_id
  for update;

  select count(*) into active_count
  from public.post_boosts
  where user_id = current_user_id
    and status = 'active'
    and ends_at > now();

  if active_count >= limits_record.max_active_per_account then
    raise exception 'You already have the maximum number of active boosts (%). Wait for one to finish before starting another.', limits_record.max_active_per_account;
  end if;

  select count(*) into active_count
  from public.post_boosts
  where post_id = target_post_id
    and status = 'active'
    and ends_at > now();

  if active_count >= limits_record.max_active_per_post then
    raise exception 'This post already has an active boost';
  end if;

  select max(ends_at) into last_boost_ended_at
  from public.post_boosts
  where post_id = target_post_id
    and status in ('active', 'completed');

  if last_boost_ended_at is not null
     and last_boost_ended_at + (limits_record.cooldown_hours_same_post * interval '1 hour') > now() then
    raise exception 'This post is on cooldown before it can be boosted again';
  end if;

  if balance_record.balance < package_record.bits_cost then
    raise exception 'Not enough Bling Bits for this boost';
  end if;

  new_balance := balance_record.balance - package_record.bits_cost;

  update public.bling_balances
  set balance = new_balance
  where user_id = current_user_id;

  insert into public.bling_transactions
    (user_id, amount, reason, reference_type, reference_id, balance_after)
  values
    (current_user_id, -package_record.bits_cost, 'Post boost: ' || package_record.name, 'post_boost', target_post_id, new_balance);

  insert into public.post_boosts
    (post_id, user_id, package_id, package_type, bits_spent, starts_at, ends_at,
     status, impression_limit, placement_type, idempotency_key)
  values
    (target_post_id, current_user_id, package_record.id, package_record.slug, package_record.bits_cost,
     computed_starts_at, computed_ends_at, 'active', package_record.default_impression_limit,
     package_record.placement_type, target_idempotency_key)
  returning * into new_boost;

  return jsonb_build_object(
    'ok', true,
    'already_processed', false,
    'boost_id', new_boost.id,
    'balance', new_balance,
    'ends_at', new_boost.ends_at,
    'package', package_record.slug
  );
end;
$$;

-- ---------------------------------------------------------
-- 7. record_boost_event - best-effort impression/click logging.
--
-- Never counts the boost owner's own views/clicks (anti-gaming),
-- deduplicates the same signed-in viewer within a configurable
-- window (boost_limits.impression_dedup_minutes) per boost+event_type,
-- and is the only writer of impressions_used -
-- there is no client update path to that counter.
-- ---------------------------------------------------------

create or replace function public.record_boost_event(
  target_boost_id uuid,
  target_event_type text,
  target_placement text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  boost_record public.post_boosts;
  dedup_minutes integer;
  recent_duplicate boolean;
begin
  if target_event_type not in ('impression', 'click', 'profile_click', 'teleport_click') then
    raise exception 'Invalid boost event type';
  end if;

  select * into boost_record from public.post_boosts where id = target_boost_id;

  if boost_record.id is null then
    return jsonb_build_object('ok', false, 'reason', 'boost_not_found');
  end if;

  if viewer_id is not null and viewer_id = boost_record.user_id then
    return jsonb_build_object('ok', true, 'skipped', 'self_view');
  end if;

  if viewer_id is not null then
    select impression_dedup_minutes into dedup_minutes from public.boost_limits where id = true;

    select exists (
      select 1 from public.gridster_boost_events e
      where e.boost_id = target_boost_id
        and e.event_type = target_event_type
        and e.viewer_user_id = viewer_id
        and e.occurred_at >= now() - (coalesce(dedup_minutes, 15) * interval '1 minute')
    ) into recent_duplicate;

    if recent_duplicate then
      return jsonb_build_object('ok', true, 'deduplicated', true);
    end if;
  end if;

  insert into public.gridster_boost_events (boost_id, post_id, viewer_user_id, placement, event_type)
  values (target_boost_id, boost_record.post_id, viewer_id, target_placement, target_event_type);

  if target_event_type = 'impression' and boost_record.status = 'active' then
    update public.post_boosts
    set impressions_used = impressions_used + 1,
        status = case
          when boost_record.impression_limit is not null
            and impressions_used + 1 >= boost_record.impression_limit
          then 'completed'
          else status
        end
    where id = target_boost_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------
-- 8. Admin refund / cancel.
-- ---------------------------------------------------------

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

  return jsonb_build_object('ok', true, 'balance', new_balance);
end;
$$;

create or replace function public.admin_cancel_boost(
  target_boost_id uuid,
  target_reason text default 'Admin cancelled'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin_user boolean;
  updated_id uuid;
begin
  select coalesce(is_admin, false) into is_admin_user
  from public.profiles
  where user_id = auth.uid();

  if not coalesce(is_admin_user, false) then
    raise exception 'Admin access required';
  end if;

  update public.post_boosts
  set status = 'cancelled'
  where id = target_boost_id
    and status in ('pending', 'active')
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Boost not found or not in a cancellable state';
  end if;

  insert into public.bling_transactions
    (user_id, amount, reason, reference_type, reference_id, balance_after)
  select
    pb.user_id, 0, coalesce(target_reason, 'Admin cancelled'), 'post_boost_cancelled', pb.id, bb.balance
  from public.post_boosts pb
  join public.bling_balances bb on bb.user_id = pb.user_id
  where pb.id = target_boost_id;

  return jsonb_build_object('ok', true);
end;
$$;
