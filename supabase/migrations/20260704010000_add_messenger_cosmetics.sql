alter table public.bling_items
  drop constraint if exists valid_bling_item_type;

alter table public.bling_items
  add constraint valid_bling_item_type check (
    item_type in ('background', 'frame', 'glow', 'badge', 'emote', 'bling_buddy', 'messenger_theme', 'emoji_pack')
  );

alter table public.equipped_cosmetics
  drop constraint if exists valid_equipped_item_type;

alter table public.equipped_cosmetics
  add constraint valid_equipped_item_type check (
    item_type in ('background', 'frame', 'glow', 'badge', 'emote', 'bling_buddy', 'messenger_theme')
  );

insert into public.bling_items
  (slug, name, description, item_type, price, preview_class)
values
  (
    'chalk-talk-theme',
    'Chalk Talk',
    'A chalkboard-style messenger skin with doodled speech bubbles.',
    'messenger_theme',
    400,
    'messenger-theme-chalk-talk'
  ),
  (
    'goth-scribbles-theme',
    'Goth Scribbles',
    'Moody scribbled linework on dark parchment for your chat window.',
    'messenger_theme',
    450,
    'messenger-theme-goth-scribbles'
  ),
  (
    'neon-night-chat-theme',
    'Neon Night Chat',
    'Neon cyberpunk chat bubbles that glow like the grid at midnight.',
    'messenger_theme',
    500,
    'messenger-theme-neon-night'
  ),
  (
    'pink-notebook-chaos-theme',
    'Pink Notebook Chaos',
    'Scribbled pink notebook paper with chaotic doodle energy.',
    'messenger_theme',
    400,
    'messenger-theme-pink-notebook'
  ),
  (
    'drama-pack',
    'Drama Pack',
    'Reaction emojis for maximum main-character energy.',
    'emoji_pack',
    300,
    'emoji-pack-drama'
  ),
  (
    'goth-pack',
    'Goth Pack',
    'Dark little reactions for moody chats and dramatic exits.',
    'emoji_pack',
    300,
    'emoji-pack-goth'
  ),
  (
    'club-pack',
    'Club Pack',
    'Late-night dance floor energy for every chat thread.',
    'emoji_pack',
    300,
    'emoji-pack-club'
  ),
  (
    'bling-pack',
    'Bling Pack',
    'Excessive sparkle for excessive people. As it should be.',
    'emoji_pack',
    350,
    'emoji-pack-bling'
  )
on conflict (slug)
do update set
  name = excluded.name,
  description = excluded.description,
  item_type = excluded.item_type,
  price = excluded.price,
  preview_class = excluded.preview_class,
  is_active = true;
