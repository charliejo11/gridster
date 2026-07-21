-- =========================================================
-- Featured Sim/Store system
-- Real curated placements backing the "Featured Sims /
-- Stores" sidebar widget (previously a hardcoded array).
-- =========================================================

-- ---------------------------------------------------------
-- 1. Eligibility fields on the existing places table
-- ---------------------------------------------------------
-- Additive only - defaults preserve current behavior for every
-- pre-existing row and the general Places directory, which does
-- not filter on these. They exist so the Featured admin panel can
-- restrict its place-picker to approved, active listings.

alter table public.gridster_places
add column if not exists is_active boolean not null default true;

alter table public.gridster_places
add column if not exists is_approved boolean not null default true;

comment on column public.gridster_places.is_active is
  'Whether this place listing is currently active. Defaults true for backward compatibility; the general Places directory does not filter on this.';
comment on column public.gridster_places.is_approved is
  'Whether an admin has approved this place as eligible for curated features (e.g. Featured Sim/Store). Defaults true for pre-existing listings; does not gate normal Places directory visibility.';

-- ---------------------------------------------------------
-- 2. Featured placements
-- ---------------------------------------------------------

create table if not exists public.gridster_featured_places (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.gridster_places(id) on delete cascade,
  feature_status text not null default 'scheduled',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '7 days'),
  priority integer not null default 0,
  feature_reason text,
  is_sponsored boolean not null default false,
  image_url text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_gridster_feature_status
    check (feature_status in ('draft', 'scheduled', 'active', 'expired')),
  constraint valid_gridster_feature_dates
    check (ends_at > starts_at)
);

create index if not exists gridster_featured_places_place_id_idx
  on public.gridster_featured_places (place_id);
create index if not exists gridster_featured_places_window_idx
  on public.gridster_featured_places (starts_at, ends_at);

comment on table public.gridster_featured_places is
  'Admin-curated Featured Sim/Store placements. Separate from any future paid Sponsored system via is_sponsored - editorial reads (RLS below) always exclude sponsored rows.';

drop trigger if exists set_gridster_featured_places_updated_at on public.gridster_featured_places;
create trigger set_gridster_featured_places_updated_at
before update on public.gridster_featured_places
for each row
execute function public.set_updated_at();

alter table public.gridster_featured_places enable row level security;

-- Public/authenticated read: only live, editorial (non-sponsored) placements.
-- Sponsored placements are intentionally excluded here - there is no
-- sponsored display surface yet, and a future one must be built
-- deliberately rather than falling out of this policy by accident.
drop policy if exists "Anyone can view active editorial featured placements" on public.gridster_featured_places;
create policy "Anyone can view active editorial featured placements"
on public.gridster_featured_places
for select
using (
  feature_status in ('scheduled', 'active')
  and is_sponsored = false
  and starts_at <= now()
  and ends_at >= now()
);

-- Admins can see everything (drafts, expired, sponsored) for the admin panel.
drop policy if exists "Admins can view all featured placements" on public.gridster_featured_places;
create policy "Admins can view all featured placements"
on public.gridster_featured_places
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
);

drop policy if exists "Admins can create featured placements" on public.gridster_featured_places;
create policy "Admins can create featured placements"
on public.gridster_featured_places
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
);

drop policy if exists "Admins can update featured placements" on public.gridster_featured_places;
create policy "Admins can update featured placements"
on public.gridster_featured_places
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
);

drop policy if exists "Admins can delete featured placements" on public.gridster_featured_places;
create policy "Admins can delete featured placements"
on public.gridster_featured_places
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
);

-- ---------------------------------------------------------
-- 3. Place nominations
-- ---------------------------------------------------------

create table if not exists public.gridster_place_nominations (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.gridster_places(id) on delete cascade,
  nominated_by uuid not null references auth.users(id) on delete cascade,
  reason text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,

  constraint valid_gridster_nomination_status
    check (status in ('pending', 'approved', 'rejected'))
);

-- One active (pending) nomination per user per place - resubmission is
-- allowed once a prior nomination has been reviewed (approved/rejected).
create unique index if not exists gridster_place_nominations_one_pending_idx
  on public.gridster_place_nominations (place_id, nominated_by)
  where status = 'pending';

create index if not exists gridster_place_nominations_place_id_idx
  on public.gridster_place_nominations (place_id);

comment on table public.gridster_place_nominations is
  'User-submitted "nominate this place" requests. Does not auto-feature anything - admin review required via gridster_featured_places.';

alter table public.gridster_place_nominations enable row level security;

drop policy if exists "Users can view their own nominations" on public.gridster_place_nominations;
create policy "Users can view their own nominations"
on public.gridster_place_nominations
for select
to authenticated
using (auth.uid() = nominated_by);

drop policy if exists "Admins can view all nominations" on public.gridster_place_nominations;
create policy "Admins can view all nominations"
on public.gridster_place_nominations
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
);

drop policy if exists "Users can submit nominations" on public.gridster_place_nominations;
create policy "Users can submit nominations"
on public.gridster_place_nominations
for insert
to authenticated
with check (auth.uid() = nominated_by);

drop policy if exists "Admins can review nominations" on public.gridster_place_nominations;
create policy "Admins can review nominations"
on public.gridster_place_nominations
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
);

-- ---------------------------------------------------------
-- 4. Featured teleport click tracking
-- ---------------------------------------------------------

create table if not exists public.gridster_featured_teleport_clicks (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.gridster_places(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  source text not null default 'featured_sidebar',
  clicked_at timestamptz not null default now()
);

create index if not exists gridster_featured_teleport_clicks_place_id_idx
  on public.gridster_featured_teleport_clicks (place_id);

comment on table public.gridster_featured_teleport_clicks is
  'Teleport click-through tracking for Featured placements. Insert is best-effort from the client and must never block teleporting.';

alter table public.gridster_featured_teleport_clicks enable row level security;

drop policy if exists "Anyone can record a featured teleport click" on public.gridster_featured_teleport_clicks;
create policy "Anyone can record a featured teleport click"
on public.gridster_featured_teleport_clicks
for insert
to anon, authenticated
with check (user_id is null or user_id = auth.uid());

drop policy if exists "Admins can view featured teleport clicks" on public.gridster_featured_teleport_clicks;
create policy "Admins can view featured teleport clicks"
on public.gridster_featured_teleport_clicks
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
);
