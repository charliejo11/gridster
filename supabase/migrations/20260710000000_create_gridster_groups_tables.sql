-- =========================================================
-- Gridster Groups
-- Real joinable communities: posts, events, announcements, photos, members, teleport
-- =========================================================

-- =========================
-- 1. Groups
-- =========================

create table if not exists public.gridster_groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'clubs',
  region_name text,
  slurl text,
  photo_url text,
  maturity_rating text not null default 'general',
  member_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_group_category check (
    category in ('clubs', 'stores', 'rp_sims', 'fandoms', 'bloggers', 'photographers', 'adult_communities', 'music_scenes')
  ),
  constraint valid_group_maturity_rating check (
    maturity_rating in ('general', 'moderate', 'adult')
  ),
  constraint group_member_count_nonnegative check (member_count >= 0)
);

create index if not exists gridster_groups_category_idx on public.gridster_groups (category);
create index if not exists gridster_groups_owner_user_id_idx on public.gridster_groups (owner_user_id);

comment on table public.gridster_groups is
  'Real Gridster Groups: clubs, stores, RP sims, fandoms, and other communities. member_count is denormalized and trigger-maintained.';

-- =========================
-- 2. Members
-- =========================

create table if not exists public.gridster_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.gridster_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  joined_at timestamptz not null default now(),

  constraint gridster_group_members_unique unique (group_id, user_id)
);

create index if not exists gridster_group_members_group_id_idx on public.gridster_group_members (group_id);
create index if not exists gridster_group_members_user_id_idx on public.gridster_group_members (user_id);

-- =========================
-- 3. Posts (posts, events, announcements, photos - unified)
-- =========================

create table if not exists public.gridster_group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.gridster_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  post_type text not null default 'post',
  content text,
  photo_url text,
  when_label text,
  region_name text,
  slurl text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_group_post_type check (
    post_type in ('post', 'event', 'announcement')
  )
);

create index if not exists gridster_group_posts_group_id_idx on public.gridster_group_posts (group_id);
create index if not exists gridster_group_posts_post_type_idx on public.gridster_group_posts (post_type);

-- =========================
-- 4. Updated At Triggers
-- (reuses public.set_updated_at() from 20260703090000_create_bling_depot_tables.sql)
-- =========================

drop trigger if exists set_gridster_groups_updated_at on public.gridster_groups;

create trigger set_gridster_groups_updated_at
before update on public.gridster_groups
for each row
execute function public.set_updated_at();

drop trigger if exists set_gridster_group_posts_updated_at on public.gridster_group_posts;

create trigger set_gridster_group_posts_updated_at
before update on public.gridster_group_posts
for each row
execute function public.set_updated_at();

-- =========================
-- 5. Auto-join the owner when a group is created
-- =========================

create or replace function public.auto_join_group_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_display_name text;
begin
  select coalesce(display_name, sl_username)
  into owner_display_name
  from public.profiles
  where user_id = new.owner_user_id;

  insert into public.gridster_group_members (group_id, user_id, display_name)
  values (new.id, new.owner_user_id, owner_display_name)
  on conflict (group_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists auto_join_group_owner_trigger on public.gridster_groups;

create trigger auto_join_group_owner_trigger
after insert on public.gridster_groups
for each row
execute function public.auto_join_group_owner();

-- =========================
-- 6. Keep member_count in sync
-- =========================

create or replace function public.sync_group_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_group_id uuid;
begin
  affected_group_id := coalesce(new.group_id, old.group_id);

  update public.gridster_groups
  set member_count = (
    select count(*) from public.gridster_group_members
    where group_id = affected_group_id
  )
  where id = affected_group_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_group_member_count_trigger on public.gridster_group_members;

create trigger sync_group_member_count_trigger
after insert or delete on public.gridster_group_members
for each row
execute function public.sync_group_member_count();

-- =========================
-- 7. Row Level Security
-- =========================

alter table public.gridster_groups enable row level security;
alter table public.gridster_group_members enable row level security;
alter table public.gridster_group_posts enable row level security;

-- Groups

drop policy if exists "Groups are publicly readable" on public.gridster_groups;

create policy "Groups are publicly readable"
on public.gridster_groups
for select
using (true);

drop policy if exists "Users can create groups" on public.gridster_groups;

create policy "Users can create groups"
on public.gridster_groups
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "Owners can update their groups" on public.gridster_groups;

create policy "Owners can update their groups"
on public.gridster_groups
for update
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "Owners can delete their groups" on public.gridster_groups;

create policy "Owners can delete their groups"
on public.gridster_groups
for delete
to authenticated
using (auth.uid() = owner_user_id);

-- Members

drop policy if exists "Group members are publicly readable" on public.gridster_group_members;

create policy "Group members are publicly readable"
on public.gridster_group_members
for select
using (true);

drop policy if exists "Users can join groups themselves" on public.gridster_group_members;

create policy "Users can join groups themselves"
on public.gridster_group_members
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can leave groups themselves" on public.gridster_group_members;

create policy "Users can leave groups themselves"
on public.gridster_group_members
for delete
to authenticated
using (auth.uid() = user_id);

-- Posts

drop policy if exists "Group posts are publicly readable" on public.gridster_group_posts;

create policy "Group posts are publicly readable"
on public.gridster_group_posts
for select
using (true);

drop policy if exists "Members can post in their groups" on public.gridster_group_posts;

create policy "Members can post in their groups"
on public.gridster_group_posts
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.gridster_group_members m
    where m.group_id = gridster_group_posts.group_id and m.user_id = auth.uid()
  )
  and (
    post_type <> 'announcement'
    or exists (
      select 1 from public.gridster_groups g
      where g.id = gridster_group_posts.group_id and g.owner_user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can update their own group posts" on public.gridster_group_posts;

create policy "Users can update their own group posts"
on public.gridster_group_posts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own group posts" on public.gridster_group_posts;

create policy "Users can delete their own group posts"
on public.gridster_group_posts
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================
-- 8. Seed: founding groups
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

  if admin_user_id is not null and not exists (select 1 from public.gridster_groups) then
    insert into public.gridster_groups
      (owner_user_id, name, description, category, slurl, maturity_rating)
    values
      (
        admin_user_id,
        'Club Elysium',
        'Nightlife, DJs, event regulars, and neon dance-floor people.',
        'clubs',
        'secondlife://Club%20Elysium/128/128/25',
        'moderate'
      ),
      (
        admin_user_id,
        'The Creators Collective',
        'Builders, photographers, bloggers, decorators, and makers.',
        'bloggers',
        null,
        'general'
      ),
      (
        admin_user_id,
        'Pixel Fashion Society',
        'Fashion finds, blogger calls, editorials, and creator drops.',
        'bloggers',
        null,
        'general'
      ),
      (
        admin_user_id,
        'Sanctuary Rocks Crew',
        'Rock fans, metal nights, venue staff, DJs, and regulars.',
        'music_scenes',
        null,
        'moderate'
      ),
      (
        admin_user_id,
        'Moonlit Hollow RP',
        'Gothic roleplay, lore, events, applications, and dark fantasy.',
        'rp_sims',
        'secondlife://Moonlit%20Hollow/128/92/27',
        'moderate'
      );
  end if;
end;
$$;
