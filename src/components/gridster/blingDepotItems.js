export const BLING_DEPOT_STARTING_BITS = 1250;

export function formatBits(value) {
  return Number(value || 0).toLocaleString();
}

export const BLING_DEPOT_CATEGORIES = [
  "Profile Backgrounds",
  "Profile Frames",
  "Glow Effects",
  "Badges",
  "Chat Stickers",
];

export const BLING_DEPOT_ITEMS = [
  {
    id: "cyber-club-wall",
    name: "Cyber Club Wall",
    category: "Profile Backgrounds",
    rarity: "Rare",
    price: 450,
    description: "Neon nightclub energy for your profile. Basically, your avatar has a VIP booth now.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewStyle: "linear-gradient(135deg, #030712, #0f2a5f 38%, #ff2fbd 100%)",
    previewClass: "bling-bg-cyber-club",
    icon: "CY",
  },
  {
    id: "goth-castle-mood",
    name: "Goth Castle Mood",
    category: "Profile Backgrounds",
    rarity: "Epic",
    price: 500,
    description: "Dark stone, candlelight, and a little emotional damage. Very classy.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewStyle: "linear-gradient(135deg, #05000a, #1e102e 42%, #6d1b7b 100%)",
    previewClass: "bling-bg-goth-castle",
    icon: "GC",
  },
  {
    id: "luxury-black-marble",
    name: "Luxury Black Marble",
    category: "Profile Backgrounds",
    rarity: "Epic",
    price: 550,
    description: "Sleek black marble for rich profile energy.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewStyle: "linear-gradient(135deg, #050505, #1f1f29 48%, #c084fc 120%)",
    previewClass: "bling-bg-black-marble",
    icon: "LM",
  },
  {
    id: "haunted-manor-bg",
    name: "Haunted Manor",
    category: "Profile Backgrounds",
    rarity: "Epic",
    price: 550,
    description: "A spooky mansion background for residents who thrive in dramatic lighting.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewStyle: "linear-gradient(135deg, #08050b, #251327 48%, #7f1d1d 120%)",
    previewClass: "bling-bg-haunted-manor",
    icon: "HM",
    season: "halloween",
    limited: true,
  },
  {
    id: "blood-moon-bg",
    name: "Blood Moon",
    category: "Profile Backgrounds",
    rarity: "Epic",
    price: 600,
    description: "Big ominous moon energy. Probably cursed. Definitely pretty.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewStyle: "radial-gradient(circle at 72% 24%, rgba(239, 68, 68, 0.78), transparent 18%), linear-gradient(135deg, #09040a, #2a0710 56%, #111827)",
    previewClass: "bling-bg-blood-moon",
    icon: "BM",
    season: "halloween",
    limited: true,
  },
  {
    id: "diamond-drip-frame",
    name: "Diamond Drip Frame",
    category: "Profile Frames",
    rarity: "Rare",
    price: 450,
    description: "A shiny frame for residents who arrived overdressed and correct.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewStyle: "border: 2px solid #e0f2fe; box-shadow: 0 0 22px rgba(125, 211, 252, .9), 0 0 14px rgba(255, 255, 255, .42);",
    previewClass: "bling-frame-diamond-drip",
    icon: "DD",
  },
  {
    id: "barbed-wire-heart-frame",
    name: "Barbed Wire Heart Frame",
    category: "Profile Frames",
    rarity: "Rare",
    price: 425,
    description: "Cute, dangerous, and probably has trust issues.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewStyle: "border: 2px solid #fb7185; box-shadow: 0 0 20px rgba(251, 113, 133, .78), 0 0 16px rgba(17, 24, 39, .74);",
    previewClass: "bling-frame-barbed-heart",
    icon: "BW",
  },
  {
    id: "pixel-glitch-frame",
    name: "Pixel Glitch Frame",
    category: "Profile Frames",
    rarity: "Rare",
    price: 350,
    description: "A glitchy profile frame with gamer gremlin energy.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewStyle: "border: 2px solid #22d3ee; box-shadow: 0 0 18px rgba(34, 211, 238, .76), 6px 0 0 rgba(255, 79, 216, .44);",
    previewClass: "bling-frame-pixel-glitch",
    icon: "PX",
  },
  {
    id: "black-lace-coffin-frame",
    name: "Black Lace Coffin",
    category: "Profile Frames",
    rarity: "Rare",
    price: 450,
    description: "A coffin-inspired frame with a little lace and a lot of attitude.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewStyle: "border: 8px double #111111; box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.18), 0 0 28px rgba(168, 85, 247, 0.42);",
    previewClass: "bling-frame-black-lace-coffin",
    icon: "LC",
    season: "halloween",
    limited: true,
  },
  {
    id: "toxic-green-glow",
    name: "Toxic Green Glow",
    category: "Glow Effects",
    rarity: "Rare",
    price: 275,
    description: "For profiles that look mildly radioactive.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewStyle: "box-shadow: 0 0 24px rgba(74, 222, 128, .9);",
    previewClass: "bling-glow-toxic-green",
    icon: "TG",
  },
  {
    id: "inferno-glow",
    name: "Inferno Glow",
    category: "Glow Effects",
    rarity: "Rare",
    price: 350,
    description: "Hot profile aura. Possibly flammable.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewStyle: "box-shadow: 0 0 26px rgba(249, 115, 22, .92);",
    previewClass: "bling-glow-inferno",
    icon: "IG",
  },
  {
    id: "void-glow",
    name: "Void Glow",
    category: "Glow Effects",
    rarity: "Rare",
    price: 450,
    description: "Dark mysterious glow for people who type \"lol\" while plotting.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewStyle: "box-shadow: 0 0 28px rgba(126, 34, 206, .92);",
    previewClass: "bling-glow-void",
    icon: "VG",
  },
  {
    id: "ghost-flame-glow",
    name: "Ghost Flame Glow",
    category: "Glow Effects",
    rarity: "Rare",
    price: 350,
    description: "A spectral glow for the prettiest haunt in the room.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewStyle: "box-shadow: inset 0 0 60px rgba(170, 252, 255, 0.26), 0 0 45px rgba(170, 252, 255, 0.46);",
    previewClass: "bling-glow-ghost-flame",
    icon: "GF",
    season: "halloween",
    limited: true,
  },
  {
    id: "certified-extra-badge",
    name: "Certified Extra",
    category: "Badges",
    rarity: "Common",
    price: 175,
    description: "Officially too much. We respect it.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    icon: "💅",
    previewClass: "bling-badge-extra",
  },
  {
    id: "afk-but-judging",
    name: "AFK But Judging",
    category: "Badges",
    rarity: "Rare",
    price: 250,
    description: "You may be away, but your standards remain present.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    previewClass: "bling-badge-afk-judging",
    icon: "AFK",
  },
  {
    id: "gridster-gremlin",
    name: "Gridster Gremlin",
    category: "Badges",
    rarity: "Rare",
    price: 275,
    description: "Small, chaotic, and absolutely touching every button.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    previewClass: "bling-badge-gremlin",
    icon: "GG",
  },
  {
    id: "profile-main-character",
    name: "Profile Main Character",
    category: "Badges",
    rarity: "Rare",
    price: 375,
    description: "For when the profile page is basically a movie poster.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    previewClass: "bling-badge-main-character",
    icon: "MC",
  },
  {
    id: "witch-please-badge",
    name: "Witch Please",
    category: "Badges",
    rarity: "Common",
    price: 225,
    description: "For magical nonsense and seasonal disrespect.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    previewClass: "bling-badge-witch-please",
    icon: "WP",
    season: "halloween",
    limited: true,
  },
  {
    id: "certified-creature-badge",
    name: "Certified Creature",
    category: "Badges",
    rarity: "Rare",
    price: 275,
    description: "Officially spooky, professionally cute.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    previewClass: "bling-badge-certified-creature",
    icon: "CC",
    season: "halloween",
    limited: true,
  },
  {
    id: "sir-sparkleton",
    name: "Sir Sparkleton",
    category: "Bling Buddies",
    rarity: "Iconic",
    price: 900,
    description: "A pocket-sized monarch who demands tribute in compliments and glitter.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-sir-sparkleton",
    icon: "👑",
    mood: "Fancy",
    vibe: "Regal chaos gremlin who rules by glitter decree",
    accessories: ["Tiny crown","Monocle","Tiny cape"],
    animation: "Glow Pulse",
    reactions: ["Icon","Sparkle","Love"],
  },
  {
    id: "pixel-puff",
    name: "Pixel Puff",
    category: "Bling Buddies",
    rarity: "Cute",
    price: 350,
    description: "A staticky little puffball that glitches between cute and cuter.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-pixel-puff",
    icon: "🐇",
    mood: "Cute",
    vibe: "Soft glitch bunny stuck between cute and cuter",
    accessories: ["Pixel ears","Glitch trail"],
    animation: "Tiny Spin",
    reactions: ["Love","Laugh","Sparkle"],
  },
  {
    id: "gloomi-bat",
    name: "Gloomi Bat",
    category: "Bling Buddies",
    rarity: "Shiny",
    price: 600,
    description: "Cries about the moon, then does a little spin about it.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-gloomi-bat",
    icon: "🦇",
    mood: "Dramatic",
    vibe: "Gothic mood swing in a tiny lace collar",
    accessories: ["Lace collar","Tiny tear charm"],
    animation: "Wink Loop",
    reactions: ["Love","Icon","Sparkle"],
  },
  {
    id: "nova-nibbles",
    name: "Nova Nibbles",
    category: "Bling Buddies",
    rarity: "Extra",
    price: 725,
    description: "Steals stardust snacks and absolutely will not apologize.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-nova-nibbles",
    icon: "🌠",
    mood: "Chaotic",
    vibe: "Snack-obsessed space raccoon on a sugar high",
    accessories: ["Star goggles","Snack pouch","Cosmic tail"],
    animation: "Chaos Wiggle",
    reactions: ["Fire","Laugh","Need One"],
  },
  {
    id: "tiny-trouble",
    name: "Tiny Trouble",
    category: "Bling Buddies",
    rarity: "Cute",
    price: 400,
    description: "Small, adorable, and a genuine liability. 10/10 would keep.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-tiny-trouble",
    icon: "😈",
    mood: "Bratty",
    vibe: "Pocket-sized menace with zero remorse",
    accessories: ["Devil horn clip","Chewed bow"],
    animation: "Chaos Wiggle",
    reactions: ["Laugh","Fire","Need One"],
  },
  {
    id: "velvet-hex",
    name: "Velvet Hex",
    category: "Bling Buddies",
    rarity: "Unhinged Luxury",
    price: 1200,
    description: "Hexes your ex and curates your aesthetic, simultaneously.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-velvet-hex",
    icon: "🔮",
    mood: "Spicy",
    vibe: "Cursed velvet witch familiar with impeccable taste",
    accessories: ["Hex ring","Velvet cloak","Potion vial"],
    animation: "Glow Pulse",
    reactions: ["Fire","Icon","Sparkle"],
  },
  {
    id: "glitter-gremlin",
    name: "Glitter Gremlin",
    category: "Bling Buddies",
    rarity: "Extra",
    price: 700,
    description: "Turned itself into pure glitter once. Regrets nothing.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-glitter-gremlin",
    icon: "✨",
    mood: "Chaotic",
    vibe: "Feral sparkle menace who regrets nothing",
    accessories: ["Glitter backpack","Cracked halo","Mismatched socks"],
    animation: "Sparkle Bounce",
    reactions: ["Sparkle","Laugh","Fire"],
  },
  {
    id: "moonbun",
    name: "Moonbun",
    category: "Bling Buddies",
    rarity: "Shiny",
    price: 625,
    description: "Naps professionally under a personal moon. Iconic dedication.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-moonbun",
    icon: "🌙",
    mood: "Sleepy",
    vibe: "Dreamy lunar bunny drifting on personal moonlight",
    accessories: ["Moon pillow","Star pajamas"],
    animation: "Floating Sass",
    reactions: ["Love","Sparkle","Icon"],
  },
  {
    id: "starlash",
    name: "Starlash",
    category: "Bling Buddies",
    rarity: "Iconic",
    price: 950,
    description: "Batted its lashes and caused three minor meteor showers.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-starlash",
    icon: "💫",
    mood: "Flirty",
    vibe: "Cosmic lash-batting heartbreaker",
    accessories: ["Star lashes","Glitter choker","Comet charm"],
    animation: "Wink Loop",
    reactions: ["Love","Fire","Icon"],
  },
  {
    id: "puff-riot",
    name: "Puff Riot",
    category: "Bling Buddies",
    rarity: "Extra",
    price: 715,
    description: "Started a glitter uprising in the group chat. No regrets.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-puff-riot",
    icon: "🎀",
    mood: "Chaotic",
    vibe: "Cotton-candy anarchist starting glitter uprisings",
    accessories: ["Tiny megaphone","Riot ribbon"],
    animation: "Chaos Wiggle",
    reactions: ["Fire","Laugh","Need One"],
  },
  {
    id: "baby-blaze",
    name: "Baby Blaze",
    category: "Bling Buddies",
    rarity: "Iconic",
    price: 975,
    description: "Small dragon, big attitude, occasionally sets the mood on fire.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-baby-blaze",
    icon: "🔥",
    mood: "Spicy",
    vibe: "Tiny fire-breathing main character energy",
    accessories: ["Flame collar","Ember wings"],
    animation: "Glow Pulse",
    reactions: ["Fire","Icon","Need One"],
  },
  {
    id: "crystal-bite",
    name: "Crystal Bite",
    category: "Bling Buddies",
    rarity: "Unhinged Luxury",
    price: 1250,
    description: "Bites only the finest things. Mostly compliments and light.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-crystal-bite",
    icon: "💎",
    mood: "Fancy",
    vibe: "Gem-fanged luxury cryptid with expensive taste",
    accessories: ["Crystal fangs","Diamond collar","Geode wings"],
    animation: "Sparkle Bounce",
    reactions: ["Sparkle","Icon","Love"],
  },
  {
    id: "velvet-moo",
    name: "Velvet Moo",
    category: "Bling Buddies",
    rarity: "Shiny",
    price: 650,
    description: "A velvet-horned little cow who struts like she owns the pasture and the penthouse.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-velvet-moo",
    icon: "🐮",
    mood: "Fancy",
    vibe: "A plush velvet calf who thinks she's a countess",
    accessories: ["Velvet horns","Pearl nose ring"],
    animation: "Floating Sass",
    reactions: ["Love","Sparkle","Icon"],
  },
  {
    id: "hexfang",
    name: "Hexfang",
    category: "Bling Buddies",
    rarity: "Extra",
    price: 725,
    description: "Bites first, hexes second, always looks fabulous doing it.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-hexfang",
    icon: "🧛",
    mood: "Spicy",
    vibe: "A fanged little curse with impeccable eyeliner",
    accessories: ["Cursed fang charm","Spellbook pin"],
    animation: "Wink Loop",
    reactions: ["Fire","Icon","Sparkle"],
  },
  {
    id: "noir-whisker",
    name: "Noir Whisker",
    category: "Bling Buddies",
    rarity: "Shiny",
    price: 625,
    description: "Always one step ahead of the plot, mostly by accident.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-noir-whisker",
    icon: "🕵️",
    mood: "Dramatic",
    vibe: "A trench-coat cat solving mysteries nobody asked about",
    accessories: ["Tiny fedora","Magnifying monocle"],
    animation: "Tiny Spin",
    reactions: ["Laugh","Icon","Sparkle"],
  },
  {
    id: "laceheart",
    name: "Laceheart",
    category: "Bling Buddies",
    rarity: "Cute",
    price: 450,
    description: "Sends love notes written entirely in glitter gel pen.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-laceheart",
    icon: "🖤",
    mood: "Flirty",
    vibe: "A lace-wrapped little romantic with a flair for drama",
    accessories: ["Lace choker","Heart locket"],
    animation: "Sparkle Bounce",
    reactions: ["Love","Laugh","Sparkle"],
  },
  {
    id: "moonveil",
    name: "Moonveil",
    category: "Bling Buddies",
    rarity: "Iconic",
    price: 900,
    description: "Draped in moonlight and mystery, she's here to bless your profile.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-moonveil",
    icon: "🌘",
    mood: "Dramatic",
    vibe: "A veiled moon priestess who speaks only in prophecy and vibes",
    accessories: ["Silver veil","Crescent hairpin"],
    animation: "Glow Pulse",
    reactions: ["Love","Icon","Sparkle"],
  },
  {
    id: "eclipse-puff",
    name: "Eclipse Puff",
    category: "Bling Buddies",
    rarity: "Unhinged Luxury",
    price: 1150,
    description: "Half light, half shadow, entirely too much main character energy.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-eclipse-puff",
    icon: "🌗",
    mood: "Chaotic",
    vibe: "A cosmic puffball caught mid-eclipse, half shadow half shine",
    accessories: ["Eclipse pendant","Stardust fluff"],
    animation: "Glow Pulse",
    reactions: ["Sparkle","Icon","Fire"],
  },
  {
    id: "chalk-talk-theme",
    name: "Chalk Talk",
    category: "Messenger Themes",
    rarity: "Rare",
    price: 400,
    description: "A chalkboard-style messenger skin with doodled speech bubbles.",
    itemType: "messenger_theme",
    equipSlot: "equipped_messenger_theme",
    previewClass: "messenger-theme-chalk-talk",
    icon: "🖍️",
  },
  {
    id: "goth-scribbles-theme",
    name: "Goth Scribbles",
    category: "Messenger Themes",
    rarity: "Rare",
    price: 450,
    description: "Moody scribbled linework on dark parchment for your chat window.",
    itemType: "messenger_theme",
    equipSlot: "equipped_messenger_theme",
    previewClass: "messenger-theme-goth-scribbles",
    icon: "🖤",
  },
  {
    id: "neon-night-chat-theme",
    name: "Neon Night Chat",
    category: "Messenger Themes",
    rarity: "Epic",
    price: 500,
    description: "Neon cyberpunk chat bubbles that glow like the grid at midnight.",
    itemType: "messenger_theme",
    equipSlot: "equipped_messenger_theme",
    previewClass: "messenger-theme-neon-night",
    icon: "🌃",
  },
  {
    id: "pink-notebook-chaos-theme",
    name: "Pink Notebook Chaos",
    category: "Messenger Themes",
    rarity: "Rare",
    price: 400,
    description: "Scribbled pink notebook paper with chaotic doodle energy.",
    itemType: "messenger_theme",
    equipSlot: "equipped_messenger_theme",
    previewClass: "messenger-theme-pink-notebook",
    icon: "📓",
  },
  {
    id: "drama-pack",
    name: "Drama Pack",
    category: "Emoji Packs",
    rarity: "Rare",
    price: 300,
    description: "Reaction emojis for maximum main-character energy.",
    itemType: "emoji_pack",
    equipSlot: null,
    previewClass: "emoji-pack-drama",
    icon: "🎭",
    emojis: ["😭","🙄","💅","😤","🎭","😩"],
  },
  {
    id: "goth-pack",
    name: "Goth Pack",
    category: "Emoji Packs",
    rarity: "Rare",
    price: 300,
    description: "Dark little reactions for moody chats and dramatic exits.",
    itemType: "emoji_pack",
    equipSlot: null,
    previewClass: "emoji-pack-goth",
    icon: "🦇",
    emojis: ["🦇","🖤","🕸️","💀","🌙","🥀"],
  },
  {
    id: "club-pack",
    name: "Club Pack",
    category: "Emoji Packs",
    rarity: "Rare",
    price: 300,
    description: "Late-night dance floor energy for every chat thread.",
    itemType: "emoji_pack",
    equipSlot: null,
    previewClass: "emoji-pack-club",
    icon: "🎉",
    emojis: ["🎉","🍸","💃","🕺","🔥","🎶"],
  },
  {
    id: "bling-pack",
    name: "Bling Pack",
    category: "Emoji Packs",
    rarity: "Epic",
    price: 350,
    description: "Excessive sparkle for excessive people. As it should be.",
    itemType: "emoji_pack",
    equipSlot: null,
    previewClass: "emoji-pack-bling",
    icon: "💎",
    emojis: ["💎","👑","💰","✨","🤑","🐆"],
  },
  {
    id: "midnight-lux-bg",
    name: "Midnight Lux",
    category: "Profile Backgrounds",
    rarity: "Rare",
    price: 300,
    description: "A dark luxury profile background with Gridster attitude.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewClass: "bling-bg-midnight-lux",
    icon: "✦",
  },
  {
    id: "pink-neon-bg",
    name: "Pink Neon Pop",
    category: "Profile Backgrounds",
    rarity: "Rare",
    price: 350,
    description: "Bright, loud, and absolutely doing the most.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewClass: "bling-bg-pink-neon",
    icon: "💖",
  },
  {
    id: "chrome-frame",
    name: "Chrome Fame Frame",
    category: "Profile Frames",
    rarity: "Rare",
    price: 250,
    description: "A shiny frame for people who refuse to be basic.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewClass: "bling-frame-chrome",
    icon: "⛓",
  },
  {
    id: "hot-pink-frame",
    name: "Hot Pink Drama Frame",
    category: "Profile Frames",
    rarity: "Rare",
    price: 275,
    description: "Because subtlety left the chat.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewClass: "bling-frame-hot-pink",
    icon: "💗",
  },
  {
    id: "blue-electric-glow",
    name: "Blue Electric Glow",
    category: "Glow Effects",
    rarity: "Common",
    price: 200,
    description: "A soft electric profile glow.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewClass: "bling-glow-blue",
    icon: "⚡",
  },
  {
    id: "golden-aura-glow",
    name: "Golden Aura Glow",
    category: "Glow Effects",
    rarity: "Rare",
    price: 250,
    description: "Rich profile energy. Kinda smug. Very cute.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewClass: "bling-glow-gold",
    icon: "✨",
  },
  {
    id: "og-gridster-badge",
    name: "OG Gridster",
    category: "Badges",
    rarity: "Common",
    price: 150,
    description: "For the residents who were here before it was cool.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    previewClass: "bling-badge-og",
    icon: "OG",
  }
];

export function asBlingItemIds(value) {
  if (Array.isArray(value)) {
    return value.filter((itemId) => typeof itemId === "string");
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((itemId) => typeof itemId === "string") : [];
    } catch {
      return [];
    }
  }

  return [];
}

export function getBlingDepotItem(itemId) {
  return BLING_DEPOT_ITEMS.find((item) => item.id === itemId) ?? null;
}

export function getBlingDepotItems(itemIds) {
  return asBlingItemIds(itemIds)
    .map((itemId) => getBlingDepotItem(itemId))
    .filter(Boolean);
}

export function parseBlingPreviewStyle(previewStyle) {
  if (!previewStyle || typeof previewStyle !== "string") {
    return {};
  }

  const trimmed = previewStyle.trim();

  if (trimmed.startsWith("linear-gradient") || trimmed.startsWith("radial-gradient")) {
    return { background: trimmed };
  }

  if (!trimmed.includes(":")) {
    return {};
  }

  return trimmed
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .reduce((style, declaration) => {
      const separatorIndex = declaration.indexOf(":");

      if (separatorIndex === -1) {
        return style;
      }

      const property = declaration.slice(0, separatorIndex).trim();
      const value = declaration.slice(separatorIndex + 1).trim();
      const reactProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

      return {
        ...style,
        [reactProperty]: value,
      };
    }, {});
}

export const BLING_ITEM_TYPE_CATEGORIES = {
  background: "Profile Backgrounds",
  frame: "Profile Frames",
  glow: "Glow Effects",
  badge: "Badges",
  emote: "Chat Stickers",
  sticker_pack: "Chat Stickers",
  bling_buddy: "Bling Buddies",
  messenger_theme: "Messenger Themes",
  emoji_pack: "Emoji Packs",
};

export const BLING_ITEM_TYPE_ICONS = {
  background: "*",
  frame: "◇",
  glow: "✦",
  badge: "◆",
  emote: "+",
  sticker_pack: "+",
  boost: "↑",
  bling_buddy: "🐾",
  messenger_theme: "💬",
  emoji_pack: "🙂",
};

export const BLING_BUDDY_REACTION_EMOJI = {
  Love: "💖",
  Laugh: "😂",
  Sparkle: "✨",
  Fire: "🔥",
  "Need One": "🙋",
  Icon: "👑",
};

export const BLING_EMOJI_PACK_CONTENTS = {
  "emoji-pack-drama": ["😭", "🙄", "💅", "😤", "🎭", "😩"],
  "emoji-pack-goth": ["🦇", "🖤", "🕸️", "💀", "🌙", "🥀"],
  "emoji-pack-club": ["🎉", "🍸", "💃", "🕺", "🔥", "🎶"],
  "emoji-pack-bling": ["💎", "👑", "💰", "✨", "🤑", "🐆"],
};

export const BLING_PREVIEW_CLASS_STYLES = {
  "bling-bg-midnight-lux": "linear-gradient(135deg, #050816, #201033, #7c2cff)",
  "bling-bg-pink-neon": "linear-gradient(135deg, #190019, #ff3fb4, #00c2ff)",
  "bling-bg-cyber-club": "linear-gradient(135deg, rgba(255, 0, 200, 0.35), transparent 35%), linear-gradient(225deg, rgba(0, 229, 255, 0.32), transparent 35%), repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.06) 0 1px, transparent 1px 16px), #080817",
  "bling-bg-cyber-club-wall": "linear-gradient(135deg, rgba(255, 0, 200, 0.35), transparent 35%), linear-gradient(225deg, rgba(0, 229, 255, 0.32), transparent 35%), repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.06) 0 1px, transparent 1px 16px), #080817",
  "bling-bg-goth-castle": "radial-gradient(circle at top, rgba(150, 0, 255, 0.22), transparent 35%), linear-gradient(135deg, #19101f, #050406)",
  "bling-bg-goth-castle-mood": "radial-gradient(circle at top, rgba(150, 0, 255, 0.22), transparent 35%), linear-gradient(135deg, #19101f, #050406)",
  "bling-bg-black-marble": "linear-gradient(135deg, rgba(255,255,255,0.12), transparent 18%), linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.08), transparent 58%), #050507",
  "bling-bg-luxury-black-marble": "linear-gradient(135deg, rgba(255,255,255,0.12), transparent 18%), linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.08), transparent 58%), #050507",
  "bling-bg-tropical-sunset": "radial-gradient(circle at top left, rgba(255, 220, 80, 0.35), transparent 28%), radial-gradient(circle at bottom right, rgba(255, 72, 168, 0.32), transparent 35%), linear-gradient(135deg, #ff8a00, #8f2cff 58%, #08182e)",
  "bling-bg-poolside-neon": "radial-gradient(circle at top right, rgba(0, 229, 255, 0.38), transparent 32%), radial-gradient(circle at bottom left, rgba(255, 47, 189, 0.34), transparent 34%), repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 2px, transparent 2px 18px), #07172a",
  "bling-bg-haunted-manor": "radial-gradient(circle at top, rgba(128, 0, 255, 0.25), transparent 35%), linear-gradient(135deg, #16111f, #040406)",
  "bling-bg-blood-moon": "radial-gradient(circle at center, rgba(255, 50, 50, 0.32), transparent 28%), radial-gradient(circle at center, rgba(255, 50, 50, 0.18), transparent 40%), linear-gradient(135deg, #22070c, #070203)",
  "bling-bg-frozen-glass": "linear-gradient(135deg, rgba(255, 255, 255, 0.32), transparent 18%), linear-gradient(45deg, transparent 38%, rgba(180, 240, 255, 0.28), transparent 62%), linear-gradient(135deg, #dff8ff, #426b8f 52%, #071526)",
  "bling-bg-northern-lights": "radial-gradient(circle at top left, rgba(86, 255, 194, 0.38), transparent 30%), radial-gradient(circle at top right, rgba(144, 75, 255, 0.36), transparent 32%), linear-gradient(135deg, #061324, #07101f 55%, #02040a)",
  "bling-bg-velvet-hearts": "radial-gradient(circle at top left, rgba(255, 175, 210, 0.34), transparent 30%), radial-gradient(circle at bottom right, rgba(255, 0, 96, 0.35), transparent 34%), linear-gradient(135deg, #4b0716, #18020a)",
  "bling-bg-broken-heart": "linear-gradient(135deg, rgba(255, 47, 93, 0.32), transparent 35%), linear-gradient(225deg, rgba(120, 0, 255, 0.26), transparent 36%), #10030a",
  "bling-frame-chrome": "border: 2px solid #cbd5e1; box-shadow: 0 0 18px rgba(148, 163, 184, .78);",
  "bling-frame-hot-pink": "border: 2px solid #ff4fd8; box-shadow: 0 0 18px rgba(255, 79, 216, .82);",
  "bling-frame-diamond-drip": "border: 8px solid rgba(220, 245, 255, 0.95); box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.45), 0 0 28px rgba(180, 235, 255, 0.45);",
  "bling-frame-barbed-heart": "border: 8px double #ff4f8b; box-shadow: inset 0 0 16px rgba(255, 79, 139, 0.35), 0 0 28px rgba(255, 79, 139, 0.35);",
  "bling-frame-barbed-wire-heart": "border: 8px double #ff4f8b; box-shadow: inset 0 0 16px rgba(255, 79, 139, 0.35), 0 0 28px rgba(255, 79, 139, 0.35);",
  "bling-frame-pixel-glitch": "border: 8px solid #00e5ff; box-shadow: 5px 0 0 rgba(255, 47, 189, 0.85), -5px 0 0 rgba(124, 77, 255, 0.85), 0 0 26px rgba(0, 229, 255, 0.35);",
  "bling-frame-shell": "border: 8px double #ffe0b5; box-shadow: inset 0 0 18px rgba(255, 228, 180, 0.32), 0 0 28px rgba(0, 229, 255, 0.28);",
  "bling-frame-black-lace-coffin": "border: 8px solid #2a0f30; box-shadow: inset 0 0 22px rgba(255, 255, 255, 0.08), 0 0 28px rgba(144, 0, 255, 0.28);",
  "bling-frame-snowflake": "border: 8px solid rgba(220, 250, 255, 0.95); box-shadow: inset 0 0 22px rgba(255, 255, 255, 0.35), 0 0 32px rgba(160, 235, 255, 0.45);",
  "bling-frame-cupid": "border: 8px double #ff77aa; box-shadow: inset 0 0 20px rgba(255, 119, 170, 0.35), 0 0 30px rgba(255, 47, 139, 0.42);",
  "bling-glow-blue": "box-shadow: 0 0 24px rgba(22, 140, 255, .84);",
  "bling-glow-gold": "box-shadow: 0 0 24px rgba(251, 191, 36, .82);",
  "bling-glow-toxic-green": "box-shadow: inset 0 0 60px rgba(57, 255, 20, 0.28), 0 0 45px rgba(57, 255, 20, 0.45);",
  "bling-glow-inferno": "box-shadow: inset 0 0 60px rgba(255, 80, 0, 0.35), 0 0 45px rgba(255, 80, 0, 0.55);",
  "bling-glow-void": "box-shadow: inset 0 0 60px rgba(150, 0, 255, 0.22), 0 0 45px rgba(0, 0, 0, 0.9);",
  "bling-glow-sun-kissed": "box-shadow: inset 0 0 60px rgba(255, 190, 65, 0.38), 0 0 45px rgba(255, 190, 65, 0.52);",
  "bling-glow-ghost-flame": "box-shadow: inset 0 0 60px rgba(120, 255, 220, 0.25), 0 0 45px rgba(120, 255, 220, 0.42);",
  "bling-glow-frost": "box-shadow: inset 0 0 60px rgba(180, 240, 255, 0.32), 0 0 45px rgba(180, 240, 255, 0.52);",
  "bling-glow-rose": "box-shadow: inset 0 0 60px rgba(255, 47, 139, 0.32), 0 0 45px rgba(255, 47, 139, 0.5);",
  "bling-badge-og": "badge",
  "bling-badge-extra": "badge",
  "bling-badge-afk-judging": "badge",
  "bling-badge-gremlin": "badge",
  "bling-badge-gridster-gremlin": "badge",
  "bling-badge-main-character": "badge",
  "bling-badge-witch-please": "badge",
  "bling-badge-beach-gremlin": "badge",
  "bling-badge-certified-creature": "badge",
  "bling-badge-mistletoe-menace": "badge",
  "bling-badge-red-flag-cute": "badge",
};

export function getBlingRarityForPrice(price = 0) {
  if (price >= 1000) {
    return "Legendary";
  }

  if (price >= 500) {
    return "Epic";
  }

  if (price >= 250) {
    return "Rare";
  }

  return "Common";
}

// Two different rarity scales exist in this data: the generic scale used by
// backgrounds/frames/glows/badges/etc, and a separate Bling Buddy-only scale
// (see the 20260704000000_add_bling_buddy_personality.sql migration). This
// maps whichever scale applies to a comparable integer for the Rarity sort.
const GENERIC_RARITY_RANK = { Common: 0, Rare: 1, Epic: 2, Legendary: 3 };
const BLING_BUDDY_RARITY_RANK = { Cute: 0, Shiny: 1, Extra: 2, Iconic: 3, "Unhinged Luxury": 4 };

export function getBlingRarityRank(item) {
  const rank = item?.itemType === "bling_buddy" ? BLING_BUDDY_RARITY_RANK : GENERIC_RARITY_RANK;
  return rank[item?.rarity] ?? -1;
}

// "Fan Favorites" - a real, honest signal (higher rarity) rather than a
// fabricated popularity/trending metric this app has no data to back.
export function isHighRarityItem(item) {
  if (item?.itemType === "bling_buddy") {
    return item.rarity === "Iconic" || item.rarity === "Unhinged Luxury";
  }

  return item?.rarity === "Epic" || item?.rarity === "Legendary";
}

export function getBlingEquipSlot(itemType) {
  if (itemType === "background") {
    return "background";
  }

  if (itemType === "frame") {
    return "frame";
  }

  if (itemType === "glow") {
    return "glow";
  }

  if (itemType === "badge") {
    return "badge";
  }

  if (itemType === "bling_buddy") {
    return "buddy";
  }

  if (itemType === "messenger_theme") {
    return "theme";
  }

  return null;
}

export function getBlingDepotItemPresentation(item) {
  if (!item) {
    return null;
  }

  if (item.category && item.itemType) {
    return item;
  }

  const itemType = item.item_type || item.itemType || "";
  const previewStyle = BLING_PREVIEW_CLASS_STYLES[item.preview_class] || item.previewStyle || item.preview_class || "";

  return {
    id: item.id,
    slug: item.slug || item.id,
    name: item.name,
    category: BLING_ITEM_TYPE_CATEGORIES[itemType] || "Bling Depot",
    rarity: item.rarity || getBlingRarityForPrice(item.price),
    price: item.price || 0,
    description: item.description || "",
    itemType,
    equipSlot: getBlingEquipSlot(itemType),
    previewStyle,
    previewClass: item.preview_class || "",
    icon: item.icon || BLING_ITEM_TYPE_ICONS[itemType] || "✦",
    imageUrl: item.image_url || "",
    season: item.season || "",
    limited: Boolean(item.limited),
    emojis: BLING_EMOJI_PACK_CONTENTS[item.preview_class] || [],
    mood: item.mood || "",
    vibe: item.vibe || "",
    accessories: item.accessories || [],
    animation: item.animation || "",
    reactions: item.reactions || [],
    createdAt: item.created_at || "",
    // Archived (is_active = false) items are only ever fetched when the
    // current user owns them (see getBlingShopData) - they must stay out of
    // general browsing/new-purchase surfaces but still work in "Your
    // Collection". Static guest-preview items have no is_active column at
    // all, so they default to active/browsable.
    isActive: item.is_active !== false,
  };
}

export function getBlingDepotItemFromCosmetic(cosmetic) {
  return getBlingDepotItemPresentation(cosmetic?.bling_items || cosmetic?.item || cosmetic);
}

export function getBlingProfileStyles(profile, equippedCosmetics = []) {
  const normalizedEquipped = equippedCosmetics
    .map((cosmetic) => getBlingDepotItemFromCosmetic(cosmetic))
    .filter(Boolean);
  const backgroundItem = normalizedEquipped.find((item) => item.itemType === "background")
    ?? getBlingDepotItem(profile?.equipped_profile_background);
  const frameItem = normalizedEquipped.find((item) => item.itemType === "frame")
    ?? getBlingDepotItem(profile?.equipped_profile_frame);
  const glowItem = normalizedEquipped.find((item) => item.itemType === "glow")
    ?? getBlingDepotItem(profile?.equipped_glow_effect);
  const equippedBadges = (normalizedEquipped.filter((item) => item.itemType === "badge").length
    ? normalizedEquipped.filter((item) => item.itemType === "badge")
    : getBlingDepotItems(profile?.equipped_badges))
    .filter((item) => item.itemType === "badge");
  const buddyItem = normalizedEquipped.find((item) => item.itemType === "bling_buddy");

  const frameStyle = parseBlingPreviewStyle(frameItem?.previewStyle);
  const glowStyle = parseBlingPreviewStyle(glowItem?.previewStyle);
  const boxShadow = [frameStyle.boxShadow, glowStyle.boxShadow].filter(Boolean).join(", ");
  const cardStyle = {
    ...frameStyle,
    ...glowStyle,
  };

  if (boxShadow) {
    cardStyle.boxShadow = boxShadow;
  }

  if (backgroundItem?.previewStyle) {
    cardStyle.background = `
      radial-gradient(circle at top left, rgba(5, 6, 13, 0.28), transparent 42%),
      ${backgroundItem.previewStyle}
    `;
  }

  return {
    cardStyle,
    bannerStyle: backgroundItem?.previewStyle ? { background: backgroundItem.previewStyle } : undefined,
    equippedBadges,
    buddy: buddyItem || null,
    classNames: {
      background: backgroundItem?.previewClass || "",
      frame: frameItem?.previewClass || "",
      glow: glowItem?.previewClass || "",
    },
  };
}
