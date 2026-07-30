-- =========================================================
-- Fix a regression introduced by 20260801000000.
--
-- That migration correctly hid private groups (and their member
-- rosters) from non-members via gridster_groups' own SELECT policy.
-- But "Users can request to join private groups" (on
-- gridster_group_join_requests, from 20260731030000) checks group
-- privacy with a plain subquery against gridster_groups, evaluated
-- under RLS as the CALLER - who, for this exact policy, is always a
-- non-member (that's the whole premise of "requesting to join"). Once
-- private groups became invisible to non-members, that subquery found
-- zero rows for the very group being requested, so
-- `exists(select 1 from gridster_groups g where g.id = group_id and
-- g.privacy = 'private')` always failed and nobody could request to
-- join a private group anymore.
--
-- Same fix pattern as is_active_group_member/is_group_moderator_or_owner:
-- a narrow SECURITY DEFINER helper that only ever returns one column's
-- value for a specific row, bypassing RLS for that lookup alone.
-- =========================================================

create or replace function public.group_privacy(target_group_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select privacy from public.gridster_groups where id = target_group_id;
$$;

drop policy if exists "Users can request to join private groups" on public.gridster_group_join_requests;

create policy "Users can request to join private groups"
on public.gridster_group_join_requests for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.group_privacy(group_id) = 'private'
  and not public.is_active_group_member(group_id, auth.uid())
);
