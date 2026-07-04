alter table public.bling_items
  drop constraint if exists valid_bling_item_type;

alter table public.bling_items
  add constraint valid_bling_item_type check (
    item_type in ('background', 'frame', 'glow', 'badge', 'emote', 'bling_buddy')
  );

alter table public.equipped_cosmetics
  drop constraint if exists valid_equipped_item_type;

alter table public.equipped_cosmetics
  add constraint valid_equipped_item_type check (
    item_type in ('background', 'frame', 'glow', 'badge', 'emote', 'bling_buddy')
  );

insert into public.bling_items
  (slug, name, description, item_type, price, preview_class)
values
  (
    'goth-bat-buddy',
    'Goth Bat Buddy',
    'A tiny dramatic bat with eyeliner, chains, and emotional moonlight energy.',
    'bling_buddy',
    650,
    'bling-buddy-goth-bat'
  ),
  (
    'beach-bunny-buddy',
    'Beach Bunny Buddy',
    'A sunny little bunny with shades, sass, and vacation energy.',
    'bling_buddy',
    600,
    'bling-buddy-beach-bunny'
  ),
  (
    'pixel-fox-buddy',
    'Pixel Fox Buddy',
    'A neon fox with headphones and clever little notification goblin vibes.',
    'bling_buddy',
    700,
    'bling-buddy-pixel-fox'
  ),
  (
    'chaos-raccoon-buddy',
    'Chaos Raccoon Buddy',
    'A hoodie-wearing raccoon with glitter trash energy. Respectfully unhinged.',
    'bling_buddy',
    675,
    'bling-buddy-chaos-raccoon'
  ),
  (
    'glam-cat-buddy',
    'Glam Cat Buddy',
    'A fluffy cat with heart glasses, platform boots, and judgmental sparkle.',
    'bling_buddy',
    700,
    'bling-buddy-glam-cat'
  ),
  (
    'tiny-demon-pup',
    'Tiny Demon Pup',
    'A loyal little chaos puppy with horns, wings, and questionable advice.',
    'bling_buddy',
    750,
    'bling-buddy-demon-pup'
  ),
  (
    'drama-llama-buddy',
    'Drama Llama Buddy',
    'A llama with main character energy and zero chill. Everything is a whole situation.',
    'bling_buddy',
    675,
    'bling-buddy-drama-llama'
  ),
  (
    'neon-axolotl-buddy',
    'Neon Axolotl Buddy',
    'A glowing axolotl that vibes quietly and judges your life choices with a smile.',
    'bling_buddy',
    700,
    'bling-buddy-neon-axolotl'
  ),
  (
    'punk-panda-buddy',
    'Punk Panda Buddy',
    'A mohawked panda with anarchist bamboo energy and a soft heart underneath.',
    'bling_buddy',
    650,
    'bling-buddy-punk-panda'
  ),
  (
    'moon-moth-buddy',
    'Moon Moth Buddy',
    'A dreamy moth that flutters around your profile chasing moonlight and vibes.',
    'bling_buddy',
    725,
    'bling-buddy-moon-moth'
  ),
  (
    'disco-duck-buddy',
    'Disco Duck Buddy',
    'A duck that never stopped dancing since 1978. Quacks in 4/4 time.',
    'bling_buddy',
    675,
    'bling-buddy-disco-duck'
  ),
  (
    'crystal-dragon-buddy',
    'Crystal Dragon Buddy',
    'A tiny gem-scaled dragon hoarding sparkle instead of gold. Rare and proud.',
    'bling_buddy',
    1050,
    'bling-buddy-crystal-dragon'
  )
on conflict (slug)
do update set
  name = excluded.name,
  description = excluded.description,
  item_type = excluded.item_type,
  price = excluded.price,
  preview_class = excluded.preview_class,
  is_active = true;
