-- Bling Depot catalog cleanup.
--
-- 1. Extends the bling_items read policy so an archived (is_active = false)
--    item stays visible to a user who already owns it or has it equipped -
--    without this, archiving an item a resident owns would make their
--    "Your Collection" entry and any equipped cosmetic silently disappear
--    (the join in getEquippedCosmeticsForUser/getBlingShopData would return
--    null for that item, since RLS previously hid inactive rows from
--    everyone with no exception). New/other users still cannot see
--    archived items at all - this only widens access for the owner.
--
-- 2. Archives (is_active = false) the 12 first-generation Bling Buddies
--    that have never had real artwork in public/images/bling-buddies/ and
--    silently render as a plain emoji instead (BlingBuddyArt.jsx's
--    img-then-fallback logic). Existing owners keep them and can still
--    equip/display them; they just stop appearing for new purchases.

drop policy if exists "Authenticated users can view active bling items" on public.bling_items;

create policy "Authenticated users can view active bling items"
on public.bling_items
for select
to authenticated
using (
  is_active = true
  or exists (
    select 1
    from public.bling_purchases p
    where p.item_id = bling_items.id
      and p.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.equipped_cosmetics e
    where e.item_id = bling_items.id
      and e.user_id = auth.uid()
  )
);

update public.bling_items
set is_active = false
where slug in (
  'goth-bat-buddy',
  'beach-bunny-buddy',
  'pixel-fox-buddy',
  'chaos-raccoon-buddy',
  'glam-cat-buddy',
  'tiny-demon-pup',
  'drama-llama-buddy',
  'neon-axolotl-buddy',
  'punk-panda-buddy',
  'moon-moth-buddy',
  'disco-duck-buddy',
  'crystal-dragon-buddy'
);
