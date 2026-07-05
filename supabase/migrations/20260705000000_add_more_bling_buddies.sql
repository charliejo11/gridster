insert into public.bling_items
  (slug, name, description, item_type, price, preview_class, icon, rarity, mood, vibe, accessories, animation, reactions)
values
  (
    'velvet-moo', 'Velvet Moo',
    'A velvet-horned little cow who struts like she owns the pasture and the penthouse.',
    'bling_buddy', 650, 'bling-buddy-velvet-moo', '🐮', 'Shiny', 'Fancy',
    'A plush velvet calf who thinks she''s a countess',
    array['Velvet horns', 'Pearl nose ring'], 'Floating Sass',
    array['Love', 'Sparkle', 'Icon']
  ),
  (
    'hexfang', 'Hexfang',
    'Bites first, hexes second, always looks fabulous doing it.',
    'bling_buddy', 725, 'bling-buddy-hexfang', '🧛', 'Extra', 'Spicy',
    'A fanged little curse with impeccable eyeliner',
    array['Cursed fang charm', 'Spellbook pin'], 'Wink Loop',
    array['Fire', 'Icon', 'Sparkle']
  ),
  (
    'noir-whisker', 'Noir Whisker',
    'Always one step ahead of the plot, mostly by accident.',
    'bling_buddy', 625, 'bling-buddy-noir-whisker', '🕵️', 'Shiny', 'Dramatic',
    'A trench-coat cat solving mysteries nobody asked about',
    array['Tiny fedora', 'Magnifying monocle'], 'Tiny Spin',
    array['Laugh', 'Icon', 'Sparkle']
  ),
  (
    'laceheart', 'Laceheart',
    'Sends love notes written entirely in glitter gel pen.',
    'bling_buddy', 450, 'bling-buddy-laceheart', '🖤', 'Cute', 'Flirty',
    'A lace-wrapped little romantic with a flair for drama',
    array['Lace choker', 'Heart locket'], 'Sparkle Bounce',
    array['Love', 'Laugh', 'Sparkle']
  ),
  (
    'moonveil', 'Moonveil',
    'Draped in moonlight and mystery, she''s here to bless your profile.',
    'bling_buddy', 900, 'bling-buddy-moonveil', '🌘', 'Iconic', 'Dramatic',
    'A veiled moon priestess who speaks only in prophecy and vibes',
    array['Silver veil', 'Crescent hairpin'], 'Glow Pulse',
    array['Love', 'Icon', 'Sparkle']
  ),
  (
    'eclipse-puff', 'Eclipse Puff',
    'Half light, half shadow, entirely too much main character energy.',
    'bling_buddy', 1150, 'bling-buddy-eclipse-puff', '🌗', 'Unhinged Luxury', 'Chaotic',
    'A cosmic puffball caught mid-eclipse, half shadow half shine',
    array['Eclipse pendant', 'Stardust fluff'], 'Glow Pulse',
    array['Sparkle', 'Icon', 'Fire']
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
