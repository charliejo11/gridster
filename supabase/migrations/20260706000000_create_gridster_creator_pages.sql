-- =========================================================
-- Gridster Creator Pages / Club Pages
-- Real single-owner branded pages for creators, stores, clubs, and venues
-- =========================================================

-- =========================
-- 1. Pages
-- =========================

create table if not exists public.gridster_creator_pages (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  page_type text not null default 'store',
  name text not null,
  tagline text,
  bio text,
  avatar_url text,
  banner_url text,
  region_name text,
  slurl text,
  website_url text,
  marketplace_url text,
  maturity_rating text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_creator_page_type check (
    page_type in ('store', 'dj', 'blogger', 'photographer', 'event_host', 'roleplay_creator', 'club', 'venue', 'community')
  ),
  constraint valid_creator_page_maturity_rating check (
    maturity_rating in ('general', 'moderate', 'adult')
  )
);

create index if not exists gridster_creator_pages_page_type_idx on public.gridster_creator_pages (page_type);
create index if not exists gridster_creator_pages_owner_user_id_idx on public.gridster_creator_pages (owner_user_id);

comment on table public.gridster_creator_pages is
  'Real single-owner branded pages: stores, DJs, bloggers, clubs, venues, and other creator/business pages. Not joinable communities - see gridster_groups for those.';

-- =========================
-- 2. Highlights (lightweight portfolio/product showcase)
-- =========================

create table if not exists public.gridster_creator_page_highlights (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.gridster_creator_pages(id) on delete cascade,
  title text not null,
  description text,
  photo_url text,
  link_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists gridster_creator_page_highlights_page_id_idx on public.gridster_creator_page_highlights (page_id);

-- =========================
-- 3. Updated At Trigger
-- (reuses public.set_updated_at() from 20260703090000_create_bling_depot_tables.sql)
-- =========================

drop trigger if exists set_gridster_creator_pages_updated_at on public.gridster_creator_pages;

create trigger set_gridster_creator_pages_updated_at
before update on public.gridster_creator_pages
for each row
execute function public.set_updated_at();

-- =========================
-- 4. Row Level Security
-- =========================

alter table public.gridster_creator_pages enable row level security;
alter table public.gridster_creator_page_highlights enable row level security;

-- Pages

drop policy if exists "Creator pages are publicly readable" on public.gridster_creator_pages;

create policy "Creator pages are publicly readable"
on public.gridster_creator_pages
for select
using (true);

drop policy if exists "Users can create their own creator pages" on public.gridster_creator_pages;

create policy "Users can create their own creator pages"
on public.gridster_creator_pages
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "Owners can update their creator pages" on public.gridster_creator_pages;

create policy "Owners can update their creator pages"
on public.gridster_creator_pages
for update
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "Owners can delete their creator pages" on public.gridster_creator_pages;

create policy "Owners can delete their creator pages"
on public.gridster_creator_pages
for delete
to authenticated
using (auth.uid() = owner_user_id);

-- Highlights

drop policy if exists "Creator page highlights are publicly readable" on public.gridster_creator_page_highlights;

create policy "Creator page highlights are publicly readable"
on public.gridster_creator_page_highlights
for select
using (true);

drop policy if exists "Owners can add highlights to their pages" on public.gridster_creator_page_highlights;

create policy "Owners can add highlights to their pages"
on public.gridster_creator_page_highlights
for insert
to authenticated
with check (
  exists (
    select 1 from public.gridster_creator_pages p
    where p.id = gridster_creator_page_highlights.page_id and p.owner_user_id = auth.uid()
  )
);

drop policy if exists "Owners can update highlights on their pages" on public.gridster_creator_page_highlights;

create policy "Owners can update highlights on their pages"
on public.gridster_creator_page_highlights
for update
to authenticated
using (
  exists (
    select 1 from public.gridster_creator_pages p
    where p.id = gridster_creator_page_highlights.page_id and p.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.gridster_creator_pages p
    where p.id = gridster_creator_page_highlights.page_id and p.owner_user_id = auth.uid()
  )
);

drop policy if exists "Owners can delete highlights from their pages" on public.gridster_creator_page_highlights;

create policy "Owners can delete highlights from their pages"
on public.gridster_creator_page_highlights
for delete
to authenticated
using (
  exists (
    select 1 from public.gridster_creator_pages p
    where p.id = gridster_creator_page_highlights.page_id and p.owner_user_id = auth.uid()
  )
);
