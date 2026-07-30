-- =========================================================
-- First-pass security review of previously-unaudited areas (bookings,
-- creator pages, followers, sponsors, teleport status, notifications)
-- turned up two real findings, one of them critical:
--
-- 1. CRITICAL: credit_gridster_plus_linden_payment and
--    grant_plus_monthly_bonus are SECURITY DEFINER functions with no
--    internal caller check AND no explicit GRANT restricting who can
--    call them. Postgres grants EXECUTE to PUBLIC by default unless
--    revoked, and neither function had that revoked - so any logged-in
--    user could call them directly (bypassing the Worker's HMAC
--    signature check for the Linden kiosk, and Stripe's webhook
--    signature for the monthly bonus) and self-grant Gridster Plus and
--    Bling Bits with a self-invented, never-actually-paid
--    payment_reference / invoice_id. Confirmed exploitable against
--    gridster-test before writing this fix. Both are only ever called
--    from worker/ using the service_role client - restricting EXECUTE
--    to service_role only (matching what they've always actually
--    needed) closes this with no legitimate-path impact.
--
-- 2. HIGH: create_or_group_notification's p_actor_user_id => null path
--    (meant for system-generated notifications: bonuses, purchases,
--    announcements) skipped all checks - any authenticated user could
--    call it directly with a null actor and forge a notification of
--    ANY type (including account_announcement) to ANY recipient with
--    attacker-chosen title/message/amount, bypassing the admin-gated
--    broadcast_account_announcement() wrapper entirely. Every
--    legitimate null-actor call site either (a) is invoked from the
--    Worker via the service_role client, where auth.uid() is null
--    (no end-user JWT), or (b) is invoked by an authenticated user
--    notifying themselves about their own action (recipient == caller).
--    Requiring one of those two conditions when the actor is null
--    preserves every real call site while closing the forgery path.
--
-- 3. Follows: matches the pre-fix messaging bug exactly - blocking
--    (gridster_creator_actions) was never wired into the follows
--    INSERT policy, so a user could keep following someone who blocked
--    them. Reuses is_blocked_either_direction() from 20260801000000.
-- =========================================================

revoke execute on function public.credit_gridster_plus_linden_payment(text, integer, text, text, integer) from public;
revoke execute on function public.credit_gridster_plus_linden_payment(text, integer, text, text, integer) from authenticated;
grant execute on function public.credit_gridster_plus_linden_payment(text, integer, text, text, integer) to service_role;

revoke execute on function public.grant_plus_monthly_bonus(uuid, text, integer) from public;
revoke execute on function public.grant_plus_monthly_bonus(uuid, text, integer) from authenticated;
grant execute on function public.grant_plus_monthly_bonus(uuid, text, integer) to service_role;

create or replace function public.create_or_group_notification(
  p_recipient_user_id uuid,
  p_actor_user_id uuid,
  p_notification_type text,
  p_related_post_id uuid default null,
  p_related_comment_id uuid default null,
  p_related_message_id uuid default null,
  p_related_event_id uuid default null,
  p_related_group_id uuid default null,
  p_related_group_post_id uuid default null,
  p_related_group_comment_id uuid default null,
  p_related_user_id uuid default null,
  p_related_request_id uuid default null,
  p_related_transaction_id uuid default null,
  p_amount integer default null,
  p_title text default null,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  is_groupable boolean;
  computed_group_key text;
  existing_id uuid;
  result_id uuid;
begin
  if p_recipient_user_id is null or p_notification_type is null then
    raise exception 'recipient and notification_type are required';
  end if;

  if p_actor_user_id is not null and p_actor_user_id <> auth.uid() then
    raise exception 'actor_user_id must match the authenticated user';
  end if;

  -- System-generated notifications (actor is null) are only legitimate
  -- when either: the caller is the Worker's service_role connection
  -- (no end-user JWT, so auth.uid() is null), or an authenticated user
  -- is notifying themselves about their own bonus/purchase. Anything
  -- else is a direct client trying to forge a system notification to
  -- someone else (e.g. a fake account_announcement).
  if p_actor_user_id is null and auth.uid() is not null and p_recipient_user_id <> auth.uid() then
    raise exception 'Cannot create a system notification for another user';
  end if;

  if p_actor_user_id is not null and p_actor_user_id = p_recipient_user_id then
    return null;
  end if;

  if p_notification_type = 'new_message' then
    p_message := null;
  end if;

  is_groupable := p_notification_type in ('post_liked', 'post_commented', 'new_message', 'group_post_liked', 'group_post_commented');

  if is_groupable then
    computed_group_key := p_notification_type || ':' || p_recipient_user_id::text || ':' ||
      case p_notification_type
        when 'new_message' then coalesce(p_actor_user_id::text, '')
        when 'group_post_liked' then coalesce(p_related_group_post_id::text, '')
        when 'group_post_commented' then coalesce(p_related_group_post_id::text, '')
        else coalesce(p_related_post_id::text, '')
      end;

    perform pg_advisory_xact_lock(hashtext(computed_group_key));

    select id into existing_id
    from public.gridster_notifications
    where recipient_user_id = p_recipient_user_id
      and group_key = computed_group_key
      and is_read = false
    order by created_at desc
    limit 1
    for update;

    if existing_id is not null then
      update public.gridster_notifications
      set actor_user_id = coalesce(p_actor_user_id, actor_user_id),
          grouped_actor_ids = case
            when p_actor_user_id is null or p_actor_user_id = any(grouped_actor_ids) then grouped_actor_ids
            else (array[p_actor_user_id] || grouped_actor_ids)[1:6]
          end,
          actor_count = case
            when p_actor_user_id is null or p_actor_user_id = any(grouped_actor_ids) then actor_count
            else actor_count + 1
          end,
          title = coalesce(p_title, title),
          message = coalesce(p_message, message),
          amount = coalesce(p_amount, amount),
          related_comment_id = coalesce(p_related_comment_id, related_comment_id),
          related_message_id = coalesce(p_related_message_id, related_message_id),
          related_group_comment_id = coalesce(p_related_group_comment_id, related_group_comment_id),
          created_at = now(),
          updated_at = now()
      where id = existing_id
      returning id into result_id;

      return result_id;
    end if;
  end if;

  insert into public.gridster_notifications (
    recipient_user_id, actor_user_id, notification_type, group_key,
    related_post_id, related_comment_id, related_message_id, related_event_id,
    related_group_id, related_group_post_id, related_group_comment_id,
    related_user_id, related_request_id, related_transaction_id,
    amount, title, message, grouped_actor_ids, actor_count
  )
  values (
    p_recipient_user_id, p_actor_user_id, p_notification_type, computed_group_key,
    p_related_post_id, p_related_comment_id, p_related_message_id, p_related_event_id,
    p_related_group_id, p_related_group_post_id, p_related_group_comment_id,
    p_related_user_id, p_related_request_id, p_related_transaction_id,
    p_amount, p_title, p_message,
    case when p_actor_user_id is null then '{}'::uuid[] else array[p_actor_user_id] end,
    1
  )
  returning id into result_id;

  return result_id;
end;
$$;

grant execute on function public.create_or_group_notification(
  uuid, uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, integer, text, text
) to authenticated, service_role;

-- Follows: block in either direction blocks the follow too.
drop policy if exists "Users can follow as themselves" on public.gridster_follows;

create policy "Users can follow as themselves"
on public.gridster_follows
for insert
to authenticated
with check (
  auth.uid() = follower_id
  and not public.is_blocked_either_direction(follower_id, followed_id)
);
