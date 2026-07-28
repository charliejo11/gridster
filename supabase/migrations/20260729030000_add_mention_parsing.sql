-- =========================================================
-- @mention parsing for posts and comments.
--
-- Trigger-based (not client-side) so parsing logic lives in exactly
-- one place regardless of what writes to these tables, and mention
-- notifications happen in the same transaction as the content itself.
-- Resolves against profiles.sl_username (e.g. "charliejo11.resident"),
-- the SL-handle format already used across the app - not display_name.
-- sl_username has no unique constraint, so duplicates are resolved
-- deterministically (oldest matching profile) rather than erroring.
-- =========================================================

create or replace function public.parse_and_notify_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_text text;
  target_post_id uuid;
  target_comment_id uuid;
  candidate text;
  resolved_user_id uuid;
  match_count integer := 0;
begin
  -- new is a generic `record` inside a trigger function shared by two
  -- tables with different columns - accessing e.g. new.body while
  -- handling a gridster_posts row raises "record new has no field body"
  -- even from an unreached CASE/IF branch in some plpgsql evaluation
  -- paths, so each table's fields are read via to_jsonb(new) instead of
  -- direct dot access, which just returns null for a missing key.
  if tg_table_name = 'gridster_posts' then
    source_text := to_jsonb(new) ->> 'content';
    target_post_id := new.id;
    target_comment_id := null;
  else
    source_text := to_jsonb(new) ->> 'body';
    target_post_id := (to_jsonb(new) ->> 'post_id')::uuid;
    target_comment_id := new.id;
  end if;

  if source_text is null then
    return new;
  end if;

  for candidate in
    select (regexp_matches(source_text, '@([a-zA-Z0-9._]+)', 'g'))[1]
    limit 20
  loop
    select user_id into resolved_user_id
    from public.profiles
    where lower(sl_username) = lower(candidate)
    order by created_at asc
    limit 1;

    if resolved_user_id is not null and resolved_user_id <> new.user_id then
      perform public.create_or_group_notification(
        p_recipient_user_id => resolved_user_id,
        p_actor_user_id => new.user_id,
        p_notification_type => 'mention',
        p_related_post_id => target_post_id,
        p_related_comment_id => target_comment_id
      );
      match_count := match_count + 1;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_post_mentions_trigger on public.gridster_posts;
create trigger notify_post_mentions_trigger
after insert on public.gridster_posts
for each row execute function public.parse_and_notify_mentions();

drop trigger if exists notify_comment_mentions_trigger on public.gridster_post_comments;
create trigger notify_comment_mentions_trigger
after insert on public.gridster_post_comments
for each row execute function public.parse_and_notify_mentions();
