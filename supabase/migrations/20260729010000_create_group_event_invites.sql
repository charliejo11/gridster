-- =========================================================
-- Group invites and event invites/RSVPs.
--
-- Neither existed before this migration - joining a group was
-- previously 100% self-service (browse and click), and events had no
-- attendee list at all. Both are needed for real "group invitation"
-- and "event invitation"/"event reminder" notifications rather than
-- notifying on something that can't actually happen yet.
-- =========================================================

create table if not exists public.gridster_group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.gridster_groups(id) on delete cascade,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint gridster_group_invites_no_self_invite check (inviter_user_id <> invitee_user_id),
  constraint gridster_group_invites_unique unique (group_id, invitee_user_id)
);

alter table public.gridster_group_invites enable row level security;

drop policy if exists "Participants can view a group invite" on public.gridster_group_invites;
create policy "Participants can view a group invite"
  on public.gridster_group_invites for select to authenticated
  using (auth.uid() = inviter_user_id or auth.uid() = invitee_user_id);

drop policy if exists "Members can invite others to their group" on public.gridster_group_invites;
create policy "Members can invite others to their group"
  on public.gridster_group_invites for insert to authenticated
  with check (
    auth.uid() = inviter_user_id
    and exists (
      select 1 from public.gridster_group_members m
      where m.group_id = gridster_group_invites.group_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "Invitee or inviter can update a group invite" on public.gridster_group_invites;
create policy "Invitee or inviter can update a group invite"
  on public.gridster_group_invites for update to authenticated
  using (auth.uid() = invitee_user_id or auth.uid() = inviter_user_id)
  with check (auth.uid() = invitee_user_id or auth.uid() = inviter_user_id);

drop policy if exists "Inviter can delete a group invite" on public.gridster_group_invites;
create policy "Inviter can delete a group invite"
  on public.gridster_group_invites for delete to authenticated
  using (auth.uid() = inviter_user_id);

grant select, insert, update, delete on public.gridster_group_invites to authenticated, service_role;

create table if not exists public.gridster_event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.gridster_events(id) on delete cascade,
  inviter_user_id uuid references auth.users(id) on delete set null,
  invitee_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'going', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  reminder_sent_at timestamptz,
  constraint gridster_event_invites_unique unique (event_id, invitee_user_id)
);

comment on column public.gridster_event_invites.inviter_user_id is
  'Null means a self-RSVP ("I''m going"), not an invite from someone else.';
comment on column public.gridster_event_invites.reminder_sent_at is
  'Set by the hourly event-reminder cron so a reminder never fires twice for the same invite.';

alter table public.gridster_event_invites enable row level security;

drop policy if exists "Event invites and RSVPs are publicly readable" on public.gridster_event_invites;
create policy "Event invites and RSVPs are publicly readable"
  on public.gridster_event_invites for select
  using (true);

drop policy if exists "Users can RSVP or invite themselves and others" on public.gridster_event_invites;
create policy "Users can RSVP or invite themselves and others"
  on public.gridster_event_invites for insert to authenticated
  with check (
    (auth.uid() = invitee_user_id and inviter_user_id is null)
    or (auth.uid() = inviter_user_id and inviter_user_id <> invitee_user_id)
  );

drop policy if exists "Invitee can update their own RSVP status" on public.gridster_event_invites;
create policy "Invitee can update their own RSVP status"
  on public.gridster_event_invites for update to authenticated
  using (auth.uid() = invitee_user_id)
  with check (auth.uid() = invitee_user_id);

drop policy if exists "Invitee or inviter can remove an invite or RSVP" on public.gridster_event_invites;
create policy "Invitee or inviter can remove an invite or RSVP"
  on public.gridster_event_invites for delete to authenticated
  using (auth.uid() = invitee_user_id or auth.uid() = inviter_user_id);

grant select, insert, update, delete on public.gridster_event_invites to anon, authenticated, service_role;

create index if not exists gridster_event_invites_reminder_idx
  on public.gridster_event_invites (event_id, status, reminder_sent_at);
