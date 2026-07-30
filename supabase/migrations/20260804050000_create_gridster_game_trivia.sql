-- =========================================================
-- Gridster Games: Trivia.
--
-- Correct answers live in gridster_game_trivia_answer_keys, a table
-- with RLS enabled and ZERO policies - the same idiom already used for
-- gridster_notifications (no client insert policy) and
-- gridster_teleport_report_events (no policies at all). This is the
-- actual enforcement mechanism for "never expose the correct answer
-- before a response is submitted," not a convention choice - no
-- client role can read this table under any circumstances, regardless
-- of what any RPC selects elsewhere.
--
-- gridster_game_trivia_attempts is both the timing anchor (started_at/
-- expires_at, enforced server-side in submit_trivia_answer) and the
-- duplicate-answer gate for Daily Challenge questions (unique on
-- (user_id, daily_challenge_id, question_id) - practice-mode rows have
-- daily_challenge_id = NULL and are intentionally exempt, since
-- practice is unlimited replay by design).
--
-- Leaderboards (gridster_game_trivia_daily_scores) are fed ONLY by
-- Daily Challenge scoring, never practice mode - confirmed decision,
-- closes a farming vector where replaying the same practice question
-- would otherwise inflate an all-time score.
-- =========================================================

create table if not exists public.gridster_game_trivia_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  is_active boolean not null default true
);

alter table public.gridster_game_trivia_categories enable row level security;

drop policy if exists "Active trivia categories are publicly readable" on public.gridster_game_trivia_categories;
create policy "Active trivia categories are publicly readable"
on public.gridster_game_trivia_categories
for select
to authenticated
using (is_active = true);

drop policy if exists "Admins can write trivia categories" on public.gridster_game_trivia_categories;
create policy "Admins can write trivia categories"
on public.gridster_game_trivia_categories
for all
to authenticated
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

create table if not exists public.gridster_game_trivia_questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.gridster_game_trivia_categories(id),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  question_text text not null,
  choices jsonb not null,
  points_base integer not null check (points_base > 0),
  time_limit_seconds integer not null check (time_limit_seconds > 0),
  is_active boolean not null default true
);

alter table public.gridster_game_trivia_questions enable row level security;

drop policy if exists "Active trivia questions are publicly readable" on public.gridster_game_trivia_questions;
create policy "Active trivia questions are publicly readable"
on public.gridster_game_trivia_questions
for select
to authenticated
using (is_active = true);

drop policy if exists "Admins can write trivia questions" on public.gridster_game_trivia_questions;
create policy "Admins can write trivia questions"
on public.gridster_game_trivia_questions
for all
to authenticated
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

create table if not exists public.gridster_game_trivia_answer_keys (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.gridster_game_trivia_questions(id) on delete cascade,
  correct_choice_key text not null,
  explanation text
);

alter table public.gridster_game_trivia_answer_keys enable row level security;
-- No policies at all, intentionally. Unreachable from any client
-- role, before or after a response is submitted - only
-- submit_trivia_answer() (SECURITY DEFINER) ever reads this table.

create table if not exists public.gridster_game_trivia_daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  question_ids uuid[] not null
);

alter table public.gridster_game_trivia_daily_challenges enable row level security;

drop policy if exists "Trivia daily challenges are publicly readable" on public.gridster_game_trivia_daily_challenges;
create policy "Trivia daily challenges are publicly readable"
on public.gridster_game_trivia_daily_challenges
for select
to authenticated
using (true);
-- No write policy - only generate_trivia_daily_challenge() writes here.

create table if not exists public.gridster_game_trivia_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.gridster_game_trivia_questions(id),
  daily_challenge_id uuid references public.gridster_game_trivia_daily_challenges(id),
  round_context text not null check (round_context in ('practice', 'daily')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  answered_at timestamptz,
  submitted_choice_key text,
  is_correct boolean,
  score_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  constraint gridster_game_trivia_daily_attempt_unique unique (user_id, daily_challenge_id, question_id)
);

create index if not exists gridster_game_trivia_attempts_user_idx on public.gridster_game_trivia_attempts (user_id, created_at desc);

alter table public.gridster_game_trivia_attempts enable row level security;

drop policy if exists "Users can view their own trivia attempts" on public.gridster_game_trivia_attempts;
create policy "Users can view their own trivia attempts"
on public.gridster_game_trivia_attempts
for select
to authenticated
using (auth.uid() = user_id);
-- No write policy - only start_trivia_attempt()/submit_trivia_answer() write this.

create table if not exists public.gridster_game_trivia_daily_scores (
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_date date not null,
  score integer not null default 0,
  correct_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, challenge_date)
);

alter table public.gridster_game_trivia_daily_scores enable row level security;

drop policy if exists "Trivia daily scores are publicly readable" on public.gridster_game_trivia_daily_scores;
create policy "Trivia daily scores are publicly readable"
on public.gridster_game_trivia_daily_scores
for select
to authenticated
using (true);
-- Public read = the leaderboard itself (daily: filter by date; all-time: group by user_id, sum(score)).
-- No write policy - only submit_trivia_answer() writes this.

-- Explicit table grants (RLS remains the real gate) - see
-- 20260804020000 for why these aren't left to ambient default
-- privileges. No grants at all on gridster_game_trivia_answer_keys -
-- that table has zero RLS policies AND no grant, doubly unreachable.
grant select on public.gridster_game_trivia_categories to authenticated;
grant insert, update, delete on public.gridster_game_trivia_categories to authenticated;
grant select on public.gridster_game_trivia_questions to authenticated;
grant insert, update, delete on public.gridster_game_trivia_questions to authenticated;
grant select on public.gridster_game_trivia_daily_challenges to authenticated;
grant select on public.gridster_game_trivia_attempts to authenticated;
grant select on public.gridster_game_trivia_daily_scores to authenticated;

-- =========================
-- Seed: one starter category + a small question bank.
-- =========================

insert into public.gridster_game_trivia_categories (slug, name) values
  ('gridster-general', 'Gridster & Second Life')
on conflict (slug) do nothing;

do $$
declare
  cat_id uuid;
  q_id uuid;
begin
  select id into cat_id from public.gridster_game_trivia_categories where slug = 'gridster-general';

  if not exists (select 1 from public.gridster_game_trivia_questions where question_text = 'What currency is used for in-world Second Life transactions?') then
    insert into public.gridster_game_trivia_questions (category_id, difficulty, question_text, choices, points_base, time_limit_seconds)
    values (cat_id, 'easy', 'What currency is used for in-world Second Life transactions?',
      '[{"key":"a","text":"Linden Dollars"},{"key":"b","text":"Bling Bits"},{"key":"c","text":"Grid Coins"},{"key":"d","text":"Credits"}]'::jsonb,
      10, 20)
    returning id into q_id;
    insert into public.gridster_game_trivia_answer_keys (question_id, correct_choice_key, explanation)
    values (q_id, 'a', 'Linden Dollars (L$) are Second Life''s official in-world currency.');
  end if;

  if not exists (select 1 from public.gridster_game_trivia_questions where question_text = 'What does "SLURL" stand for?') then
    insert into public.gridster_game_trivia_questions (category_id, difficulty, question_text, choices, points_base, time_limit_seconds)
    values (cat_id, 'easy', 'What does "SLURL" stand for?',
      '[{"key":"a","text":"Second Life Universal Region Locator"},{"key":"b","text":"Second Life URL"},{"key":"c","text":"Standard Location URL"},{"key":"d","text":"Server Location Reference URL"}]'::jsonb,
      10, 20)
    returning id into q_id;
    insert into public.gridster_game_trivia_answer_keys (question_id, correct_choice_key, explanation)
    values (q_id, 'b', 'A SLURL is a Second Life URL - a web link that opens directly to an in-world location.');
  end if;

  if not exists (select 1 from public.gridster_game_trivia_questions where question_text = 'On Gridster, what does Bling Bits Depot let you spend Bling Bits on?') then
    insert into public.gridster_game_trivia_questions (category_id, difficulty, question_text, choices, points_base, time_limit_seconds)
    values (cat_id, 'medium', 'On Gridster, what does Bling Bits Depot let you spend Bling Bits on?',
      '[{"key":"a","text":"Profile cosmetics like frames, glows, and badges"},{"key":"b","text":"Real Linden Dollars"},{"key":"c","text":"Group memberships"},{"key":"d","text":"Photo challenge entries"}]'::jsonb,
      15, 20)
    returning id into q_id;
    insert into public.gridster_game_trivia_answer_keys (question_id, correct_choice_key, explanation)
    values (q_id, 'a', 'Bling Bits Depot sells cosmetic profile items - backgrounds, frames, glow effects, badges, and emotes.');
  end if;

  if not exists (select 1 from public.gridster_game_trivia_questions where question_text = 'What must a resident do before they can message another resident on Gridster?') then
    insert into public.gridster_game_trivia_questions (category_id, difficulty, question_text, choices, points_base, time_limit_seconds)
    values (cat_id, 'medium', 'What must a resident do before they can message another resident on Gridster?',
      '[{"key":"a","text":"Nothing - anyone can message anyone"},{"key":"b","text":"Follow them"},{"key":"c","text":"Become friends (accepted friend request)"},{"key":"d","text":"Join the same group"}]'::jsonb,
      15, 20)
    returning id into q_id;
    insert into public.gridster_game_trivia_answer_keys (question_id, correct_choice_key, explanation)
    values (q_id, 'c', 'Direct messaging requires an accepted friend request between both residents.');
  end if;

  if not exists (select 1 from public.gridster_game_trivia_questions where question_text = 'Which of these is NOT one of Gridster''s Bling Depot cosmetic item types?') then
    insert into public.gridster_game_trivia_questions (category_id, difficulty, question_text, choices, points_base, time_limit_seconds)
    values (cat_id, 'hard', 'Which of these is NOT one of Gridster''s Bling Depot cosmetic item types?',
      '[{"key":"a","text":"Frame"},{"key":"b","text":"Glow"},{"key":"c","text":"Title"},{"key":"d","text":"Emote"}]'::jsonb,
      20, 15)
    returning id into q_id;
    insert into public.gridster_game_trivia_answer_keys (question_id, correct_choice_key, explanation)
    values (q_id, 'c', 'Bling Depot item types are background, frame, glow, badge, and emote - titles come from Gridster Games leveling, not Bling Depot.');
  end if;

  if not exists (select 1 from public.gridster_game_trivia_questions where question_text = 'What happens to a Gridster Group''s member roster if the group is set to private?') then
    insert into public.gridster_game_trivia_questions (category_id, difficulty, question_text, choices, points_base, time_limit_seconds)
    values (cat_id, 'hard', 'What happens to a Gridster Group''s member roster if the group is set to private?',
      '[{"key":"a","text":"It stays fully public"},{"key":"b","text":"Only active members can see it"},{"key":"c","text":"Only the owner can see it"},{"key":"d","text":"It is deleted"}]'::jsonb,
      20, 15)
    returning id into q_id;
    insert into public.gridster_game_trivia_answer_keys (question_id, correct_choice_key, explanation)
    values (q_id, 'b', 'A private group''s member roster is only visible to that group''s own active members.');
  end if;
end;
$$;

-- =========================
-- RPCs
-- =========================

create or replace function public.start_trivia_attempt(
  target_category_slug text default null,
  target_difficulty text default null,
  target_mode text default 'practice'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  rate_limited boolean;
  today_utc date;
  daily_challenge_row public.gridster_game_trivia_daily_challenges;
  target_question_id uuid;
  question_row public.gridster_game_trivia_questions;
  inserted_id uuid;
  existing_attempt public.gridster_game_trivia_attempts;
  computed_expires_at timestamptz;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if target_mode not in ('practice', 'daily') then
    raise exception 'Invalid mode';
  end if;

  rate_limited := public.check_game_rate_limit(current_user_id, 'trivia_start_attempt', target_mode, 60, 30);

  if rate_limited then
    raise exception 'Too many attempts - please slow down';
  end if;

  if target_mode = 'daily' then
    today_utc := (now() at time zone 'utc')::date;

    select * into daily_challenge_row
    from public.gridster_game_trivia_daily_challenges
    where challenge_date = today_utc;

    if daily_challenge_row.id is null then
      raise exception 'No daily trivia challenge is available yet - check back soon';
    end if;

    select qid into target_question_id
    from unnest(daily_challenge_row.question_ids) with ordinality as t(qid, ord)
    where not exists (
      select 1 from public.gridster_game_trivia_attempts a
      where a.user_id = current_user_id
        and a.daily_challenge_id = daily_challenge_row.id
        and a.question_id = t.qid
    )
    order by ord
    limit 1;

    if target_question_id is null then
      raise exception 'You have already completed today''s trivia challenge';
    end if;
  else
    select id into target_question_id
    from public.gridster_game_trivia_questions q
    where q.is_active = true
      and (target_category_slug is null or q.category_id = (select id from public.gridster_game_trivia_categories where slug = target_category_slug))
      and (target_difficulty is null or q.difficulty = target_difficulty)
    order by random()
    limit 1;

    if target_question_id is null then
      raise exception 'No matching trivia questions available';
    end if;
  end if;

  select * into question_row from public.gridster_game_trivia_questions where id = target_question_id;
  computed_expires_at := now() + make_interval(secs => question_row.time_limit_seconds);

  if target_mode = 'daily' then
    insert into public.gridster_game_trivia_attempts (user_id, question_id, daily_challenge_id, round_context, expires_at)
    values (current_user_id, target_question_id, daily_challenge_row.id, 'daily', computed_expires_at)
    on conflict (user_id, daily_challenge_id, question_id) do nothing
    returning id into inserted_id;

    if inserted_id is null then
      select * into existing_attempt
      from public.gridster_game_trivia_attempts
      where user_id = current_user_id and daily_challenge_id = daily_challenge_row.id and question_id = target_question_id;

      return jsonb_build_object(
        'ok', true, 'already_started', true, 'attempt_id', existing_attempt.id, 'question_id', target_question_id,
        'question_text', question_row.question_text, 'choices', question_row.choices, 'expires_at', existing_attempt.expires_at
      );
    end if;
  else
    insert into public.gridster_game_trivia_attempts (user_id, question_id, daily_challenge_id, round_context, expires_at)
    values (current_user_id, target_question_id, null, 'practice', computed_expires_at)
    returning id into inserted_id;
  end if;

  return jsonb_build_object(
    'ok', true, 'already_started', false, 'attempt_id', inserted_id, 'question_id', target_question_id,
    'question_text', question_row.question_text, 'choices', question_row.choices, 'expires_at', computed_expires_at
  );
end;
$$;

create or replace function public.submit_trivia_answer(target_attempt_id uuid, chosen_choice_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  rate_limited boolean;
  attempt_row public.gridster_game_trivia_attempts;
  question_row public.gridster_game_trivia_questions;
  correct_key text;
  explanation_text text;
  is_correct_answer boolean;
  awarded_score integer;
  challenge_date_val date;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  rate_limited := public.check_game_rate_limit(current_user_id, 'trivia_answer_attempt', target_attempt_id::text, 60, 30);

  if rate_limited then
    raise exception 'Too many attempts - please slow down';
  end if;

  -- Row lock scoped to the caller's own single-use row - safe because
  -- exactly one row exists, owned by exactly one user, so no
  -- cross-caller race is possible the way there is with a fresh-row
  -- insert race elsewhere in this migration set.
  select * into attempt_row
  from public.gridster_game_trivia_attempts
  where id = target_attempt_id and user_id = current_user_id
  for update;

  if attempt_row.id is null then
    raise exception 'Attempt not found';
  end if;

  if attempt_row.answered_at is not null then
    return jsonb_build_object(
      'ok', true, 'already_answered', true,
      'is_correct', attempt_row.is_correct, 'score_awarded', attempt_row.score_awarded
    );
  end if;

  select * into question_row from public.gridster_game_trivia_questions where id = attempt_row.question_id;

  if now() > attempt_row.expires_at then
    update public.gridster_game_trivia_attempts
    set answered_at = now(), submitted_choice_key = chosen_choice_key, is_correct = false, score_awarded = 0
    where id = target_attempt_id;

    return jsonb_build_object('ok', true, 'already_answered', false, 'is_correct', false, 'score_awarded', 0, 'expired', true);
  end if;

  -- Only reached AFTER the choice is already committed server-side -
  -- this is the first and only read of the answer key, and it never
  -- happens before a response has been submitted.
  select correct_choice_key, explanation into correct_key, explanation_text
  from public.gridster_game_trivia_answer_keys
  where question_id = attempt_row.question_id;

  is_correct_answer := (chosen_choice_key = correct_key);
  awarded_score := case when is_correct_answer then question_row.points_base else 0 end;

  update public.gridster_game_trivia_attempts
  set answered_at = now(), submitted_choice_key = chosen_choice_key, is_correct = is_correct_answer, score_awarded = awarded_score
  where id = target_attempt_id;

  if attempt_row.round_context = 'daily' then
    select challenge_date into challenge_date_val
    from public.gridster_game_trivia_daily_challenges
    where id = attempt_row.daily_challenge_id;

    if is_correct_answer then
      insert into public.gridster_game_trivia_daily_scores (user_id, challenge_date, score, correct_count)
      values (current_user_id, challenge_date_val, awarded_score, 1)
      on conflict (user_id, challenge_date) do update
        set score = public.gridster_game_trivia_daily_scores.score + excluded.score,
            correct_count = public.gridster_game_trivia_daily_scores.correct_count + 1,
            updated_at = now();

      perform public.grant_game_xp(current_user_id, awarded_score, 'trivia_daily_correct');
      perform public.check_and_grant_game_achievements(current_user_id);
    end if;

    -- Fires once every question in today's set has been attempted,
    -- regardless of whether the final one was answered correctly.
    if not exists (
      select 1
      from unnest((select question_ids from public.gridster_game_trivia_daily_challenges where id = attempt_row.daily_challenge_id)) as qid
      where not exists (
        select 1 from public.gridster_game_trivia_attempts a
        where a.user_id = current_user_id
          and a.daily_challenge_id = attempt_row.daily_challenge_id
          and a.question_id = qid
          and a.answered_at is not null
      )
    ) then
      perform public.create_or_group_notification(
        p_recipient_user_id => current_user_id,
        p_actor_user_id => null,
        p_notification_type => 'game_trivia_daily_complete'
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true, 'already_answered', false,
    'is_correct', is_correct_answer, 'score_awarded', awarded_score, 'explanation', explanation_text
  );
end;
$$;

create or replace function public.generate_trivia_daily_challenge(target_date date default ((now() at time zone 'utc')::date))
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin_user boolean;
  selected_ids uuid[];
  inserted_id uuid;
begin
  -- "System or admin": a service_role/cron caller has no end-user JWT
  -- (auth.uid() is null) and is always allowed; an authenticated
  -- client must be an admin. Generalizes the null-actor rule already
  -- used by create_or_group_notification.
  if auth.uid() is not null then
    select coalesce(is_admin, false) into is_admin_user from public.profiles where user_id = auth.uid();

    if not coalesce(is_admin_user, false) then
      raise exception 'Admin access required';
    end if;
  end if;

  select array_agg(id) into selected_ids
  from (
    select id from public.gridster_game_trivia_questions where is_active = true order by random() limit 5
  ) sub;

  if selected_ids is null or array_length(selected_ids, 1) is null then
    raise exception 'No active trivia questions available to build a daily challenge';
  end if;

  insert into public.gridster_game_trivia_daily_challenges (challenge_date, question_ids)
  values (target_date, selected_ids)
  on conflict (challenge_date) do nothing
  returning id into inserted_id;

  return jsonb_build_object('ok', true, 'already_exists', inserted_id is null, 'challenge_date', target_date);
end;
$$;
