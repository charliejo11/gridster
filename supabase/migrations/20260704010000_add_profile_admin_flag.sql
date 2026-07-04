alter table public.profiles
add column if not exists is_admin boolean not null default false;

drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and is_admin = (select p.is_admin from public.profiles p where p.user_id = auth.uid())
  );

comment on column public.profiles.is_admin is
  'Owner/admin flag. Grants unlimited free Bling Depot purchases. Not settable by users themselves - only changeable via a direct database update, enforced by the update RLS policy.';

create or replace function public.buy_bling_item(target_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  item_record public.bling_items;
  balance_record public.bling_balances;
  already_owned boolean;
  new_balance integer;
  is_admin_user boolean;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(is_admin, false)
  into is_admin_user
  from public.profiles
  where user_id = current_user_id;

  select *
  into item_record
  from public.bling_items
  where id = target_item_id
  and is_active = true;

  if item_record.id is null then
    raise exception 'Item not found';
  end if;

  insert into public.bling_balances (user_id, balance)
  values (current_user_id, 1250)
  on conflict (user_id)
  do nothing;

  select *
  into balance_record
  from public.bling_balances
  where user_id = current_user_id
  for update;

  select exists (
    select 1
    from public.bling_purchases
    where user_id = current_user_id
    and item_id = target_item_id
  )
  into already_owned;

  if already_owned then
    return jsonb_build_object(
      'ok', true,
      'already_owned', true,
      'balance', balance_record.balance,
      'is_admin', coalesce(is_admin_user, false)
    );
  end if;

  if coalesce(is_admin_user, false) then
    new_balance := balance_record.balance;
  else
    if balance_record.balance < item_record.price then
      raise exception 'Not enough Bling Bits';
    end if;

    new_balance := balance_record.balance - item_record.price;

    update public.bling_balances
    set balance = new_balance
    where user_id = current_user_id;
  end if;

  insert into public.bling_purchases (user_id, item_id)
  values (current_user_id, target_item_id);

  return jsonb_build_object(
    'ok', true,
    'already_owned', false,
    'balance', new_balance,
    'item_id', target_item_id,
    'is_admin', coalesce(is_admin_user, false)
  );
end;
$$;
