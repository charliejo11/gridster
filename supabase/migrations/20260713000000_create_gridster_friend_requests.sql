create table if not exists public.gridster_friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  sender_seen boolean not null default false,
  recipient_seen boolean not null default false,
  constraint gridster_friend_requests_no_self_request check (sender_id <> recipient_id),
  constraint gridster_friend_requests_unique_pair unique (sender_id, recipient_id)
);

create index if not exists gridster_friend_requests_recipient_idx
  on public.gridster_friend_requests (recipient_id, status);

create index if not exists gridster_friend_requests_sender_idx
  on public.gridster_friend_requests (sender_id, status);

alter table public.gridster_friend_requests enable row level security;

drop policy if exists "Users can view their own friend requests" on public.gridster_friend_requests;
create policy "Users can view their own friend requests"
on public.gridster_friend_requests for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "Users can send friend requests" on public.gridster_friend_requests;
create policy "Users can send friend requests"
on public.gridster_friend_requests for insert
to authenticated
with check (auth.uid() = sender_id);

drop policy if exists "Participants can update a friend request" on public.gridster_friend_requests;
create policy "Participants can update a friend request"
on public.gridster_friend_requests for update
to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id)
with check (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "Sender can delete their own request" on public.gridster_friend_requests;
create policy "Sender can delete their own request"
on public.gridster_friend_requests for delete
to authenticated
using (auth.uid() = sender_id);

comment on table public.gridster_friend_requests is
  'Friend requests between Gridster profiles. A row with status=accepted means both users are friends.';
