-- =========================================================
-- Gridster Profiles That Actually Matter
-- Available-for tags, current mood, featured photos, favorite places
-- =========================================================

alter table public.profiles
add column if not exists available_for text[] not null default '{}';

alter table public.profiles
add column if not exists current_mood text;

alter table public.profiles
add column if not exists featured_photo_urls text[] not null default '{}';

comment on column public.profiles.available_for is
  'Multi-select "available for" tags (dj, host, blogger, photographer, creator, model, club_owner, roleplayer, decorator, shopper). Client-validated, no db-level check, same convention as interests.';
comment on column public.profiles.current_mood is
  'Free-text current mood/status, e.g. "DJing", "Open to chat". Suggested presets are enforced client-side only.';
comment on column public.profiles.featured_photo_urls is
  'Up to 6 featured photo URLs for the public profile gallery. Client-enforced cap, no db-level limit.';

-- =========================
-- Favorite Places
-- =========================

create table if not exists public.gridster_favorite_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid not null references public.gridster_places(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint gridster_favorite_places_unique unique (user_id, place_id)
);

create index if not exists gridster_favorite_places_user_id_idx on public.gridster_favorite_places (user_id);
create index if not exists gridster_favorite_places_place_id_idx on public.gridster_favorite_places (place_id);

comment on table public.gridster_favorite_places is
  'A resident''s favorite Teleport Discovery Feed places, shown on their public profile.';

alter table public.gridster_favorite_places enable row level security;

drop policy if exists "Favorite places are publicly readable" on public.gridster_favorite_places;

create policy "Favorite places are publicly readable"
on public.gridster_favorite_places
for select
using (true);

drop policy if exists "Users can favorite places themselves" on public.gridster_favorite_places;

create policy "Users can favorite places themselves"
on public.gridster_favorite_places
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can unfavorite places themselves" on public.gridster_favorite_places;

create policy "Users can unfavorite places themselves"
on public.gridster_favorite_places
for delete
to authenticated
using (auth.uid() = user_id);
