-- =========================================================
-- Gridster Sitewide Broken Teleport Checker
-- Crowd-sourced teleport status, keyed by SLURL (not tied to any single table's rows)
-- =========================================================

create table if not exists public.gridster_teleport_reports (
  id uuid primary key default gen_random_uuid(),
  slurl text not null unique,
  destination_name text,
  status text not null default 'unverified',
  report_count integer not null default 0,
  last_reported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_teleport_report_status check (
    status in ('unverified', 'working', 'broken', 'needs_update')
  )
);

create index if not exists gridster_teleport_reports_slurl_idx on public.gridster_teleport_reports (slurl);

comment on table public.gridster_teleport_reports is
  'Crowd-sourced teleport status for any SLURL shown anywhere in the app, keyed by SLURL rather than a table row since most teleport buttons point at mock/static destinations. Status only moves to broken via the report_broken_slurl() RPC - working/needs_update are admin-only manual states set directly via SQL, mirroring the profiles.is_admin pattern.';

drop trigger if exists set_gridster_teleport_reports_updated_at on public.gridster_teleport_reports;

create trigger set_gridster_teleport_reports_updated_at
before update on public.gridster_teleport_reports
for each row
execute function public.set_updated_at();

-- =========================
-- Report Broken SLURL
-- =========================

create or replace function public.report_broken_slurl(target_slurl text, target_destination_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if target_slurl is null or length(trim(target_slurl)) = 0 then
    raise exception 'No SLURL to report';
  end if;

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
    'status', 'broken'
  );
end;
$$;

-- =========================
-- Row Level Security
-- Read-only for clients - all writes go through the RPC above
-- =========================

alter table public.gridster_teleport_reports enable row level security;

drop policy if exists "Teleport reports are publicly readable" on public.gridster_teleport_reports;

create policy "Teleport reports are publicly readable"
on public.gridster_teleport_reports
for select
using (true);
