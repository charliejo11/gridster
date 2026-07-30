-- =========================================================
-- Gridster Games: shared rate-limiting / abuse log.
--
-- One generic events table, event_type-discriminated - matching the
-- gridster_teleport_report_events precedent (20260727020000_fix_low_
-- audit_findings.sql) rather than a separate table per game. RLS
-- enabled with ZERO policies - only SECURITY DEFINER functions ever
-- touch it, same idiom as gridster_notifications having no client
-- insert policy.
--
-- This is a monitoring/throttling layer IN ADDITION TO the atomic
-- correctness gates in each game's own tables (unique constraints,
-- row locks, advisory locks) - it exists to blunt scripted/bot
-- hammering, never as a substitute for a real duplicate-prevention
-- constraint.
-- =========================================================

create table if not exists public.gridster_game_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'spin_attempt', 'trivia_start_attempt', 'trivia_answer_attempt',
    'photo_battle_vote_attempt', 'photo_battle_entry_attempt'
  )),
  target_key text,
  created_at timestamptz not null default now()
);

create index if not exists gridster_game_rate_limit_events_lookup_idx
  on public.gridster_game_rate_limit_events (user_id, event_type, created_at desc);

alter table public.gridster_game_rate_limit_events enable row level security;
-- No policies at all, intentionally - unreachable from any client role.

-- Logs one event, then reports whether this user has exceeded
-- max_count of this event_type in the trailing window_seconds
-- (counting the just-logged event itself). Internal-only.
create or replace function public.check_game_rate_limit(
  target_user_id uuid,
  p_event_type text,
  p_target_key text,
  window_seconds integer,
  max_count integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  insert into public.gridster_game_rate_limit_events (user_id, event_type, target_key)
  values (target_user_id, p_event_type, p_target_key);

  select count(*) into recent_count
  from public.gridster_game_rate_limit_events
  where user_id = target_user_id
    and event_type = p_event_type
    and created_at > now() - make_interval(secs => window_seconds);

  return recent_count > max_count;
end;
$$;

revoke execute on function public.check_game_rate_limit(uuid, text, text, integer, integer) from public;
