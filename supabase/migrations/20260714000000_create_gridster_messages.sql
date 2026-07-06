create table if not exists public.gridster_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint gridster_messages_no_self_message check (sender_id <> recipient_id)
);

create index if not exists gridster_messages_conversation_idx
  on public.gridster_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);

create index if not exists gridster_messages_recipient_unread_idx
  on public.gridster_messages (recipient_id, read_at);

alter table public.gridster_messages enable row level security;

drop policy if exists "Participants can view their messages" on public.gridster_messages;
create policy "Participants can view their messages"
on public.gridster_messages for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "Users can send messages as themselves" on public.gridster_messages;
create policy "Users can send messages as themselves"
on public.gridster_messages for insert
to authenticated
with check (auth.uid() = sender_id);

drop policy if exists "Recipient can mark a message read" on public.gridster_messages;
create policy "Recipient can mark a message read"
on public.gridster_messages for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

comment on table public.gridster_messages is
  'Direct messages between two Gridster residents. Sending is only allowed between accepted friends (enforced in application code).';
