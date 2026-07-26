-- =========================================================
-- Gridster Places / Events Core
-- Teleport Discovery Feed + Tonight in Second Life
-- =========================================================

-- =========================
-- 1. Places
-- =========================

create table if not exists public.gridster_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  photo_url text,
  slurl text,
  region_name text,
  category text not null default 'hangouts',
  vibe_tags text[] not null default '{}',
  maturity_rating text not null default 'general',
  is_open_now boolean not null default false,
  teleport_status text not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_place_category check (
    category in ('clubs', 'beaches', 'rp_sims', 'stores', 'photo_spots', 'adult_venues', 'live_music', 'hangouts')
  ),
  constraint valid_place_maturity_rating check (
    maturity_rating in ('general', 'moderate', 'adult')
  ),
  constraint valid_place_teleport_status check (
    teleport_status in ('unverified', 'working', 'broken', 'needs_update')
  )
);

create index if not exists gridster_places_category_idx on public.gridster_places (category);
create index if not exists gridster_places_user_id_idx on public.gridster_places (user_id);
create index if not exists gridster_places_created_at_idx on public.gridster_places (created_at desc);

comment on table public.gridster_places is
  'User-submitted Second Life places for the Teleport Discovery Feed.';

-- =========================
-- 2. Events
-- =========================

create table if not exists public.gridster_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid references public.gridster_places(id) on delete set null,
  title text not null,
  description text,
  photo_url text,
  slurl text,
  region_name text,
  event_type text not null default 'live_dj',
  when_label text,
  maturity_rating text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_event_type check (
    event_type in ('live_dj', 'contest', 'roleplay', 'new_release', 'beach_party', 'photo_meetup', 'club_opening', 'grand_opening')
  ),
  constraint valid_event_maturity_rating check (
    maturity_rating in ('general', 'moderate', 'adult')
  )
);

create index if not exists gridster_events_event_type_idx on public.gridster_events (event_type);
create index if not exists gridster_events_place_id_idx on public.gridster_events (place_id);
create index if not exists gridster_events_user_id_idx on public.gridster_events (user_id);
create index if not exists gridster_events_created_at_idx on public.gridster_events (created_at desc);

comment on table public.gridster_events is
  'Time-bound Second Life event posts for Tonight in Second Life, optionally linked to a gridster_places row.';

-- =========================
-- 3. Updated At Triggers
-- (reuses public.set_updated_at() from 20260703090000_create_bling_depot_tables.sql)
-- =========================

drop trigger if exists set_gridster_places_updated_at on public.gridster_places;

create trigger set_gridster_places_updated_at
before update on public.gridster_places
for each row
execute function public.set_updated_at();

drop trigger if exists set_gridster_events_updated_at on public.gridster_events;

create trigger set_gridster_events_updated_at
before update on public.gridster_events
for each row
execute function public.set_updated_at();

-- =========================
-- 4. Report Broken Teleport
-- =========================

create or replace function public.report_broken_teleport(target_place_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  place_record public.gridster_places;
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

  update public.gridster_places
  set teleport_status = 'broken'
  where id = target_place_id;

  return jsonb_build_object(
    'ok', true,
    'place_id', target_place_id,
    'teleport_status', 'broken'
  );
end;
$$;

-- =========================
-- 5. Row Level Security
-- =========================

alter table public.gridster_places enable row level security;
alter table public.gridster_events enable row level security;

-- Places

drop policy if exists "Places are publicly readable" on public.gridster_places;

create policy "Places are publicly readable"
on public.gridster_places
for select
using (true);

drop policy if exists "Users can insert their own places" on public.gridster_places;

create policy "Users can insert their own places"
on public.gridster_places
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own places" on public.gridster_places;

create policy "Users can update their own places"
on public.gridster_places
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own places" on public.gridster_places;

create policy "Users can delete their own places"
on public.gridster_places
for delete
to authenticated
using (auth.uid() = user_id);

-- Events

drop policy if exists "Events are publicly readable" on public.gridster_events;

create policy "Events are publicly readable"
on public.gridster_events
for select
using (true);

drop policy if exists "Users can insert their own events" on public.gridster_events;

create policy "Users can insert their own events"
on public.gridster_events
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own events" on public.gridster_events;

create policy "Users can update their own events"
on public.gridster_events
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own events" on public.gridster_events;

create policy "Users can delete their own events"
on public.gridster_events
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================
-- 6. Seed: real Second Life destinations
-- Sourced from the official Second Life Destination Guide
-- (secondlife.com/destinations), one per category, so the
-- Teleport Discovery Feed launches with real places instead
-- of an empty feed. Attributed to the site owner/admin account
-- and skipped entirely if that account or any places already
-- exist, so this only ever runs once on a fresh database.
-- =========================

do $$
declare
  admin_user_id uuid;
begin
  select id
  into admin_user_id
  from auth.users
  where email = 'elfavina89@gmail.com'
  limit 1;

  if admin_user_id is not null and not exists (select 1 from public.gridster_places) then
    insert into public.gridster_places
      (user_id, title, description, slurl, region_name, category, vibe_tags, maturity_rating, is_open_now, teleport_status)
    values
      (
        admin_user_id,
        'The Vortex Club',
        'Established in 2006, The Vortex Club hosts a collection of devoted DJs who play new, classic, and eclectic tunes.',
        'https://maps.secondlife.com/secondlife/Whippersnapper/35/127/22',
        'Whippersnapper',
        'clubs',
        array['DJs', 'Dance', 'Nightlife'],
        'moderate',
        false,
        'working'
      ),
      (
        admin_user_id,
        'Sirens Beach',
        'A nude beach destination featuring dancing, music, and social activities in a romantic Pacific island setting.',
        'https://maps.secondlife.com/secondlife/sirens/185/115/33',
        'Sirens',
        'beaches',
        array['Beach', 'Nude', 'Romantic'],
        'adult',
        false,
        'working'
      ),
      (
        admin_user_id,
        'MyStory RP',
        'A roleplaying community where residents farm, cook, and manage avatar needs around Redwood Estates.',
        'https://maps.secondlife.com/secondlife/MyStory/170/196/31',
        'MyStory',
        'rp_sims',
        array['Roleplay', 'Farming', 'Community'],
        'general',
        false,
        'working'
      ),
      (
        admin_user_id,
        'Velour Mall',
        'A high-end shopping destination offering skins, shoes, cosmetics, poses, and accessories across boutique stores.',
        'https://maps.secondlife.com/secondlife/VELOUR/86/110/83',
        'VELOUR',
        'stores',
        array['Shopping', 'Fashion', 'Boutique'],
        'general',
        false,
        'working'
      ),
      (
        admin_user_id,
        'Photo Bar Flashback',
        'A photogenic spot in the woods with beautiful poses throughout and an art gallery for photographers to display their work.',
        'https://maps.secondlife.com/secondlife/Sociaria/170/203/4003',
        'Sociaria',
        'photo_spots',
        array['Photography', 'Poses', 'Art Gallery'],
        'general',
        false,
        'working'
      ),
      (
        admin_user_id,
        'INFERNO ROOM',
        'A Hell-themed adult nightlife venue known for massive crowds, live DJs, high-profile performers, and cinematic atmosphere.',
        'https://maps.secondlife.com/secondlife/THUG/126/129/23',
        'THUG',
        'adult_venues',
        array['Adult', 'DJs', 'Nightlife'],
        'adult',
        false,
        'working'
      ),
      (
        admin_user_id,
        'SL Rockstars Music Park',
        'An open-air concert venue nestled in a scenic park, designed for live music and nature enthusiasts.',
        'https://maps.secondlife.com/secondlife/Rockstars/122/190/4000',
        'Rockstars',
        'live_music',
        array['Live Music', 'Concerts', 'Outdoor'],
        'general',
        false,
        'working'
      ),
      (
        admin_user_id,
        'Central Park Newcomer Welcome Area',
        'A voice-enabled, newcomer-friendly hangout offering live helper assistance and basic in-world guidance for new residents.',
        'https://maps.secondlife.com/secondlife/Central%20Park/58/19/23',
        'Central Park',
        'hangouts',
        array['Newcomer Friendly', 'Voice', 'Welcome Area'],
        'general',
        false,
        'working'
      );
  end if;
end;
$$;
