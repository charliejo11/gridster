-- =========================================================
-- Extend @mention parsing (built earlier this session) to group posts
-- and group post comments, same regex/resolution logic, now branching
-- over 4 tables instead of 2 and pointing the notification at the
-- right related_* columns for each.
-- =========================================================

create or replace function public.parse_and_notify_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_text text;
  actor_id uuid;
  target_post_id uuid;
  target_comment_id uuid;
  target_group_post_id uuid;
  target_group_comment_id uuid;
  target_group_id uuid;
  candidate text;
  resolved_user_id uuid;
  match_count integer := 0;
begin
  -- new is a generic `record` here (this trigger function is shared
  -- across 4 tables with different columns, e.g. group comments use
  -- author_user_id where everything else uses user_id) - read every
  -- field via to_jsonb(new) rather than new.<field> so an unreached
  -- branch never errors on a column that doesn't exist for this row.
  if tg_table_name = 'gridster_posts' then
    source_text := to_jsonb(new) ->> 'content';
    actor_id := (to_jsonb(new) ->> 'user_id')::uuid;
    target_post_id := new.id;
  elsif tg_table_name = 'gridster_post_comments' then
    source_text := to_jsonb(new) ->> 'body';
    actor_id := (to_jsonb(new) ->> 'user_id')::uuid;
    target_post_id := (to_jsonb(new) ->> 'post_id')::uuid;
    target_comment_id := new.id;
  elsif tg_table_name = 'gridster_group_posts' then
    source_text := to_jsonb(new) ->> 'content';
    actor_id := (to_jsonb(new) ->> 'user_id')::uuid;
    target_group_post_id := new.id;
    target_group_id := new.group_id;
  elsif tg_table_name = 'gridster_group_post_comments' then
    source_text := to_jsonb(new) ->> 'content';
    actor_id := (to_jsonb(new) ->> 'author_user_id')::uuid;
    target_group_comment_id := new.id;
    select p.id, p.group_id into target_group_post_id, target_group_id
    from public.gridster_group_posts p
    where p.id = new.post_id;
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

    if resolved_user_id is not null and resolved_user_id <> actor_id then
      perform public.create_or_group_notification(
        p_recipient_user_id => resolved_user_id,
        p_actor_user_id => actor_id,
        p_notification_type => 'mention',
        p_related_post_id => target_post_id,
        p_related_comment_id => target_comment_id,
        p_related_group_id => target_group_id,
        p_related_group_post_id => target_group_post_id,
        p_related_group_comment_id => target_group_comment_id
      );
      match_count := match_count + 1;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_group_post_mentions_trigger on public.gridster_group_posts;
create trigger notify_group_post_mentions_trigger
after insert on public.gridster_group_posts
for each row execute function public.parse_and_notify_mentions();

drop trigger if exists notify_group_comment_mentions_trigger on public.gridster_group_post_comments;
create trigger notify_group_comment_mentions_trigger
after insert on public.gridster_group_post_comments
for each row execute function public.parse_and_notify_mentions();
