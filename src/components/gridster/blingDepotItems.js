export const BLING_DEPOT_STARTING_BITS = 1250;

export const BLING_DEPOT_CATEGORIES = [
  "Profile Backgrounds",
  "Profile Frames",
  "Glow Effects",
  "Badges",
  "Chat Stickers",
  "Event Boosts",
];

export const BLING_DEPOT_ITEMS = [
  {
    id: "neon-night-bg",
    name: "Neon Night Background",
    category: "Profile Backgrounds",
    rarity: "Rare",
    price: 300,
    description: "A dark neon city vibe for your Gridster profile.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewStyle: "linear-gradient(135deg, #140024, #7c2cff, #00c2ff)",
    icon: "🌃",
  },
  {
    id: "gothic-cathedral-bg",
    name: "Gothic Cathedral Background",
    category: "Profile Backgrounds",
    rarity: "Epic",
    price: 600,
    description: "Moody cathedral energy for goth, vampire, and fantasy profiles.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewStyle: "linear-gradient(135deg, #050008, #2b063d, #8b1e77)",
    icon: "🕯️",
  },
  {
    id: "beach-sunset-bg",
    name: "Beach Sunset Background",
    category: "Profile Backgrounds",
    rarity: "Common",
    price: 150,
    description: "Soft sunset colors for beach bloggers and chill residents.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewStyle: "linear-gradient(135deg, #ff8a5b, #b04cff, #1e9bff)",
    icon: "🌅",
  },
  {
    id: "cyber-club-bg",
    name: "Cyber Club Background",
    category: "Profile Backgrounds",
    rarity: "Rare",
    price: 350,
    description: "Laser lights and late-night dance floor energy.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewStyle: "linear-gradient(135deg, #020617, #1d4ed8, #d946ef)",
    icon: "🎧",
  },
  {
    id: "moonlit-forest-bg",
    name: "Moonlit Forest Background",
    category: "Profile Backgrounds",
    rarity: "Rare",
    price: 350,
    description: "Mystic forest colors for fantasy and roleplay profiles.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewStyle: "linear-gradient(135deg, #031b12, #14532d, #7e22ce)",
    icon: "🌙",
  },
  {
    id: "luxury-penthouse-bg",
    name: "Luxury Penthouse Background",
    category: "Profile Backgrounds",
    rarity: "Epic",
    price: 700,
    description: "Glossy rich-avatar energy with skyline vibes.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewStyle: "linear-gradient(135deg, #111827, #7c3aed, #f59e0b)",
    icon: "🥂",
  },
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
    id: "tropical-sunset-bg",
    name: "Tropical Sunset",
    category: "Profile Backgrounds",
    rarity: "Rare",
    price: 400,
    description: "Warm sunset energy for summer profiles and beach bloggers.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewClass: "bling-bg-tropical-sunset",
    icon: "TS",
    season: "summer",
    limited: true,
  },
  {
    id: "poolside-neon-bg",
    name: "Poolside Neon",
    category: "Profile Backgrounds",
    rarity: "Rare",
    price: 400,
    description: "Neon pool party vibes for late-night summer energy.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewClass: "bling-bg-poolside-neon",
    icon: "PN",
    season: "summer",
    limited: true,
  },
  {
    id: "frozen-glass-bg",
    name: "Frozen Glass",
    category: "Profile Backgrounds",
    rarity: "Rare",
    price: 400,
    description: "Icy winter elegance for cold-weather profile energy.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewClass: "bling-bg-frozen-glass",
    icon: "FG",
    season: "winter",
    limited: true,
  },
  {
    id: "northern-lights-bg",
    name: "Northern Lights",
    category: "Profile Backgrounds",
    rarity: "Epic",
    price: 550,
    description: "Aurora borealis energy for dreamy winter profiles.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewClass: "bling-bg-northern-lights",
    icon: "NL",
    season: "winter",
    limited: true,
  },
  {
    id: "velvet-hearts-bg",
    name: "Velvet Hearts",
    category: "Profile Backgrounds",
    rarity: "Rare",
    price: 400,
    description: "Romantic velvet energy for Valentine profiles.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewClass: "bling-bg-velvet-hearts",
    icon: "VH",
    season: "valentine",
    limited: true,
  },
  {
    id: "broken-heart-bg",
    name: "Broken Heart",
    category: "Profile Backgrounds",
    rarity: "Rare",
    price: 400,
    description: "Dramatic heartbreak energy for the emotionally available.",
    itemType: "background",
    equipSlot: "equipped_profile_background",
    previewClass: "bling-bg-broken-heart",
    icon: "BH",
    season: "valentine",
    limited: true,
  },
  {
    id: "purple-neon-frame",
    name: "Purple Neon Frame",
    category: "Profile Frames",
    rarity: "Rare",
    price: 250,
    description: "A glowing purple frame around your profile card.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewStyle: "border: 2px solid #b44cff; box-shadow: 0 0 18px rgba(180, 76, 255, .8);",
    icon: "💜",
  },
  {
    id: "gold-vip-frame",
    name: "Gold VIP Frame",
    category: "Profile Frames",
    rarity: "Epic",
    price: 700,
    description: "A luxury gold profile frame for VIP energy.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewStyle: "border: 2px solid #fbbf24; box-shadow: 0 0 18px rgba(251, 191, 36, .8);",
    icon: "👑",
  },
  {
    id: "dj-equalizer-frame",
    name: "DJ Equalizer Frame",
    category: "Profile Frames",
    rarity: "Rare",
    price: 400,
    description: "Club equalizer styling for DJs and music lovers.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewStyle: "border: 2px solid #22d3ee; box-shadow: 0 0 18px rgba(34, 211, 238, .8);",
    icon: "🎚️",
  },
  {
    id: "black-lace-frame",
    name: "Black Lace Frame",
    category: "Profile Frames",
    rarity: "Rare",
    price: 300,
    description: "Dark delicate styling for gothic and elegant profiles.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewStyle: "border: 2px solid #111827; box-shadow: 0 0 18px rgba(168, 85, 247, .5);",
    icon: "🖤",
  },
  {
    id: "rose-thorn-frame",
    name: "Rose Thorn Frame",
    category: "Profile Frames",
    rarity: "Epic",
    price: 650,
    description: "Romantic danger with rose-and-thorn energy.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewStyle: "border: 2px solid #e11d48; box-shadow: 0 0 18px rgba(225, 29, 72, .8);",
    icon: "🌹",
  },
  {
    id: "camera-lens-frame",
    name: "Camera Lens Frame",
    category: "Profile Frames",
    rarity: "Rare",
    price: 350,
    description: "A polished frame for photographers and bloggers.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewStyle: "border: 2px solid #38bdf8; box-shadow: 0 0 18px rgba(56, 189, 248, .7);",
    icon: "📸",
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
    id: "shell-frame",
    name: "Shell Frame",
    category: "Profile Frames",
    rarity: "Rare",
    price: 350,
    description: "A seashell-inspired frame for summer beach energy.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewClass: "bling-frame-shell",
    icon: "SH",
    season: "summer",
    limited: true,
  },
  {
    id: "snowflake-frame",
    name: "Snowflake Frame",
    category: "Profile Frames",
    rarity: "Rare",
    price: 350,
    description: "A frosty snowflake frame for winter wonderland profiles.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewClass: "bling-frame-snowflake",
    icon: "SF",
    season: "winter",
    limited: true,
  },
  {
    id: "cupid-frame",
    name: "Cupid Frame",
    category: "Profile Frames",
    rarity: "Rare",
    price: 350,
    description: "A romantic Valentine frame with cupid-approved energy.",
    itemType: "frame",
    equipSlot: "equipped_profile_frame",
    previewClass: "bling-frame-cupid",
    icon: "CF",
    season: "valentine",
    limited: true,
  },
  {
    id: "star-sparkle-glow",
    name: "Star Sparkle Glow",
    category: "Glow Effects",
    rarity: "Common",
    price: 200,
    description: "Tiny sparkle glow around your profile.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewStyle: "box-shadow: 0 0 18px rgba(255, 255, 255, .7);",
    icon: "✨",
  },
  {
    id: "blood-moon-glow",
    name: "Blood Moon Glow",
    category: "Glow Effects",
    rarity: "Epic",
    price: 800,
    description: "Dark red moonlit glow for dramatic profiles.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewStyle: "box-shadow: 0 0 24px rgba(220, 38, 38, .9);",
    icon: "🩸",
  },
  {
    id: "ocean-shimmer-glow",
    name: "Ocean Shimmer Glow",
    category: "Glow Effects",
    rarity: "Rare",
    price: 350,
    description: "A blue shimmer for beach, mermaid, and coastal vibes.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewStyle: "box-shadow: 0 0 24px rgba(14, 165, 233, .8);",
    icon: "🌊",
  },
  {
    id: "fireline-glow",
    name: "Fireline Glow",
    category: "Glow Effects",
    rarity: "Epic",
    price: 750,
    description: "Hot animated fire energy for bold profiles.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewStyle: "box-shadow: 0 0 24px rgba(249, 115, 22, .9);",
    icon: "🔥",
  },
  {
    id: "cyber-pulse-glow",
    name: "Cyber Pulse Glow",
    category: "Glow Effects",
    rarity: "Rare",
    price: 400,
    description: "A pulsing cyber glow for futuristic profiles.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewStyle: "box-shadow: 0 0 24px rgba(59, 130, 246, .85);",
    icon: "🔷",
  },
  {
    id: "fairy-dust-glow",
    name: "Fairy Dust Glow",
    category: "Glow Effects",
    rarity: "Rare",
    price: 350,
    description: "Soft magical sparkle for fantasy profiles.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewStyle: "box-shadow: 0 0 24px rgba(244, 114, 182, .85);",
    icon: "🧚",
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
    id: "sun-kissed-glow",
    name: "Sun-Kissed Glow",
    category: "Glow Effects",
    rarity: "Rare",
    price: 350,
    description: "A warm golden glow for summer profiles.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewClass: "bling-glow-sun-kissed",
    icon: "SK",
    season: "summer",
    limited: true,
  },
  {
    id: "frost-glow",
    name: "Frost Glow",
    category: "Glow Effects",
    rarity: "Rare",
    price: 350,
    description: "An icy blue glow for winter profile energy.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewClass: "bling-glow-frost",
    icon: "FR",
    season: "winter",
    limited: true,
  },
  {
    id: "rose-glow",
    name: "Rose Glow",
    category: "Glow Effects",
    rarity: "Rare",
    price: 350,
    description: "A soft pink rose glow for Valentine profiles.",
    itemType: "glow",
    equipSlot: "equipped_glow_effect",
    previewClass: "bling-glow-rose",
    icon: "RG",
    season: "valentine",
    limited: true,
  },
  {
    id: "lag-survivor-badge",
    name: "Lag Survivor Badge",
    category: "Badges",
    rarity: "Rare",
    price: 250,
    description: "For residents who survived crowded events and lived to tell it.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    icon: "💀",
  },
  {
    id: "pixel-royalty-badge",
    name: "Pixel Royalty Badge",
    category: "Badges",
    rarity: "Legendary",
    price: 1200,
    description: "A premium badge for true Gridster royalty.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    icon: "👑",
  },
  {
    id: "club-goblin-badge",
    name: "Club Goblin Badge",
    category: "Badges",
    rarity: "Common",
    price: 150,
    description: "For avatars who live on the dance floor after midnight.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    icon: "🪩",
  },
  {
    id: "teleport-queen-badge",
    name: "Teleport Queen Badge",
    category: "Badges",
    rarity: "Rare",
    price: 300,
    description: "For residents who are always one SLURL away from chaos.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    icon: "🌀",
  },
  {
    id: "fatpack-addict-badge",
    name: "Fatpack Addict Badge",
    category: "Badges",
    rarity: "Rare",
    price: 300,
    description: "For shoppers with expensive taste and weak resistance.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    icon: "🛍️",
  },
  {
    id: "certified-extra-badge",
    name: "Certified Extra Badge",
    category: "Badges",
    rarity: "Epic",
    price: 650,
    description: "For when subtle was never on the menu.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    icon: "💅",
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
    id: "beach-gremlin-badge",
    name: "Beach Gremlin",
    category: "Badges",
    rarity: "Rare",
    price: 250,
    description: "For residents who cause chaos by the pool.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    previewClass: "bling-badge-beach-gremlin",
    icon: "BG",
    season: "summer",
    limited: true,
  },
  {
    id: "mistletoe-menace-badge",
    name: "Mistletoe Menace",
    category: "Badges",
    rarity: "Rare",
    price: 250,
    description: "For residents who weaponize holiday cheer.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    previewClass: "bling-badge-mistletoe-menace",
    icon: "MM",
    season: "winter",
    limited: true,
  },
  {
    id: "red-flag-cute-badge",
    name: "Red Flag Cute",
    category: "Badges",
    rarity: "Rare",
    price: 250,
    description: "For residents who are a walking red flag but adorable about it.",
    itemType: "badge",
    equipSlot: "equipped_badges",
    previewStyle: "badge",
    previewClass: "bling-badge-red-flag-cute",
    icon: "RF",
    season: "valentine",
    limited: true,
  },
  {
    id: "blogger-magic-stickers",
    name: "Blogger Magic Stickers",
    category: "Chat Stickers",
    rarity: "Common",
    price: 100,
    description: "Cute reactions for bloggers, photographers, and fashion posts.",
    itemType: "sticker_pack",
    equipSlot: null,
    previewStyle: "stickers",
    icon: "📸",
  },
  {
    id: "dj-hype-stickers",
    name: "DJ Hype Stickers",
    category: "Chat Stickers",
    rarity: "Common",
    price: 100,
    description: "Chat stickers for club nights, requests, and banger tracks.",
    itemType: "sticker_pack",
    equipSlot: null,
    previewStyle: "stickers",
    icon: "🎧",
  },
  {
    id: "shopping-menace-stickers",
    name: "Shopping Menace Stickers",
    category: "Chat Stickers",
    rarity: "Common",
    price: 100,
    description: "For demos, fatpacks, and crimes against your Linden balance.",
    itemType: "sticker_pack",
    equipSlot: null,
    previewStyle: "stickers",
    icon: "🛒",
  },
  {
    id: "goth-mood-stickers",
    name: "Goth Mood Stickers",
    category: "Chat Stickers",
    rarity: "Common",
    price: 100,
    description: "Dark little reactions for moody posts and dramatic looks.",
    itemType: "sticker_pack",
    equipSlot: null,
    previewStyle: "stickers",
    icon: "🖤",
  },
  {
    id: "event-spotlight-boost",
    name: "Event Spotlight Boost",
    category: "Event Boosts",
    rarity: "Rare",
    price: 500,
    description: "Boost an event card into a highlighted spotlight slot.",
    itemType: "boost",
    equipSlot: null,
    previewStyle: "boost",
    icon: "🚀",
  },
  {
    id: "live-now-glow-boost",
    name: "Live Now Glow Boost",
    category: "Event Boosts",
    rarity: "Epic",
    price: 900,
    description: "Give your live event a glowing animated border.",
    itemType: "boost",
    equipSlot: null,
    previewStyle: "boost",
    icon: "🔴",
  },
  {
    id: "teleport-button-glow",
    name: "Teleport Button Glow",
    category: "Event Boosts",
    rarity: "Rare",
    price: 350,
    description: "Make your SLURL teleport button stand out.",
    itemType: "boost",
    equipSlot: null,
    previewStyle: "boost",
    icon: "✨",
  },
  {
    id: "store-release-boost",
    name: "Store Release Boost",
    category: "Event Boosts",
    rarity: "Rare",
    price: 500,
    description: "Highlight a new product, sale, or store release.",
    itemType: "boost",
    equipSlot: null,
    previewStyle: "boost",
    icon: "🏪",
  },
  {
    id: "goth-bat-buddy",
    name: "Goth Bat Buddy",
    category: "Bling Buddies",
    rarity: "Epic",
    price: 650,
    description: "A tiny dramatic bat with eyeliner, chains, and emotional moonlight energy.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-goth-bat",
    icon: "🦇",
  },
  {
    id: "beach-bunny-buddy",
    name: "Beach Bunny Buddy",
    category: "Bling Buddies",
    rarity: "Epic",
    price: 600,
    description: "A sunny little bunny with shades, sass, and vacation energy.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-beach-bunny",
    icon: "🐰",
  },
  {
    id: "pixel-fox-buddy",
    name: "Pixel Fox Buddy",
    category: "Bling Buddies",
    rarity: "Epic",
    price: 700,
    description: "A neon fox with headphones and clever little notification goblin vibes.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-pixel-fox",
    icon: "🦊",
  },
  {
    id: "chaos-raccoon-buddy",
    name: "Chaos Raccoon Buddy",
    category: "Bling Buddies",
    rarity: "Epic",
    price: 675,
    description: "A hoodie-wearing raccoon with glitter trash energy. Respectfully unhinged.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-chaos-raccoon",
    icon: "🦝",
  },
  {
    id: "glam-cat-buddy",
    name: "Glam Cat Buddy",
    category: "Bling Buddies",
    rarity: "Epic",
    price: 700,
    description: "A fluffy cat with heart glasses, platform boots, and judgmental sparkle.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-glam-cat",
    icon: "🐱",
  },
  {
    id: "tiny-demon-pup",
    name: "Tiny Demon Pup",
    category: "Bling Buddies",
    rarity: "Epic",
    price: 750,
    description: "A loyal little chaos puppy with horns, wings, and questionable advice.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-demon-pup",
    icon: "👿",
  },
  {
    id: "drama-llama-buddy",
    name: "Drama Llama Buddy",
    category: "Bling Buddies",
    rarity: "Epic",
    price: 675,
    description: "A llama with main character energy and zero chill. Everything is a whole situation.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-drama-llama",
    icon: "🦙",
  },
  {
    id: "neon-axolotl-buddy",
    name: "Neon Axolotl Buddy",
    category: "Bling Buddies",
    rarity: "Epic",
    price: 700,
    description: "A glowing axolotl that vibes quietly and judges your life choices with a smile.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-neon-axolotl",
    icon: "🦎",
  },
  {
    id: "punk-panda-buddy",
    name: "Punk Panda Buddy",
    category: "Bling Buddies",
    rarity: "Epic",
    price: 650,
    description: "A mohawked panda with anarchist bamboo energy and a soft heart underneath.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-punk-panda",
    icon: "🐼",
  },
  {
    id: "moon-moth-buddy",
    name: "Moon Moth Buddy",
    category: "Bling Buddies",
    rarity: "Epic",
    price: 725,
    description: "A dreamy moth that flutters around your profile chasing moonlight and vibes.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-moon-moth",
    icon: "🦋",
  },
  {
    id: "disco-duck-buddy",
    name: "Disco Duck Buddy",
    category: "Bling Buddies",
    rarity: "Epic",
    price: 675,
    description: "A duck that never stopped dancing since 1978. Quacks in 4/4 time.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-disco-duck",
    icon: "🦆",
  },
  {
    id: "crystal-dragon-buddy",
    name: "Crystal Dragon Buddy",
    category: "Bling Buddies",
    rarity: "Legendary",
    price: 1050,
    description: "A tiny gem-scaled dragon hoarding sparkle instead of gold. Rare and proud.",
    itemType: "bling_buddy",
    equipSlot: "equipped_bling_buddy",
    previewClass: "bling-buddy-crystal-dragon",
    icon: "🐉",
  },
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
  boost: "Event Boosts",
  bling_buddy: "Bling Buddies",
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
