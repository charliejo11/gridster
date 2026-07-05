-- =========================================================
-- Gridster Posts
-- Real sitewide feed posts: general updates, photos, blog posts, store posts
-- =========================================================

create table if not exists public.gridster_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  post_type text not null default 'general',
  content text,
  photo_url text,
  link_url text,
  region_name text,
  slurl text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),

  constraint valid_gridster_post_type check (
    post_type in ('general', 'photo', 'blog', 'store')
  )
);

create index if not exists gridster_posts_created_at_idx on public.gridster_posts (created_at desc);
create index if not exists gridster_posts_user_id_idx on public.gridster_posts (user_id);

comment on table public.gridster_posts is
  'Real sitewide feed posts created via the Gridster composer - general updates, photos, blog posts, store posts.';

-- =========================
-- Row Level Security
-- =========================

alter table public.gridster_posts enable row level security;

drop policy if exists "Gridster posts are publicly readable" on public.gridster_posts;

create policy "Gridster posts are publicly readable"
on public.gridster_posts
for select
using (true);

drop policy if exists "Users can create their own posts" on public.gridster_posts;

create policy "Users can create their own posts"
on public.gridster_posts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own posts" on public.gridster_posts;

create policy "Users can update their own posts"
on public.gridster_posts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.gridster_posts;

create policy "Users can delete their own posts"
on public.gridster_posts
for delete
to authenticated
using (auth.uid() = user_id);
