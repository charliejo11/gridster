-- =========================================================
-- Request-to-join queue for private groups. Public groups don't use
-- this at all (joinGroup stays a plain self-service insert for them).
-- =========================================================

create table if not exists public.gridster_group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.gridster_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  responded_by uuid references auth.users(id) on delete set null,

  constraint valid_group_join_request_status check (status in ('pending', 'approved', 'denied')),
  constraint gridster_group_join_requests_unique unique (group_id, user_id)
);

create index if not exists gridster_group_join_requests_group_idx
  on public.gridster_group_join_requests (group_id, status);

alter table public.gridster_group_join_requests enable row level security;

drop policy if exists "Requesters and group moderators can view join requests" on public.gridster_group_join_requests;
create policy "Requesters and group moderators can view join requests"
on public.gridster_group_join_requests for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_group_moderator_or_owner(group_id, auth.uid())
);

drop policy if exists "Users can request to join private groups" on public.gridster_group_join_requests;
create policy "Users can request to join private groups"
on public.gridster_group_join_requests for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (select 1 from public.gridster_groups g where g.id = group_id and g.privacy = 'private')
  and not public.is_active_group_member(group_id, auth.uid())
);

drop policy if exists "Requesters can cancel their own pending request" on public.gridster_group_join_requests;
create policy "Requesters can cancel their own pending request"
on public.gridster_group_join_requests for delete
to authenticated
using (auth.uid() = user_id and status = 'pending');

-- No client update policy - approve/deny only via respond_to_group_join_request()
-- (security definer, added in the moderator-RPCs migration).

grant select, insert, delete on public.gridster_group_join_requests to authenticated, service_role;
grant update on public.gridster_group_join_requests to service_role;
