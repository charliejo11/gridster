-- =========================================================
-- Security audit fixes (medium-priority findings)
--
-- 5. close_photo_challenge_and_award_winner had no guard against
--    being called on an already-closed challenge - a retry (or an
--    admin clicking twice) re-granted the winner's Bling Bits every
--    time. The badge grant was already safe (on conflict do
--    nothing / idempotent upsert); only the balance increment
--    wasn't gated.
-- 6. gridster_posts.is_public/is_deleted/moderation_status had no
--    legitimate client write path yet (confirmed: unreferenced
--    anywhere in src/), but were covered by the same owner-update
--    policy as post content - pinning them now, before a moderation
--    workflow exists to need them, closes the gap for free.
-- 7. gridster_post_shares had no dedup constraint. Lower actual
--    impact than it first looks: gridster_post_engagement_stats
--    already uses count(distinct sh.user_id), so Trending itself
--    was never gameable by spam-sharing - this is about preventing
--    pointless unbounded row growth from repeat-clicking the same
--    share button, not a scoring exploit.
-- =========================================================

-- ---------------------------------------------------------
-- 5. Photo challenge close idempotency
-- ---------------------------------------------------------

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

  -- Row lock so two concurrent close calls (or a retried request)
  -- can't both read status='active' before either commits - the
  -- second one always sees the first's 'closed' write.
  select *
  into challenge_record
  from public.gridster_photo_challenges
  where id = target_challenge_id
  for update;

  if challenge_record.id is null then
    raise exception 'Challenge not found';
  end if;

  if challenge_record.status <> 'active' then
    return jsonb_build_object(
      'ok', true,
      'already_closed', true,
      'challenge_id', target_challenge_id,
      'winner_user_id', challenge_record.winner_user_id
    );
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
    'already_closed', false,
    'challenge_id', target_challenge_id,
    'winner_user_id', computed_winner_user_id,
    'awarded_bling_bits', challenge_record.reward_bling_bits
  );
end;
$$;

-- ---------------------------------------------------------
-- 6. Pin post moderation/visibility columns - not settable by the
--    post owner they apply to, same pattern as profiles.account_status.
-- ---------------------------------------------------------

drop policy if exists "Users can update their own posts" on public.gridster_posts;

create policy "Users can update their own posts"
on public.gridster_posts
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and is_public = (select p.is_public from public.gridster_posts p where p.id = gridster_posts.id)
  and is_deleted = (select p.is_deleted from public.gridster_posts p where p.id = gridster_posts.id)
  and moderation_status = (select p.moderation_status from public.gridster_posts p where p.id = gridster_posts.id)
);

comment on column public.gridster_posts.is_public is
  'Whether the post is publicly visible. Not settable by the post owner - pinned in the update policy, same as profiles.account_status. No workflow writes this yet (confirmed unreferenced in src/); this is here so one can be added later without also having to add the RLS gap-closing at the same time.';
comment on column public.gridster_posts.moderation_status is
  'Moderation state used to gate boosting. Not settable by the post owner - pinned in the update policy, same as profiles.account_status. No moderation review workflow exists yet.';

-- ---------------------------------------------------------
-- 7. Dedup shares per (post, user, share_type) - a user can still
--    log a repost AND a copy_link AND a message share for the same
--    post (three distinct, meaningful actions), just not spam the
--    same share_type repeatedly.
-- ---------------------------------------------------------

delete from public.gridster_post_shares a
using public.gridster_post_shares b
where a.post_id = b.post_id
  and a.user_id = b.user_id
  and a.share_type = b.share_type
  and a.created_at > b.created_at;

alter table public.gridster_post_shares
add constraint gridster_post_shares_unique unique (post_id, user_id, share_type);

comment on constraint gridster_post_shares_unique on public.gridster_post_shares is
  'One row per (post, user, share_type) - a user can log distinct share mechanisms for the same post, just not spam-repeat the same one. Trending itself was never affected by this gap (gridster_post_engagement_stats already uses count(distinct user_id)) - this is about preventing unbounded row growth, not a scoring fix.';
