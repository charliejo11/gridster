-- =========================================================
-- Comments, likes, per-user hides, and reports for group posts.
-- Mirrors the shapes of gridster_post_comments/gridster_post_reactions/
-- gridster_hidden_posts/gridster_post_reports (the main feed's
-- equivalents), which can't be reused directly here since those are
-- hard-FK'd to gridster_posts, not gridster_group_posts.
-- =========================================================

create table if not exists public.gridster_group_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.gridster_group_posts(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.gridster_group_post_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  content_edited_at timestamptz
);

create index if not exists gridster_group_post_comments_post_id_idx
  on public.gridster_group_post_comments (post_id, created_at);
create index if not exists gridster_group_post_comments_parent_idx
  on public.gridster_group_post_comments (parent_comment_id);

-- Keep nesting simple: a reply to a reply is flattened onto the
-- original top-level comment, so the thread never goes more than one
-- level deep no matter what parent_comment_id the client sends.
create or replace function public.flatten_group_comment_reply()
returns trigger
language plpgsql
as $$
declare
  grandparent_id uuid;
  parent_post_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select parent_comment_id, post_id into grandparent_id, parent_post_id
  from public.gridster_group_post_comments
  where id = new.parent_comment_id;

  if parent_post_id is null then
    raise exception 'Parent comment not found';
  end if;

  if parent_post_id <> new.post_id then
    raise exception 'Cannot reply to a comment on a different post';
  end if;

  if grandparent_id is not null then
    new.parent_comment_id := grandparent_id;
  end if;

  return new;
end;
$$;

drop trigger if exists flatten_group_comment_reply_trigger on public.gridster_group_post_comments;
create trigger flatten_group_comment_reply_trigger
before insert on public.gridster_group_post_comments
for each row execute function public.flatten_group_comment_reply();

drop trigger if exists set_group_post_comments_updated_at on public.gridster_group_post_comments;
create trigger set_group_post_comments_updated_at
before update on public.gridster_group_post_comments
for each row execute function public.set_updated_at();

alter table public.gridster_group_post_comments enable row level security;

drop policy if exists "Group post comments are readable per group privacy" on public.gridster_group_post_comments;
create policy "Group post comments are readable per group privacy"
on public.gridster_group_post_comments for select
using (
  exists (
    select 1 from public.gridster_group_posts p
    where p.id = post_id and public.can_view_group_content(p.group_id)
  )
);

drop policy if exists "Active members can comment when enabled" on public.gridster_group_post_comments;
create policy "Active members can comment when enabled"
on public.gridster_group_post_comments for insert
to authenticated
with check (
  auth.uid() = author_user_id
  and exists (
    select 1 from public.gridster_group_posts p
    where p.id = post_id
      and p.comments_enabled = true
      and public.is_active_group_member(p.group_id, auth.uid())
  )
);

drop policy if exists "Users can update their own group comments" on public.gridster_group_post_comments;
create policy "Users can update their own group comments"
on public.gridster_group_post_comments for update
to authenticated
using (auth.uid() = author_user_id)
with check (auth.uid() = author_user_id);

drop policy if exists "Users can delete their own group comments" on public.gridster_group_post_comments;
create policy "Users can delete their own group comments"
on public.gridster_group_post_comments for delete
to authenticated
using (auth.uid() = author_user_id);

-- =========================
-- Likes
-- =========================

create table if not exists public.gridster_group_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.gridster_group_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint gridster_group_post_likes_unique unique (post_id, user_id)
);

alter table public.gridster_group_post_likes enable row level security;

drop policy if exists "Group post likes are readable per group privacy" on public.gridster_group_post_likes;
create policy "Group post likes are readable per group privacy"
on public.gridster_group_post_likes for select
using (
  exists (
    select 1 from public.gridster_group_posts p
    where p.id = post_id and public.can_view_group_content(p.group_id)
  )
);

drop policy if exists "Active members can like group posts" on public.gridster_group_post_likes;
create policy "Active members can like group posts"
on public.gridster_group_post_likes for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.gridster_group_posts p
    where p.id = post_id and public.is_active_group_member(p.group_id, auth.uid())
  )
);

drop policy if exists "Users can unlike their own group post likes" on public.gridster_group_post_likes;
create policy "Users can unlike their own group post likes"
on public.gridster_group_post_likes for delete
to authenticated
using (auth.uid() = user_id);

create table if not exists public.gridster_group_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.gridster_group_post_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint gridster_group_comment_likes_unique unique (comment_id, user_id)
);

alter table public.gridster_group_comment_likes enable row level security;

drop policy if exists "Group comment likes are readable per group privacy" on public.gridster_group_comment_likes;
create policy "Group comment likes are readable per group privacy"
on public.gridster_group_comment_likes for select
using (
  exists (
    select 1 from public.gridster_group_post_comments c
    join public.gridster_group_posts p on p.id = c.post_id
    where c.id = comment_id and public.can_view_group_content(p.group_id)
  )
);

drop policy if exists "Active members can like group comments" on public.gridster_group_comment_likes;
create policy "Active members can like group comments"
on public.gridster_group_comment_likes for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.gridster_group_post_comments c
    join public.gridster_group_posts p on p.id = c.post_id
    where c.id = comment_id and public.is_active_group_member(p.group_id, auth.uid())
  )
);

drop policy if exists "Users can unlike their own group comment likes" on public.gridster_group_comment_likes;
create policy "Users can unlike their own group comment likes"
on public.gridster_group_comment_likes for delete
to authenticated
using (auth.uid() = user_id);

-- =========================
-- Per-user hide + reports
-- =========================

create table if not exists public.gridster_group_post_hides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.gridster_group_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint gridster_group_post_hides_unique unique (user_id, post_id)
);

alter table public.gridster_group_post_hides enable row level security;

drop policy if exists "Users can view their own hidden group posts" on public.gridster_group_post_hides;
create policy "Users can view their own hidden group posts"
on public.gridster_group_post_hides for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can hide group posts for themselves" on public.gridster_group_post_hides;
create policy "Users can hide group posts for themselves"
on public.gridster_group_post_hides for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can unhide their own group posts" on public.gridster_group_post_hides;
create policy "Users can unhide their own group posts"
on public.gridster_group_post_hides for delete
to authenticated
using (auth.uid() = user_id);

create table if not exists public.gridster_group_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.gridster_group_posts(id) on delete cascade,
  comment_id uuid references public.gridster_group_post_comments(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'Spam',
  created_at timestamptz not null default now()
);

alter table public.gridster_group_post_reports enable row level security;

drop policy if exists "Reporters and group moderators can view group post reports" on public.gridster_group_post_reports;
create policy "Reporters and group moderators can view group post reports"
on public.gridster_group_post_reports for select
to authenticated
using (
  auth.uid() = reporter_user_id
  or exists (
    select 1 from public.gridster_group_posts p
    where p.id = post_id and public.is_group_moderator_or_owner(p.group_id, auth.uid())
  )
);

drop policy if exists "Active members can report group posts" on public.gridster_group_post_reports;
create policy "Active members can report group posts"
on public.gridster_group_post_reports for insert
to authenticated
with check (
  auth.uid() = reporter_user_id
  and exists (
    select 1 from public.gridster_group_posts p
    where p.id = post_id and public.is_active_group_member(p.group_id, auth.uid())
  )
);

grant select, insert, delete on public.gridster_group_post_comments to authenticated, service_role;
grant update on public.gridster_group_post_comments to authenticated, service_role;
grant select, insert, delete on public.gridster_group_post_likes to authenticated, service_role;
grant select, insert, delete on public.gridster_group_comment_likes to authenticated, service_role;
grant select, insert, delete on public.gridster_group_post_hides to authenticated, service_role;
grant select, insert on public.gridster_group_post_reports to authenticated, service_role;
