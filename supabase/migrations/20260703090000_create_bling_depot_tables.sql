-- =========================================================
-- Gridster Bling Depot
-- Starter balance, shop items, purchases, equipped cosmetics
-- =========================================================

create extension if not exists "pgcrypto";

-- =========================
-- 1. User Bling Balances
-- =========================

create table if not exists public.bling_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  balance integer not null default 1250,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bling_balances_user_unique unique (user_id),
  constraint bling_balance_nonnegative check (balance >= 0)
);

-- =========================
-- 2. Bling Shop Items
-- =========================

create table if not exists public.bling_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  item_type text not null,
  price integer not null,
  preview_class text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint valid_bling_item_type check (
    item_type in ('background', 'frame', 'glow', 'badge', 'emote')
  ),

  constraint bling_item_price_nonnegative check (price >= 0)
);

-- =========================
-- 3. Purchases
-- =========================

create table if not exists public.bling_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.bling_items(id) on delete cascade,
  purchased_at timestamptz not null default now(),

  constraint bling_purchases_unique unique (user_id, item_id)
);

-- =========================
-- 4. Equipped Cosmetics
-- =========================

create table if not exists public.equipped_cosmetics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null,
  item_id uuid references public.bling_items(id) on delete set null,
  equipped_at timestamptz not null default now(),

  constraint valid_equipped_item_type check (
    item_type in ('background', 'frame', 'glow', 'badge', 'emote')
  ),

  constraint equipped_cosmetics_unique unique (user_id, item_type)
);

-- =========================
-- 5. Updated At Trigger
-- =========================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_bling_balances_updated_at on public.bling_balances;

create trigger set_bling_balances_updated_at
before update on public.bling_balances
for each row
execute function public.set_updated_at();

-- =========================
-- 6. Starter Balance Helper
-- =========================

create or replace function public.ensure_bling_balance()
returns public.bling_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.bling_balances;
begin
  insert into public.bling_balances (user_id, balance)
  values (auth.uid(), 1250)
  on conflict (user_id)
  do nothing;

  select *
  into result
  from public.bling_balances
  where user_id = auth.uid();

  return result;
end;
$$;

-- =========================
-- 7. Buy Item Function
-- =========================

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
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

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
      'balance', balance_record.balance
    );
  end if;

  if balance_record.balance < item_record.price then
    raise exception 'Not enough Bling Bits';
  end if;

  new_balance := balance_record.balance - item_record.price;

  update public.bling_balances
  set balance = new_balance
  where user_id = current_user_id;

  insert into public.bling_purchases (user_id, item_id)
  values (current_user_id, target_item_id);

  return jsonb_build_object(
    'ok', true,
    'already_owned', false,
    'balance', new_balance,
    'item_id', target_item_id
  );
end;
$$;

-- =========================
-- 8. Equip Item Function
-- =========================

create or replace function public.equip_bling_item(target_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  item_record public.bling_items;
  owns_item boolean;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into item_record
  from public.bling_items
  where id = target_item_id
  and is_active = true;

  if item_record.id is null then
    raise exception 'Item not found';
  end if;

  select exists (
    select 1
    from public.bling_purchases
    where user_id = current_user_id
    and item_id = target_item_id
  )
  into owns_item;

  if owns_item = false then
    raise exception 'You do not own this item';
  end if;

  insert into public.equipped_cosmetics (
    user_id,
    item_type,
    item_id,
    equipped_at
  )
  values (
    current_user_id,
    item_record.item_type,
    target_item_id,
    now()
  )
  on conflict (user_id, item_type)
  do update set
    item_id = excluded.item_id,
    equipped_at = now();

  return jsonb_build_object(
    'ok', true,
    'item_id', target_item_id,
    'item_type', item_record.item_type
  );
end;
$$;

-- =========================
-- 9. Row Level Security
-- =========================

alter table public.bling_balances enable row level security;
alter table public.bling_items enable row level security;
alter table public.bling_purchases enable row level security;
alter table public.equipped_cosmetics enable row level security;

-- Balances

drop policy if exists "Users can read their own bling balance" on public.bling_balances;

create policy "Users can read their own bling balance"
on public.bling_balances
for select
to authenticated
using (auth.uid() = user_id);

-- Items are public to logged-in users

drop policy if exists "Authenticated users can view active bling items" on public.bling_items;

create policy "Authenticated users can view active bling items"
on public.bling_items
for select
to authenticated
using (is_active = true);

-- Purchases

drop policy if exists "Users can read their own bling purchases" on public.bling_purchases;

create policy "Users can read their own bling purchases"
on public.bling_purchases
for select
to authenticated
using (auth.uid() = user_id);

-- Equipped cosmetics

drop policy if exists "Users can read their own equipped cosmetics" on public.equipped_cosmetics;

create policy "Users can read their own equipped cosmetics"
on public.equipped_cosmetics
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view public equipped cosmetics" on public.equipped_cosmetics;

create policy "Users can view public equipped cosmetics"
on public.equipped_cosmetics
for select
to authenticated
using (true);

-- =========================
-- 10. Starter Shop Items
-- =========================

insert into public.bling_items
  (slug, name, description, item_type, price, preview_class)
values
  (
    'midnight-lux-bg',
    'Midnight Lux',
    'A dark luxury profile background with Gridster attitude.',
    'background',
    300,
    'bling-bg-midnight-lux'
  ),
  (
    'pink-neon-bg',
    'Pink Neon Pop',
    'Bright, loud, and absolutely doing the most.',
    'background',
    350,
    'bling-bg-pink-neon'
  ),
  (
    'chrome-frame',
    'Chrome Fame Frame',
    'A shiny frame for people who refuse to be basic.',
    'frame',
    250,
    'bling-frame-chrome'
  ),
  (
    'hot-pink-frame',
    'Hot Pink Drama Frame',
    'Because subtlety left the chat.',
    'frame',
    275,
    'bling-frame-hot-pink'
  ),
  (
    'blue-electric-glow',
    'Blue Electric Glow',
    'A soft electric profile glow.',
    'glow',
    200,
    'bling-glow-blue'
  ),
  (
    'golden-aura-glow',
    'Golden Aura Glow',
    'Rich profile energy. Kinda smug. Very cute.',
    'glow',
    250,
    'bling-glow-gold'
  ),
  (
    'og-gridster-badge',
    'OG Gridster',
    'For the residents who were here before it was cool.',
    'badge',
    150,
    'bling-badge-og'
  ),
  (
    'certified-extra-badge',
    'Certified Extra',
    'Officially too much. We respect it.',
    'badge',
    175,
    'bling-badge-extra'
  )
on conflict (slug)
do update set
  name = excluded.name,
  description = excluded.description,
  item_type = excluded.item_type,
  price = excluded.price,
  preview_class = excluded.preview_class,
  is_active = true;
