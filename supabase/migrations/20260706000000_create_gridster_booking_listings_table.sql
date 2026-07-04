-- =========================================================
-- Gridster DJ / Host Booking Board
-- Two-sided marketplace: venues seeking talent, talent available for bookings
-- =========================================================

create table if not exists public.gridster_booking_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_type text not null default 'venue_seeking',
  role_type text not null default 'dj',
  title text not null,
  description text,
  genre text not null default 'mixed_variety',
  region_name text,
  slurl text,
  timezone text not null default 'slt_pacific',
  pay_type text not null default 'negotiable',
  pay_details text,
  voice_required boolean not null default false,
  maturity_rating text not null default 'general',
  experience_level text not null default 'any',
  contact_name text,
  contact_note text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_booking_post_type check (
    post_type in ('venue_seeking', 'talent_available')
  ),
  constraint valid_booking_role_type check (
    role_type in ('dj', 'host', 'dancer', 'manager')
  ),
  constraint valid_booking_genre check (
    genre in ('rock', 'top_40', 'edm', 'country', 'metal', 'hip_hop', 'pop', 'alternative', 'house', 'trance', 'jazz_lounge', 'classic_rock', 'mixed_variety', 'other')
  ),
  constraint valid_booking_timezone check (
    timezone in ('slt_pacific', 'us_eastern', 'us_central', 'us_mountain', 'uk_gmt', 'europe_cet', 'australia_aet', 'other_flexible')
  ),
  constraint valid_booking_pay_type check (
    pay_type in ('paid', 'tips_only', 'volunteer', 'negotiable')
  ),
  constraint valid_booking_maturity_rating check (
    maturity_rating in ('general', 'moderate', 'adult')
  ),
  constraint valid_booking_experience_level check (
    experience_level in ('any', 'beginner', 'intermediate', 'experienced', 'veteran')
  ),
  constraint valid_booking_status check (
    status in ('open', 'filled')
  )
);

create index if not exists gridster_booking_listings_post_type_idx on public.gridster_booking_listings (post_type);
create index if not exists gridster_booking_listings_role_type_idx on public.gridster_booking_listings (role_type);
create index if not exists gridster_booking_listings_user_id_idx on public.gridster_booking_listings (user_id);
create index if not exists gridster_booking_listings_created_at_idx on public.gridster_booking_listings (created_at desc);

comment on table public.gridster_booking_listings is
  'Two-sided marketplace posts for the DJ / Host Booking Board: venues seeking talent and talent available for bookings.';

-- =========================
-- Updated At Trigger
-- (reuses public.set_updated_at() from 20260703090000_create_bling_depot_tables.sql)
-- =========================

drop trigger if exists set_gridster_booking_listings_updated_at on public.gridster_booking_listings;

create trigger set_gridster_booking_listings_updated_at
before update on public.gridster_booking_listings
for each row
execute function public.set_updated_at();

-- =========================
-- Row Level Security
-- =========================

alter table public.gridster_booking_listings enable row level security;

drop policy if exists "Booking listings are publicly readable" on public.gridster_booking_listings;

create policy "Booking listings are publicly readable"
on public.gridster_booking_listings
for select
using (true);

drop policy if exists "Users can insert their own booking listings" on public.gridster_booking_listings;

create policy "Users can insert their own booking listings"
on public.gridster_booking_listings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own booking listings" on public.gridster_booking_listings;

create policy "Users can update their own booking listings"
on public.gridster_booking_listings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own booking listings" on public.gridster_booking_listings;

create policy "Users can delete their own booking listings"
on public.gridster_booking_listings
for delete
to authenticated
using (auth.uid() = user_id);
