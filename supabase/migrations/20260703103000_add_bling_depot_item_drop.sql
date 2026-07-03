-- Adds the first named Bling Depot inventory drop.

insert into public.bling_items
  (slug, name, description, item_type, price, preview_class)
values
  (
    'cyber-club-wall',
    'Cyber Club Wall',
    'Neon nightclub energy for your profile. Basically, your avatar has a VIP booth now.',
    'background',
    450,
    'bling-bg-cyber-club'
  ),
  (
    'goth-castle-mood',
    'Goth Castle Mood',
    'Dark stone, candlelight, and a little emotional damage. Very classy.',
    'background',
    500,
    'bling-bg-goth-castle'
  ),
  (
    'luxury-black-marble',
    'Luxury Black Marble',
    'Sleek black marble for rich profile energy.',
    'background',
    550,
    'bling-bg-black-marble'
  ),
  (
    'diamond-drip-frame',
    'Diamond Drip Frame',
    'A shiny frame for residents who arrived overdressed and correct.',
    'frame',
    450,
    'bling-frame-diamond-drip'
  ),
  (
    'barbed-wire-heart-frame',
    'Barbed Wire Heart Frame',
    'Cute, dangerous, and probably has trust issues.',
    'frame',
    425,
    'bling-frame-barbed-heart'
  ),
  (
    'pixel-glitch-frame',
    'Pixel Glitch Frame',
    'A glitchy profile frame with gamer gremlin energy.',
    'frame',
    350,
    'bling-frame-pixel-glitch'
  ),
  (
    'toxic-green-glow',
    'Toxic Green Glow',
    'For profiles that look mildly radioactive.',
    'glow',
    275,
    'bling-glow-toxic-green'
  ),
  (
    'inferno-glow',
    'Inferno Glow',
    'Hot profile aura. Possibly flammable.',
    'glow',
    350,
    'bling-glow-inferno'
  ),
  (
    'void-glow',
    'Void Glow',
    'Dark mysterious glow for people who type "lol" while plotting.',
    'glow',
    450,
    'bling-glow-void'
  ),
  (
    'afk-but-judging',
    'AFK But Judging',
    'You may be away, but your standards remain present.',
    'badge',
    250,
    'bling-badge-afk-judging'
  ),
  (
    'gridster-gremlin',
    'Gridster Gremlin',
    'Small, chaotic, and absolutely touching every button.',
    'badge',
    275,
    'bling-badge-gremlin'
  ),
  (
    'profile-main-character',
    'Profile Main Character',
    'For when the profile page is basically a movie poster.',
    'badge',
    375,
    'bling-badge-main-character'
  )
on conflict (slug)
do update set
  name = excluded.name,
  description = excluded.description,
  item_type = excluded.item_type,
  price = excluded.price,
  preview_class = excluded.preview_class,
  is_active = true;
