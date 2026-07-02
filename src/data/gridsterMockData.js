export const gridsterDestinations = {
  "Sanctuary Rocks": {
    name: "Sanctuary Rocks",
    slurl: "secondlife://Sanctuary%20Rocks/128/128/25",
  },
  "Neon District": {
    name: "Neon District",
    slurl: "secondlife://Neon%20District/128/128/25",
  },
  "Moonlit Cathedral": {
    name: "Moonlit Cathedral",
    slurl: "secondlife://Moonlit%20Cathedral/88/120/32",
  },
  "Ocean Breeze": {
    name: "Ocean Breeze",
    slurl: "secondlife://Ocean%20Breeze/128/128/25",
  },
  "Valentina Boutique": {
    name: "Valentina Boutique",
    slurl: "secondlife://Valentina%20Boutique/128/128/25",
  },
  "Club Elysium": {
    name: "Club Elysium",
    slurl: "secondlife://Club%20Elysium/128/128/25",
  },
  "Moonlit Market": {
    name: "Moonlit Market",
    slurl: "secondlife://Moonlit%20Market/142/88/24",
  },
  "Crystal Lagoon": {
    name: "Crystal Lagoon",
    slurl: "secondlife://Crystal%20Lagoon/128/128/25",
  },
};

export function getGridsterDestination(destinationName) {
  return gridsterDestinations[destinationName] ?? null;
}

export const gridsterProfiles = {
  CharlieJo: {
    displayName: "CharlieJo",
    profileType: "Blogger",
    category: "Fashion • Nightlife • Photography",
    bio: "Second Life blogger, photographer, creator, and nightlife explorer capturing fashion, tattoos, events, and beautiful chaos across the grid.",
    followers: "2.4K",
    posts: "1.8K",
    rating: "Moderate-friendly creator profile",
    website: "https://gridster.example/charliejo",
    flair: ["Blogger", "Photographer", "Bling Boosted", "Verified"],
    recentPosts: ["Metal Night Stage", "Neon Rooftop", "Moonlit Cathedral Lookbook"],
    featuredLinks: ["Flickr", "Blog", "Favorite SLURLs"],
    activity: ["Posted a new nightlife photo set", "Saved Moonlit Cathedral", "Earned +25 Bling Bits"],
  },
  RavenHex: {
    displayName: "RavenHex",
    profileType: "Resident",
    category: "Gothic photography • Events",
    bio: "Gothic explorer, event regular, and photo spot hunter with a soft spot for neon shadows and cathedral builds.",
    followers: "1.6K",
    posts: "742",
    rating: "Moderate",
    website: "https://gridster.example/ravenhex",
    flair: ["Photographer", "Gothic", "Event Regular", "Verified"],
    recentPosts: ["Moonlit Cathedral angles", "Neon Alley Kiss", "Sanctuary Rocks crowd shots"],
    featuredLinks: ["Photo Sets", "Saved Landmarks", "Event Picks"],
    activity: ["Commented on CharlieJo's photo", "Saved Crystal Lagoon", "Joined Sanctuary Rocks Crew"],
  },
  NovaVixen: {
    displayName: "NovaVixen",
    profileType: "Blogger",
    category: "Fashion • Beauty • Creator collabs",
    bio: "Fashion blogger and creator connector sharing lookbooks, brand matches, beauty finds, and editorial photo stories.",
    followers: "3.1K",
    posts: "1.2K",
    rating: "General / Moderate",
    website: "https://gridster.example/novavixen",
    flair: ["Blogger", "Fashion", "Brand Match", "Featured"],
    recentPosts: ["Cyber Alley Kiss", "Valentina weekend styling", "Crystal Lagoon editorial"],
    featuredLinks: ["Lookbook", "Brand Credits", "Blogger Calls"],
    activity: ["Followed CharlieJo", "Shared a blogger call", "Boosted a creator post"],
  },
  "DJ Starfall": {
    displayName: "DJ Starfall",
    profileType: "DJ",
    category: "Live sets • Club nights",
    bio: "Grid DJ spinning late-night electronic, rock, and event sets for clubs, venues, and community nights.",
    followers: "4.7K",
    posts: "889",
    rating: "Moderate nightlife",
    website: "https://gridster.example/dj-starfall",
    flair: ["DJ", "Live Events", "Nightlife", "Verified"],
    recentPosts: ["Midnight Stage", "Cyber Rave promo", "Ocean Breeze sunset set"],
    featuredLinks: ["Set Calendar", "Booking Info", "Event SLURLs"],
    activity: ["Shared an event SLURL", "Joined Metal Night", "Posted a live set reminder"],
  },
  "Valentina Boutique": {
    displayName: "Valentina Boutique",
    profileType: "Store",
    category: "Luxury fashion • New releases",
    bio: "A Second Life fashion boutique focused on event looks, statement pieces, blogger packs, and polished creator releases.",
    followers: "8.2K",
    posts: "2.7K",
    rating: "General shopping",
    slurl: gridsterDestinations["Valentina Boutique"].slurl,
    website: "https://marketplace.secondlife.com/stores/valentina",
    flair: ["Store", "Fashion", "Creator Friendly", "Verified"],
    recentPosts: ["New release drop", "Weekend sale preview", "Blogger pack available"],
    featuredLinks: ["Marketplace", "In-world Store", "Blogger Call"],
    activity: ["Posted new releases", "Featured NovaVixen", "Added a sale SLURL"],
  },
  "Sanctuary Rocks": {
    displayName: "Sanctuary Rocks",
    profileType: "Venue",
    category: "Rock / Metal • Live music venue",
    bio: "A rock and metal venue for DJs, hosts, live music nights, late crowds, and residents who like their grid loud.",
    followers: "6.9K",
    posts: "1.5K",
    rating: "Moderate venue",
    slurl: gridsterDestinations["Sanctuary Rocks"].slurl,
    website: "https://gridster.example/sanctuary-rocks",
    flair: ["Venue", "Live Now", "Event First", "Verified"],
    recentPosts: ["Metal Night", "Midnight Metal Mayhem", "Host shoutout"],
    featuredLinks: ["Teleport", "Event Calendar", "DJ Lineup"],
    activity: ["Added Metal Night", "Invited CharlieJo", "Boosted a live event"],
  },
  "Moonlit Hollow": {
    displayName: "Moonlit Hollow",
    profileType: "Community",
    category: "Gothic RP • Stories • Events",
    bio: "A gothic roleplay community hub with lore, character stories, applications, events, and dark fantasy gatherings.",
    followers: "2.8K",
    posts: "934",
    rating: "Moderate / Adult controlled",
    slurl: "secondlife://Moonlit%20Hollow/128/92/27",
    website: "https://gridster.example/moonlit-hollow",
    flair: ["Community Hub", "Roleplay", "Gothic", "Verified"],
    recentPosts: ["Community application update", "Moonlit Hollow lore drop", "Weekend RP opening"],
    featuredLinks: ["Rules", "Applications", "Main SLURL"],
    activity: ["Updated applications", "Posted a story prompt", "Featured a member spotlight"],
  },
};

const profileAliases = {
  "DJ RavenHex": "RavenHex",
  "DJ CharlieJo": "CharlieJo",
  Valentina: "Valentina Boutique",
  "Sanctuary Rocks Crew": "Sanctuary Rocks",
  "Moonlit Hollow RP": "Moonlit Hollow",
};

export function getGridsterProfile(profileName) {
  const profileKey = profileAliases[profileName] ?? profileName;

  return gridsterProfiles[profileKey] ?? null;
}

export function hasGridsterProfile(profileName) {
  return Boolean(getGridsterProfile(profileName));
}
