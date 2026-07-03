-- Adds limited seasonal fields and the Halloween Bling Depot drop.

alter table public.bling_items
add column if not exists season text,
add column if not exists limited boolean not null default false;

insert into public.bling_items
  (slug, name, description, item_type, price, preview_class, season, limited)
values
  (
    'haunted-manor-bg',
    'Haunted Manor',
    'A spooky mansion background for residents who thrive in dramatic lighting.',
    'background',
    550,
    'bling-bg-haunted-manor',
    'halloween',
    true
  ),
  (
    'blood-moon-bg',
    'Blood Moon',
    'Big ominous moon energy. Probably cursed. Definitely pretty.',
    'background',
    600,
    'bling-bg-blood-moon',
    'halloween',
    true
  ),
  (
    'black-lace-coffin-frame',
    'Black Lace Coffin',
    'A coffin-inspired frame with a little lace and a lot of attitude.',
    'frame',
    450,
    'bling-frame-black-lace-coffin',
    'halloween',
    true
  ),
  (
    'ghost-flame-glow',
    'Ghost Flame Glow',
    'A spectral glow for the prettiest haunt in the room.',
    'glow',
    350,
    'bling-glow-ghost-flame',
    'halloween',
    true
  ),
  (
    'witch-please-badge',
    'Witch Please',
    'For magical nonsense and seasonal disrespect.',
    'badge',
    225,
    'bling-badge-witch-please',
    'halloween',
    true
  ),
  (
    'certified-creature-badge',
    'Certified Creature',
    'Officially spooky, professionally cute.',
    'badge',
    275,
    'bling-badge-certified-creature',
    'halloween',
    true
  )
on conflict (slug)
do update set
  name = excluded.name,
  description = excluded.description,
  item_type = excluded.item_type,
  price = excluded.price,
  preview_class = excluded.preview_class,
  season = excluded.season,
  limited = excluded.limited,
  is_active = true;
