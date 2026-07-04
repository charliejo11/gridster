alter table public.bling_items
  add column if not exists icon text;

alter table public.bling_items
  add column if not exists rarity text;

alter table public.bling_items
  add column if not exists mood text;

alter table public.bling_items
  add column if not exists vibe text;

alter table public.bling_items
  add column if not exists animation text;

alter table public.bling_items
  add column if not exists accessories text[] not null default '{}';

alter table public.bling_items
  add column if not exists reactions text[] not null default '{}';

-- Backfill personality data on the 12 existing Bling Buddies, migrating them
-- off the generic Common/Rare/Epic/Legendary scale onto the Bling Buddy
-- specific rarity scale (Cute, Shiny, Extra, Iconic, Unhinged Luxury).

insert into public.bling_items
  (slug, name, description, item_type, price, preview_class, icon, rarity, mood, vibe, accessories, animation, reactions)
values
  (
    'goth-bat-buddy', 'Goth Bat Buddy',
    'A tiny dramatic bat with eyeliner, chains, and emotional moonlight energy.',
    'bling_buddy', 650, 'bling-buddy-goth-bat', '🦇', 'Shiny', 'Dramatic',
    'Emo moonlight poet who cries in aesthetic lighting',
    array['Eyeliner wing', 'Tiny chain choker'], 'Wink Loop',
    array['Love', 'Icon', 'Sparkle']
  ),
  (
    'beach-bunny-buddy', 'Beach Bunny Buddy',
    'A sunny little bunny with shades, sass, and vacation energy.',
    'bling_buddy', 600, 'bling-buddy-beach-bunny', '🐰', 'Cute', 'Flirty',
    'Vacation main character energy, always',
    array['Heart sunglasses', 'Flip flops'], 'Floating Sass',
    array['Love', 'Laugh', 'Sparkle']
  ),
  (
    'pixel-fox-buddy', 'Pixel Fox Buddy',
    'A neon fox with headphones and clever little notification goblin vibes.',
    'bling_buddy', 700, 'bling-buddy-pixel-fox', '🦊', 'Extra', 'Chaotic',
    'Neon notification goblin who never logs off',
    array['Headphones', 'Pixel tail'], 'Sparkle Bounce',
    array['Fire', 'Laugh', 'Icon']
  ),
  (
    'chaos-raccoon-buddy', 'Chaos Raccoon Buddy',
    'A hoodie-wearing raccoon with glitter trash energy. Respectfully unhinged.',
    'bling_buddy', 675, 'bling-buddy-chaos-raccoon', '🦝', 'Shiny', 'Chaotic',
    'Hoodie trash panda royalty',
    array['Oversized hoodie', 'Glitter trash bag'], 'Chaos Wiggle',
    array['Fire', 'Laugh', 'Need One']
  ),
  (
    'glam-cat-buddy', 'Glam Cat Buddy',
    'A fluffy cat with heart glasses, platform boots, and judgmental sparkle.',
    'bling_buddy', 700, 'bling-buddy-glam-cat', '🐱', 'Extra', 'Fancy',
    'Judgmental glam icon in platform boots',
    array['Heart glasses', 'Platform boots'], 'Glow Pulse',
    array['Sparkle', 'Icon', 'Love']
  ),
  (
    'tiny-demon-pup', 'Tiny Demon Pup',
    'A loyal little chaos puppy with horns, wings, and questionable advice.',
    'bling_buddy', 750, 'bling-buddy-demon-pup', '👿', 'Iconic', 'Chaotic',
    'Loyal little menace with questionable advice',
    array['Tiny horns', 'Wobbly wings'], 'Chaos Wiggle',
    array['Fire', 'Laugh', 'Need One']
  ),
  (
    'drama-llama-buddy', 'Drama Llama Buddy',
    'A llama with main character energy and zero chill. Everything is a whole situation.',
    'bling_buddy', 675, 'bling-buddy-drama-llama', '🦙', 'Shiny', 'Dramatic',
    'Zero-chill main character, everything is a whole situation',
    array['Dramatic scarf', 'Practiced side-eye'], 'Wink Loop',
    array['Laugh', 'Icon', 'Fire']
  ),
  (
    'neon-axolotl-buddy', 'Neon Axolotl Buddy',
    'A glowing axolotl that vibes quietly and judges your life choices with a smile.',
    'bling_buddy', 700, 'bling-buddy-neon-axolotl', '🦎', 'Extra', 'Sleepy',
    'Quietly glowing judge of your life choices',
    array['Neon gills', 'Tiny crown'], 'Glow Pulse',
    array['Sparkle', 'Love', 'Icon']
  ),
  (
    'punk-panda-buddy', 'Punk Panda Buddy',
    'A mohawked panda with anarchist bamboo energy and a soft heart underneath.',
    'bling_buddy', 650, 'bling-buddy-punk-panda', '🐼', 'Shiny', 'Bratty',
    'Soft-hearted anarchist with a bamboo pin',
    array['Mohawk', 'Bamboo pin'], 'Chaos Wiggle',
    array['Fire', 'Laugh', 'Need One']
  ),
  (
    'moon-moth-buddy', 'Moon Moth Buddy',
    'A dreamy moth that flutters around your profile chasing moonlight and vibes.',
    'bling_buddy', 725, 'bling-buddy-moon-moth', '🦋', 'Extra', 'Sleepy',
    'Moonlight-chasing dreamy wanderer',
    array['Dust wings', 'Star freckles'], 'Floating Sass',
    array['Love', 'Sparkle', 'Icon']
  ),
  (
    'disco-duck-buddy', 'Disco Duck Buddy',
    'A duck that never stopped dancing since 1978. Quacks in 4/4 time.',
    'bling_buddy', 675, 'bling-buddy-disco-duck', '🦆', 'Shiny', 'Flirty',
    'Never-stopped-dancing disco icon since 1978',
    array['Disco collar', 'Tiny platforms'], 'Sparkle Bounce',
    array['Laugh', 'Fire', 'Icon']
  ),
  (
    'crystal-dragon-buddy', 'Crystal Dragon Buddy',
    'A tiny gem-scaled dragon hoarding sparkle instead of gold. Rare and proud.',
    'bling_buddy', 1050, 'bling-buddy-crystal-dragon', '🐉', 'Unhinged Luxury', 'Fancy',
    'Gem-hoarding tiny royalty',
    array['Gem scales', 'Tiny hoard'], 'Glow Pulse',
    array['Sparkle', 'Icon', 'Love']
  )
on conflict (slug)
do update set
  name = excluded.name,
  description = excluded.description,
  item_type = excluded.item_type,
  price = excluded.price,
  preview_class = excluded.preview_class,
  icon = excluded.icon,
  rarity = excluded.rarity,
  mood = excluded.mood,
  vibe = excluded.vibe,
  accessories = excluded.accessories,
  animation = excluded.animation,
  reactions = excluded.reactions,
  is_active = true;

-- 12 new Bling Buddies.

insert into public.bling_items
  (slug, name, description, item_type, price, preview_class, icon, rarity, mood, vibe, accessories, animation, reactions)
values
  (
    'sir-sparkleton', 'Sir Sparkleton',
    'A pocket-sized monarch who demands tribute in compliments and glitter.',
    'bling_buddy', 900, 'bling-buddy-sir-sparkleton', '👑', 'Iconic', 'Fancy',
    'Regal chaos gremlin who rules by glitter decree',
    array['Tiny crown', 'Monocle', 'Tiny cape'], 'Glow Pulse',
    array['Icon', 'Sparkle', 'Love']
  ),
  (
    'pixel-puff', 'Pixel Puff',
    'A staticky little puffball that glitches between cute and cuter.',
    'bling_buddy', 350, 'bling-buddy-pixel-puff', '🐇', 'Cute', 'Cute',
    'Soft glitch bunny stuck between cute and cuter',
    array['Pixel ears', 'Glitch trail'], 'Tiny Spin',
    array['Love', 'Laugh', 'Sparkle']
  ),
  (
    'gloomi-bat', 'Gloomi Bat',
    'Cries about the moon, then does a little spin about it.',
    'bling_buddy', 600, 'bling-buddy-gloomi-bat', '🦇', 'Shiny', 'Dramatic',
    'Gothic mood swing in a tiny lace collar',
    array['Lace collar', 'Tiny tear charm'], 'Wink Loop',
    array['Love', 'Icon', 'Sparkle']
  ),
  (
    'nova-nibbles', 'Nova Nibbles',
    'Steals stardust snacks and absolutely will not apologize.',
    'bling_buddy', 725, 'bling-buddy-nova-nibbles', '🌠', 'Extra', 'Chaotic',
    'Snack-obsessed space raccoon on a sugar high',
    array['Star goggles', 'Snack pouch', 'Cosmic tail'], 'Chaos Wiggle',
    array['Fire', 'Laugh', 'Need One']
  ),
  (
    'tiny-trouble', 'Tiny Trouble',
    'Small, adorable, and a genuine liability. 10/10 would keep.',
    'bling_buddy', 400, 'bling-buddy-tiny-trouble', '😈', 'Cute', 'Bratty',
    'Pocket-sized menace with zero remorse',
    array['Devil horn clip', 'Chewed bow'], 'Chaos Wiggle',
    array['Laugh', 'Fire', 'Need One']
  ),
  (
    'velvet-hex', 'Velvet Hex',
    'Hexes your ex and curates your aesthetic, simultaneously.',
    'bling_buddy', 1200, 'bling-buddy-velvet-hex', '🔮', 'Unhinged Luxury', 'Spicy',
    'Cursed velvet witch familiar with impeccable taste',
    array['Hex ring', 'Velvet cloak', 'Potion vial'], 'Glow Pulse',
    array['Fire', 'Icon', 'Sparkle']
  ),
  (
    'glitter-gremlin', 'Glitter Gremlin',
    'Turned itself into pure glitter once. Regrets nothing.',
    'bling_buddy', 700, 'bling-buddy-glitter-gremlin', '✨', 'Extra', 'Chaotic',
    'Feral sparkle menace who regrets nothing',
    array['Glitter backpack', 'Cracked halo', 'Mismatched socks'], 'Sparkle Bounce',
    array['Sparkle', 'Laugh', 'Fire']
  ),
  (
    'moonbun', 'Moonbun',
    'Naps professionally under a personal moon. Iconic dedication.',
    'bling_buddy', 625, 'bling-buddy-moonbun', '🌙', 'Shiny', 'Sleepy',
    'Dreamy lunar bunny drifting on personal moonlight',
    array['Moon pillow', 'Star pajamas'], 'Floating Sass',
    array['Love', 'Sparkle', 'Icon']
  ),
  (
    'starlash', 'Starlash',
    'Batted its lashes and caused three minor meteor showers.',
    'bling_buddy', 950, 'bling-buddy-starlash', '💫', 'Iconic', 'Flirty',
    'Cosmic lash-batting heartbreaker',
    array['Star lashes', 'Glitter choker', 'Comet charm'], 'Wink Loop',
    array['Love', 'Fire', 'Icon']
  ),
  (
    'puff-riot', 'Puff Riot',
    'Started a glitter uprising in the group chat. No regrets.',
    'bling_buddy', 715, 'bling-buddy-puff-riot', '🎀', 'Extra', 'Chaotic',
    'Cotton-candy anarchist starting glitter uprisings',
    array['Tiny megaphone', 'Riot ribbon'], 'Chaos Wiggle',
    array['Fire', 'Laugh', 'Need One']
  ),
  (
    'baby-blaze', 'Baby Blaze',
    'Small dragon, big attitude, occasionally sets the mood on fire.',
    'bling_buddy', 975, 'bling-buddy-baby-blaze', '🔥', 'Iconic', 'Spicy',
    'Tiny fire-breathing main character energy',
    array['Flame collar', 'Ember wings'], 'Glow Pulse',
    array['Fire', 'Icon', 'Need One']
  ),
  (
    'crystal-bite', 'Crystal Bite',
    'Bites only the finest things. Mostly compliments and light.',
    'bling_buddy', 1250, 'bling-buddy-crystal-bite', '💎', 'Unhinged Luxury', 'Fancy',
    'Gem-fanged luxury cryptid with expensive taste',
    array['Crystal fangs', 'Diamond collar', 'Geode wings'], 'Sparkle Bounce',
    array['Sparkle', 'Icon', 'Love']
  )
on conflict (slug)
do update set
  name = excluded.name,
  description = excluded.description,
  item_type = excluded.item_type,
  price = excluded.price,
  preview_class = excluded.preview_class,
  icon = excluded.icon,
  rarity = excluded.rarity,
  mood = excluded.mood,
  vibe = excluded.vibe,
  accessories = excluded.accessories,
  animation = excluded.animation,
  reactions = excluded.reactions,
  is_active = true;
