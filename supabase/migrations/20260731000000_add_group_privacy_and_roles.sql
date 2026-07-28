-- =========================================================
-- Group privacy + membership roles/status.
--
-- Every group was public and self-joinable with no member roles beyond
-- gridster_groups.owner_user_id. This adds the privacy axis (public/
-- private) and real per-member role (owner/moderator/member) and
-- status (active/suspended/banned) needed for the group posting
-- system's permission model.
-- =========================================================

alter table public.gridster_groups
  add column if not exists privacy text not null default 'public';

alter table public.gridster_groups
  drop constraint if exists valid_group_privacy;

alter table public.gridster_groups
  add constraint valid_group_privacy check (privacy in ('public', 'private'));

alter table public.gridster_group_members
  add column if not exists role text not null default 'member';

alter table public.gridster_group_members
  add column if not exists status text not null default 'active';

alter table public.gridster_group_members
  drop constraint if exists valid_group_member_role;

alter table public.gridster_group_members
  add constraint valid_group_member_role check (role in ('owner', 'moderator', 'member'));

alter table public.gridster_group_members
  drop constraint if exists valid_group_member_status;

alter table public.gridster_group_members
  add constraint valid_group_member_status check (status in ('active', 'suspended', 'banned'));

-- Backfill: every existing group's owner_user_id already has a member
-- row (from auto_join_group_owner) - promote it to role='owner'.
update public.gridster_group_members m
set role = 'owner'
from public.gridster_groups g
where g.id = m.group_id
  and g.owner_user_id = m.user_id
  and m.role <> 'owner';

create index if not exists gridster_group_members_role_idx on public.gridster_group_members (group_id, role);
create index if not exists gridster_group_members_status_idx on public.gridster_group_members (group_id, status);

-- auto_join_group_owner now sets role='owner' explicitly on new groups.
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

  insert into public.gridster_group_members (group_id, user_id, display_name, role, status)
  values (new.id, new.owner_user_id, owner_display_name, 'owner', 'active')
  on conflict (group_id, user_id) do update set role = 'owner';

  return new;
end;
$$;

-- member_count now only counts active members - suspended/banned
-- members shouldn't inflate the visible headcount.
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
    where group_id = affected_group_id and status = 'active'
  )
  where id = affected_group_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_group_member_count_trigger on public.gridster_group_members;

create trigger sync_group_member_count_trigger
after insert or delete or update of status on public.gridster_group_members
for each row
execute function public.sync_group_member_count();

-- =========================
-- Reusable RLS helper functions
-- =========================

create or replace function public.is_active_group_member(target_group_id uuid, target_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.gridster_group_members
    where group_id = target_group_id and user_id = target_user_id and status = 'active'
  );
$$;

create or replace function public.is_group_moderator_or_owner(target_group_id uuid, target_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.gridster_group_members
    where group_id = target_group_id and user_id = target_user_id
      and status = 'active' and role in ('owner', 'moderator')
  );
$$;

create or replace function public.can_view_group_content(target_group_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.gridster_groups g
    where g.id = target_group_id
      and (g.privacy = 'public' or public.is_active_group_member(target_group_id, auth.uid()))
  );
$$;

-- =========================
-- Members INSERT: public groups stay self-service; private groups only
-- via an accepted invite (respondToGroupInvite already flips the invite
-- to accepted before inserting membership) or the join-request approval
-- RPC (security definer, bypasses RLS).
-- =========================

drop policy if exists "Users can join groups themselves" on public.gridster_group_members;

create policy "Users can join public groups, or private groups via an accepted invite"
on public.gridster_group_members
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    exists (select 1 from public.gridster_groups g where g.id = group_id and g.privacy = 'public')
    or exists (
      select 1 from public.gridster_group_invites gi
      where gi.group_id = gridster_group_members.group_id
        and gi.invitee_user_id = auth.uid()
        and gi.status = 'accepted'
    )
  )
);
