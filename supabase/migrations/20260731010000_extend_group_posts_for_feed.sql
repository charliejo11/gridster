-- =========================================================
-- Extend gridster_group_posts into a real social feed: multi-photo,
-- links, pinning, comment locking, edit tracking, hashtags. Existing
-- photo_url stays as the primary/first image so the Photos tab and
-- any existing rows keep working unchanged.
-- =========================================================

alter table public.gridster_group_posts
  add column if not exists media_urls text[] not null default '{}',
  add column if not exists link_url text,
  add column if not exists comments_enabled boolean not null default true,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references auth.users(id) on delete set null,
  add column if not exists content_edited_at timestamptz,
  add column if not exists tags text[] not null default '{}';

comment on column public.gridster_group_posts.content_edited_at is
  'Set only when the post author edits their own content - distinct from updated_at, which also changes when a moderator pins/locks the post, so moderation actions never falsely show an "Edited" label on someone else''s content.';

create index if not exists gridster_group_posts_pinned_idx
  on public.gridster_group_posts (group_id, is_pinned desc, created_at desc);

-- =========================
-- #hashtag extraction (mirrors gridster_posts.tags, populated here
-- instead of requiring the client to parse it).
-- =========================

create or replace function public.extract_group_post_hashtags()
returns trigger
language plpgsql
as $$
begin
  select coalesce(array_agg(distinct lower(match[1])), '{}')
  into new.tags
  from regexp_matches(coalesce(new.content, ''), '#([a-zA-Z0-9_]+)', 'g') as match;

  return new;
end;
$$;

drop trigger if exists extract_group_post_hashtags_trigger on public.gridster_group_posts;
create trigger extract_group_post_hashtags_trigger
before insert or update of content on public.gridster_group_posts
for each row execute function public.extract_group_post_hashtags();

-- =========================
-- RLS: posts are visible per can_view_group_content (public group, or
-- an active member of a private one). Posting requires active
-- membership; announcements require moderator/owner. Plain UPDATE/
-- DELETE stay author-only - moderator pin/lock/remove goes through
-- security-definer RPCs added in a later migration, not a permissive
-- RLS policy.
-- =========================

drop policy if exists "Group posts are publicly readable" on public.gridster_group_posts;

create policy "Group posts are readable per group privacy"
on public.gridster_group_posts
for select
using (public.can_view_group_content(group_id));

drop policy if exists "Members can post in their groups" on public.gridster_group_posts;

create policy "Active members can post in their groups"
on public.gridster_group_posts
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.is_active_group_member(group_id, auth.uid())
  and (
    post_type <> 'announcement'
    or public.is_group_moderator_or_owner(group_id, auth.uid())
  )
);

-- "Users can update/delete their own group posts" policies from the
-- original migration are unchanged (author-only) and still apply.
