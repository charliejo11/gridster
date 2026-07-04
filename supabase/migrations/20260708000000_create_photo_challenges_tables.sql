-- =========================================================
-- Gridster Photo Challenges
-- Weekly photo prompts: users submit entries, vote, admin closes and awards the winner
-- =========================================================

-- =========================
-- 1. Challenges
-- =========================

create table if not exists public.gridster_photo_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  reward_bling_bits integer not null default 500,
  reward_badge_item_id uuid references public.bling_items(id),
  deadline_label text,
  status text not null default 'active',
  winner_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_photo_challenge_status check (
    status in ('active', 'closed')
  ),
  constraint photo_challenge_reward_nonnegative check (reward_bling_bits >= 0)
);

create index if not exists gridster_photo_challenges_status_idx on public.gridster_photo_challenges (status);

comment on table public.gridster_photo_challenges is
  'Admin-managed weekly photo challenge prompts. No owner - created/edited/closed by admins only, gated via profiles.is_admin.';

-- =========================
-- 2. Entries
-- =========================

create table if not exists public.gridster_photo_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.gridster_photo_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  creator_name text,
  photo_url text not null,
  caption text,
  vote_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint photo_entry_vote_count_nonnegative check (vote_count >= 0)
);

create index if not exists gridster_photo_entries_challenge_id_idx on public.gridster_photo_entries (challenge_id);
create index if not exists gridster_photo_entries_user_id_idx on public.gridster_photo_entries (user_id);

-- =========================
-- 3. Votes
-- =========================

create table if not exists public.gridster_photo_votes (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.gridster_photo_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint gridster_photo_votes_unique unique (entry_id, user_id)
);

create index if not exists gridster_photo_votes_entry_id_idx on public.gridster_photo_votes (entry_id);

-- =========================
-- 4. Updated At Triggers
-- (reuses public.set_updated_at() from 20260703090000_create_bling_depot_tables.sql)
-- =========================

drop trigger if exists set_gridster_photo_challenges_updated_at on public.gridster_photo_challenges;

create trigger set_gridster_photo_challenges_updated_at
before update on public.gridster_photo_challenges
for each row
execute function public.set_updated_at();

drop trigger if exists set_gridster_photo_entries_updated_at on public.gridster_photo_entries;

create trigger set_gridster_photo_entries_updated_at
before update on public.gridster_photo_entries
for each row
execute function public.set_updated_at();

-- =========================
-- 5. Vote on an entry
-- =========================

create or replace function public.vote_photo_entry(target_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  inserted_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.gridster_photo_votes (entry_id, user_id)
  values (target_entry_id, current_user_id)
  on conflict (entry_id, user_id) do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    update public.gridster_photo_entries
    set vote_count = vote_count + 1
    where id = target_entry_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'entry_id', target_entry_id,
    'already_voted', inserted_id is null
  );
end;
$$;

-- =========================
-- 6. Close a challenge and award the winner
-- =========================

create or replace function public.close_photo_challenge_and_award_winner(target_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  is_admin_user boolean;
  challenge_record public.gridster_photo_challenges;
  computed_winner_user_id uuid;
  winner_vote_count integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(is_admin, false)
  into is_admin_user
  from public.profiles
  where user_id = current_user_id;

  if not coalesce(is_admin_user, false) then
    raise exception 'Only admins can close a photo challenge';
  end if;

  select *
  into challenge_record
  from public.gridster_photo_challenges
  where id = target_challenge_id;

  if challenge_record.id is null then
    raise exception 'Challenge not found';
  end if;

  select user_id, vote_count
  into computed_winner_user_id, winner_vote_count
  from public.gridster_photo_entries
  where challenge_id = target_challenge_id
  order by vote_count desc, created_at asc
  limit 1;

  update public.gridster_photo_challenges
  set status = 'closed',
      winner_user_id = computed_winner_user_id
  where id = target_challenge_id;

  if computed_winner_user_id is not null then
    insert into public.bling_balances (user_id, balance)
    values (computed_winner_user_id, 1250)
    on conflict (user_id) do nothing;

    update public.bling_balances
    set balance = balance + challenge_record.reward_bling_bits
    where user_id = computed_winner_user_id;

    if challenge_record.reward_badge_item_id is not null then
      insert into public.bling_purchases (user_id, item_id)
      values (computed_winner_user_id, challenge_record.reward_badge_item_id)
      on conflict (user_id, item_id) do nothing;

      insert into public.equipped_cosmetics (user_id, item_type, item_id, equipped_at)
      values (computed_winner_user_id, 'badge', challenge_record.reward_badge_item_id, now())
      on conflict (user_id, item_type) do update set
        item_id = excluded.item_id,
        equipped_at = now();
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'challenge_id', target_challenge_id,
    'winner_user_id', computed_winner_user_id,
    'awarded_bling_bits', challenge_record.reward_bling_bits
  );
end;
$$;

-- =========================
-- 7. Row Level Security
-- =========================

alter table public.gridster_photo_challenges enable row level security;
alter table public.gridster_photo_entries enable row level security;
alter table public.gridster_photo_votes enable row level security;

-- Challenges - public read, admin-only write

drop policy if exists "Photo challenges are publicly readable" on public.gridster_photo_challenges;

create policy "Photo challenges are publicly readable"
on public.gridster_photo_challenges
for select
using (true);

drop policy if exists "Admins can insert photo challenges" on public.gridster_photo_challenges;

create policy "Admins can insert photo challenges"
on public.gridster_photo_challenges
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
);

drop policy if exists "Admins can update photo challenges" on public.gridster_photo_challenges;

create policy "Admins can update photo challenges"
on public.gridster_photo_challenges
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
);

drop policy if exists "Admins can delete photo challenges" on public.gridster_photo_challenges;

create policy "Admins can delete photo challenges"
on public.gridster_photo_challenges
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
);

-- Entries - public read, owner write

drop policy if exists "Photo entries are publicly readable" on public.gridster_photo_entries;

create policy "Photo entries are publicly readable"
on public.gridster_photo_entries
for select
using (true);

drop policy if exists "Users can insert their own photo entries" on public.gridster_photo_entries;

create policy "Users can insert their own photo entries"
on public.gridster_photo_entries
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own photo entries" on public.gridster_photo_entries;

create policy "Users can update their own photo entries"
on public.gridster_photo_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own photo entries" on public.gridster_photo_entries;

create policy "Users can delete their own photo entries"
on public.gridster_photo_entries
for delete
to authenticated
using (auth.uid() = user_id);

-- Votes - read own only, no direct writes (all writes go through vote_photo_entry)

drop policy if exists "Users can read their own photo votes" on public.gridster_photo_votes;

create policy "Users can read their own photo votes"
on public.gridster_photo_votes
for select
to authenticated
using (auth.uid() = user_id);

-- =========================
-- 8. Seed: a generic reward badge
-- =========================

insert into public.bling_items
  (slug, name, description, item_type, price, preview_class)
values
  (
    'photo-challenge-champion',
    'Photo Challenge Champion',
    'Awarded for winning a Gridster weekly Photo Challenge.',
    'badge',
    0,
    'bling-badge-photo-champion'
  )
on conflict (slug)
do update set
  name = excluded.name,
  description = excluded.description,
  item_type = excluded.item_type,
  preview_class = excluded.preview_class,
  is_active = true;
