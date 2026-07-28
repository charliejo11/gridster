-- =========================================================
-- Security audit fixes (low-priority findings)
--
-- 8. profiles.bling_bits / owned_bling_items / equipped_profile_*
--    / equipped_badges: confirmed via a search of every migration -
--    nothing has ever UPDATEd these beyond their initial column
--    default. blingDepotItems.js does still read
--    profile.equipped_profile_background/frame/glow_effect/badges,
--    but only as a `??` fallback behind the real equipped_cosmetics
--    data - since these columns are never written a real value, that
--    fallback can never actually produce one. Functionally dead, not
--    literally unread. Not dropping the columns (real DROP COLUMN
--    risk for a low-priority, non-exploitable item with unclear
--    blast radius) - just documenting clearly so a future developer
--    doesn't get confused, which was the actual concern.
-- 9. report_broken_slurl / report_broken_teleport had no per-user
--    tracking at all - a single user could call either unlimited
--    times, spam-inflating gridster_teleport_reports.report_count or
--    repeatedly re-flipping a place to broken with one account. Adds
--    a shared report-events table with a 24h per-user-per-target
--    cooldown, same unique-constraint-as-idempotency-gate pattern
--    used throughout this codebase (gridster_photo_votes,
--    gridster_bonus_claims).
-- =========================================================

-- ---------------------------------------------------------
-- 8. Document, don't drop.
-- ---------------------------------------------------------

comment on column public.profiles.bling_bits is
  'Superseded by public.bling_balances.balance - nothing writes this column anymore (confirmed: no migration UPDATEs it past its initial default). Left in place rather than dropped to avoid an unnecessary schema-risk change for a non-exploitable, read-only-of-a-stale-default column.';
comment on column public.profiles.owned_bling_items is
  'Superseded by public.bling_purchases - nothing writes this column anymore. See comment on bling_bits.';
comment on column public.profiles.equipped_profile_background is
  'Superseded by public.equipped_cosmetics - nothing writes this column anymore. blingDepotItems.js still reads it as a `??` fallback behind the real equipped_cosmetics data, but since this is never written a real value, that fallback can never actually fire with meaningful data. See comment on bling_bits.';
comment on column public.profiles.equipped_profile_frame is
  'Superseded by public.equipped_cosmetics - nothing writes this column anymore. See comment on equipped_profile_background.';
comment on column public.profiles.equipped_glow_effect is
  'Superseded by public.equipped_cosmetics - nothing writes this column anymore. See comment on equipped_profile_background.';
comment on column public.profiles.equipped_badges is
  'Superseded by public.equipped_cosmetics - nothing writes this column anymore. See comment on equipped_profile_background.';

-- ---------------------------------------------------------
-- 9. Rate-limit broken-teleport/SLURL reporting
-- ---------------------------------------------------------

create table if not exists public.gridster_teleport_report_events (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('slurl', 'place')),
  target_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists gridster_teleport_report_events_lookup_idx
  on public.gridster_teleport_report_events (target_type, target_key, reporter_user_id, created_at desc);

comment on table public.gridster_teleport_report_events is
  'One row per report_broken_slurl/report_broken_teleport call. Exists purely to rate-limit - see the 24h cooldown check in both RPCs - not surfaced to clients directly.';

alter table public.gridster_teleport_report_events enable row level security;
-- No policies at all: not even a select policy. Only the two RPCs
-- (security definer) ever read or write this table.

create or replace function public.report_broken_slurl(target_slurl text, target_destination_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  recently_reported boolean;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if target_slurl is null or length(trim(target_slurl)) = 0 then
    raise exception 'No SLURL to report';
  end if;

  select exists (
    select 1 from public.gridster_teleport_report_events
    where target_type = 'slurl'
      and target_key = target_slurl
      and reporter_user_id = current_user_id
      and created_at > now() - interval '24 hours'
  ) into recently_reported;

  if recently_reported then
    return jsonb_build_object(
      'ok', true,
      'slurl', target_slurl,
      'status', 'broken',
      'already_reported', true
    );
  end if;

  insert into public.gridster_teleport_report_events (reporter_user_id, target_type, target_key)
  values (current_user_id, 'slurl', target_slurl);

  insert into public.gridster_teleport_reports (slurl, destination_name, status, report_count, last_reported_at)
  values (target_slurl, target_destination_name, 'broken', 1, now())
  on conflict (slurl) do update
  set
    status = 'broken',
    report_count = public.gridster_teleport_reports.report_count + 1,
    last_reported_at = now(),
    destination_name = coalesce(excluded.destination_name, public.gridster_teleport_reports.destination_name);

  return jsonb_build_object(
    'ok', true,
    'slurl', target_slurl,
    'status', 'broken',
    'already_reported', false
  );
end;
$$;

create or replace function public.report_broken_teleport(target_place_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  place_record public.gridster_places;
  recently_reported boolean;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into place_record
  from public.gridster_places
  where id = target_place_id;

  if place_record.id is null then
    raise exception 'Place not found';
  end if;

  select exists (
    select 1 from public.gridster_teleport_report_events
    where target_type = 'place'
      and target_key = target_place_id::text
      and reporter_user_id = current_user_id
      and created_at > now() - interval '24 hours'
  ) into recently_reported;

  if recently_reported then
    return jsonb_build_object(
      'ok', true,
      'place_id', target_place_id,
      'teleport_status', 'broken',
      'already_reported', true
    );
  end if;

  insert into public.gridster_teleport_report_events (reporter_user_id, target_type, target_key)
  values (current_user_id, 'place', target_place_id::text);

  update public.gridster_places
  set teleport_status = 'broken'
  where id = target_place_id;

  return jsonb_build_object(
    'ok', true,
    'place_id', target_place_id,
    'teleport_status', 'broken',
    'already_reported', false
  );
end;
$$;
