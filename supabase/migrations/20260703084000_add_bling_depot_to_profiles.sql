create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  display_name text not null default '',
  sl_username text not null default '',
  avatar_url text not null default '',
  banner_url text not null default '',
  bio text not null default '',
  creator_type text not null default 'Resident',
  interests text[] not null default '{}',
  flickr_url text not null default '',
  primfeed_url text not null default '',
  instagram_url text not null default '',
  marketplace_url text not null default '',
  discord_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.profiles
add column if not exists display_name text not null default '';

alter table public.profiles
add column if not exists sl_username text not null default '';

alter table public.profiles
add column if not exists avatar_url text not null default '';

alter table public.profiles
add column if not exists banner_url text not null default '';

alter table public.profiles
add column if not exists bio text not null default '';

alter table public.profiles
add column if not exists creator_type text not null default 'Resident';

alter table public.profiles
add column if not exists interests text[] not null default '{}';

alter table public.profiles
add column if not exists flickr_url text not null default '';

alter table public.profiles
add column if not exists primfeed_url text not null default '';

alter table public.profiles
add column if not exists instagram_url text not null default '';

alter table public.profiles
add column if not exists marketplace_url text not null default '';

alter table public.profiles
add column if not exists discord_name text not null default '';

alter table profiles
add column if not exists bling_bits integer default 1250;

alter table profiles
add column if not exists owned_bling_items jsonb default '[]'::jsonb;

alter table profiles
add column if not exists equipped_profile_background text;

alter table profiles
add column if not exists equipped_profile_frame text;

alter table profiles
add column if not exists equipped_glow_effect text;

alter table profiles
add column if not exists equipped_badges jsonb default '[]'::jsonb;

alter table public.profiles enable row level security;

create unique index if not exists profiles_user_id_idx
  on public.profiles (user_id);

create index if not exists profiles_sl_username_idx
  on public.profiles (lower(sl_username));

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

drop policy if exists "Profiles are publicly readable" on public.profiles;
drop policy if exists "Users can create their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can delete their own profile" on public.profiles;

create policy "Profiles are publicly readable"
  on public.profiles
  for select
  using (true);

create policy "Users can create their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own profile"
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);

comment on table public.profiles is
  'Gridster resident profiles, Bling Depot inventory, and equipped profile cosmetics.';
comment on column public.profiles.bling_bits is
  'Profile balance for the Bling Depot cosmetic shop.';
comment on column public.profiles.owned_bling_items is
  'Purchased Bling Depot item ids.';
comment on column public.profiles.equipped_badges is
  'Equipped Bling Depot badge item ids. The app currently limits this to three.';
