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
  "Sunset Cove": {
    name: "Sunset Cove",
    slurl: "secondlife://Sunset%20Cove/128/128/25",
  },
  "Valentina Boutique": {
    name: "Valentina Boutique",
    slurl: "secondlife://Valentina%20Boutique/128/128/25",
  },
  "Club Elysium": {
    name: "Club Elysium",
    slurl: "secondlife://Club%20Elysium/128/128/25",
  },
  "Elysium Isle": {
    name: "Elysium Isle",
    slurl: "secondlife://Elysium%20Isle/128/128/24",
  },
  "Luxe Villas": {
    name: "Luxe Villas",
    slurl: "secondlife://Luxe%20Villas/128/128/25",
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

const destinationAliases = {
  "Neon Nights Party": "Neon District",
  "Ocean Breeze Beach Party": "Ocean Breeze",
  "Rave Under The Stars": "Club Elysium",
  "Midnight Metal Mayhem": "Sanctuary Rocks",
};

export function getGridsterDestination(destinationName) {
  if (!destinationName) {
    return null;
  }

  const destinationKey = destinationAliases[destinationName] ?? destinationName;

  return gridsterDestinations[destinationKey] ?? null;
}

export const gridsterDashboardEvents = [
  ["Neon Nights Party", "May 23 • 8:00 PM SLT"],
  ["Ocean Breeze Beach Party", "May 25 • 2:00 PM SLT"],
  ["Rave Under The Stars", "May 31 • 10:00 PM SLT"],
  ["Midnight Metal Mayhem", "Jun 2 • 11:00 PM SLT"],
];

export const gridsterFeaturedPlaces = [
  ["Elysium Isle", "Adult • Moderate"],
  ["Neon District", "Adult • Moderate"],
  ["Valentina Boutique", "Fashion Store"],
  ["Luxe Villas", "Homes • Rentals"],
  ["Moonlit Market", "Shopping • Events"],
];

export const gridsterSidebarGroups = ["Club Elysium", "The Creators Collective", "Pixel Fashion Society"];

export const gridsterSuggestedCreators = ["NovaVixen", "DJ Starfall", "EchoMoon"];

export const gridsterLiveNow = [
  ["DJ RavenHex", "Spinning Rock"],
  ["DJ CharlieJo", "Club Set"],
  ["NovaVixen", "Shopping Stream"],
];

export const gridsterFriendsOnline = [
  { name: "RavenHex", status: "Online" },
  { name: "NovaVixen", status: "Online" },
  { name: "DJ Starfall", status: "Busy" },
  { name: "EchoMoon", status: "Away" },
  { name: "Pixel Pixie", status: "Offline" },
  { name: "LunaVale", status: "Online" },
];

export const gridsterGalleryItems = [
  { title: "Neon Rooftop", category: "Nightlife", creator: "CharlieJo", index: 0 },
  { title: "Moonlit Cathedral", category: "Gothic", creator: "RavenHex", index: 1 },
  { title: "Crystal Lagoon", category: "Beach", creator: "NovaVixen", index: 2 },
  { title: "Cyber Alley", category: "Urban", creator: "EchoMoon", index: 3 },
  { title: "Luxe Villa Patio", category: "Homes", creator: "Valentina", index: 4 },
  { title: "Metal Night Stage", category: "Events", creator: "DJ Starfall", index: 5 },
  { title: "Mystic Forest", category: "Fantasy", creator: "LunaVale", index: 6 },
  { title: "Market Glow", category: "Shopping", creator: "Pixel Pixie", index: 7 },
];

export const gridsterNotifications = [
  ["R", "RavenHex commented on your photo", "2m"],
  ["S", "Sanctuary Rocks added Metal Night", "14m"],
  ["N", "NovaVixen followed you", "1h"],
  ["B", "You earned +25 Bling Bits", "2h"],
  ["M", "Moonlit Market posted new releases", "3h"],
];

export const gridsterThemeOptions = [
  ["Dark Neon", "dark-neon"],
  ["Deep Purple", "deep-purple"],
  ["Midnight Blue", "midnight-blue"],
];

export const gridsterGridNightEvents = [
  ["Sanctuary Rocks — Metal Night", "8:00 PM SLT", "thumb-0"],
  ["Neon District — Cyber Rave", "10:00 PM SLT", "thumb-1"],
  ["Ocean Breeze — Beach Party", "2:00 PM SLT", "thumb-2"],
  ["Midnight Metal Mayhem", "9:00 PM SLT", "thumb-3"],
  ["Moonlit Market — Shopping Night", "6:00 PM SLT", "thumb-4"],
];

export const gridsterMarketplaceFinds = [
  ["Valentina Luxe Dress", "Fashion"],
  ["Neon Boots", "Accessories"],
  ["Gothic Cathedral Backdrop", "Decor"],
  ["Cyber Glow Nails", "Beauty"],
  ["Beach Villa Set", "Homes"],
  ["PlayNaughty Bunny Mask", "Accessories"],
];

export const gridsterDjSets = [
  ["DJ CharlieJo", "Sanctuary Rocks", "Rock / Metal"],
  ["DJ RavenHex", "Club Elysium", "Darkwave"],
  ["DJ Starfall", "Neon District", "EDM"],
  ["DJ EchoMoon", "Ocean Breeze", "Beach Mix"],
  ["DJ NovaVixen", "Moonlit Market", "Pop / Dance"],
];

export const gridsterSearchFilters = ["Residents", "Events", "Stores", "Groups", "Photo Spots", "SLURLs", "General", "Moderate", "Adult"];

export const gridsterSearchResults = [
  ["Sanctuary Rocks", "Venue • Rock / Metal • Live Events", "View"],
  ["CharlieJo", "Blogger • Photographer • Creator", "View Profile"],
  ["Moonlit Cathedral", "Photo Spot • Gothic • Moderate", "Save Landmark"],
  ["Valentina Boutique", "Store • Fashion • New Releases", "Shop"],
  ["Neon Nights Party", "Event • Tonight • 9 PM SLT", "Teleport"],
  ["Moonlit Hollow", "Community Hub • Gothic RP", "Join"],
];

export const gridsterExploreCategories = [
  ["C", "Clubs", "Live DJs, parties, hosts, and nightlife."],
  ["S", "Stores", "New releases, sales, and creator drops."],
  ["P", "Photo Spots", "Beautiful sims, sets, and scenic backdrops."],
  ["R", "Rentals", "Homes, skyboxes, beaches, and private spaces."],
  ["H", "Communities", "RP hubs, groups, families, and fandoms."],
  ["E", "Events", "Live shows, markets, parties, and gatherings."],
];

export const gridsterExploreDestinations = [
  ["Sanctuary Rocks", "Moderate • Rock / Metal • Live venue", "Teleport"],
  ["Neon District", "Adult • Cyber nightlife • Trending", "Teleport"],
  ["Moonlit Cathedral", "Moderate • Gothic photo spot • Popular", "Browse"],
  ["Ocean Breeze", "General • Beach hangout • Active", "Teleport"],
  ["Valentina Boutique", "General • Fashion store • New releases", "Browse"],
];

export const gridsterEventsPageEvents = [
  ["Sanctuary Rocks — Metal Night", "Tonight • 8 PM SLT", "Moderate", "Sanctuary Rocks"],
  ["Neon District — Cyber Rave", "Tonight • 10 PM SLT", "Adult", "Neon District"],
  ["Ocean Breeze — Beach Party", "Tomorrow • 2 PM SLT", "General", "Ocean Breeze"],
  ["Midnight Metal Mayhem", "Friday • 11 PM SLT", "Moderate", "Sanctuary Rocks"],
  ["Moonlit Market — Shopping Event", "Saturday • 12 PM SLT", "General", "Moonlit Market"],
];

export const gridsterGroupsPageGroups = [
  ["Club Elysium", "Nightlife, DJs, event regulars, and neon dance-floor people.", "4.2K members"],
  ["The Creators Collective", "Builders, photographers, bloggers, decorators, and makers.", "3.8K members"],
  ["Pixel Fashion Society", "Fashion finds, blogger calls, editorials, and creator drops.", "2.9K members"],
  ["Sanctuary Rocks Crew", "Rock fans, metal nights, venue staff, DJs, and regulars.", "2.4K members"],
  ["Moonlit Hollow RP", "Gothic roleplay, lore, events, applications, and dark fantasy.", "1.7K members"],
];

export const gridsterMessageConversations = [
  ["R", "RavenHex", "That photo spot is insane.", "2m"],
  ["S", "Sanctuary Rocks", "You’re invited to Metal Night.", "14m"],
  ["N", "NovaVixen", "Loved your latest blog post.", "1h"],
  ["V", "Valentina Boutique", "New blogger pack available.", "3h"],
  ["D", "DJ Starfall", "Can you share the event SLURL?", "5h"],
  ["M", "Moonlit Hollow", "Community application update.", "1d"],
];

export const gridsterMessageThreads = {
  RavenHex: [
    ["RavenHex", "That photo spot is insane.", "received"],
    ["CharlieJo", "Right? The lighting is perfect for gothic shots.", "sent"],
    ["RavenHex", "Send me the SLURL when you can.", "received"],
  ],
};

export const gridsterMessageQuickActions = ["Send SLURL", "Share Post", "Invite to Event"];

export const gridsterSidebarAlerts = [
  ["R", "RavenHex", "commented on your photo", "2m"],
  ["S", "Sanctuary Rocks", "added a new event", "14m"],
  ["N", "NovaVixen", "followed you", "1h"],
  ["M", "Moonlit Market", "posted new releases", "3h"],
];

export const gridsterLeftSidebarProfile = {
  initials: "CJ",
  displayName: "CharlieJo",
  role: "Second Life Blogger • Photographer • Creator",
  bio: "Capturing fashion, nightlife, events, and beautiful chaos across the grid.",
  strength: "82%",
  stats: [
    ["2.4K", "Followers"],
    ["320", "Following"],
    ["1.8K", "Posts"],
  ],
  tools: ["New Blog", "Upload Photo", "Add Event", "Save SLURL"],
};

export const gridsterLeftSidebarNavItems = [
  ["✦", "Home", "Home"],
  ["✧", "Groups", "Groups"],
  ["◇", "Grid Nights", "GridNights"],
  ["⌖", "Saved Landmarks & Posts", "SavedItems"],
  ["▣", "Photo Challenge", "PhotoChallenge"],
  ["♢", "Marketplace Finds", "Marketplace"],
  ["✎", "Spotlight Awards", "SpotlightAwards"],
  ["♫", "DJ Sets", "DJSets"],
  ["!", "Auth", "Auth"],
];

export const gridsterLeftSidebarActionItems = [
  { label: "Create Event", page: "CreateEvent", className: "create-post-button", suffix: "+" },
  { label: "Create Store Post", page: "CreateStorePost", className: "add-slurl-button" },
  { label: "Create Blogger Post", page: "CreateBloggerPost", className: "add-slurl-button" },
  { label: "Create Community Hub", page: "CreateCommunityHub", className: "add-slurl-button" },
  { label: "Bling Depot", page: "BlingBoost", className: "add-slurl-button" },
  { label: "Feed Preferences", page: "FeedPreferences", className: "add-slurl-button" },
  { label: "Verification", page: "VerificationCenter", className: "add-slurl-button" },
  { label: "Add SLURL", page: "AddSLURL", className: "add-slurl-button" },
];

export const gridsterSlurlTeleports = [
  ["Sunset Cove", "Moderate", 4],
  ["Crystal Lagoon", "Moderate", 5],
];

export const gridsterSavedFilters = ["All", "SLURLs", "Events", "Stores", "Photo Spots", "Posts"];

export const gridsterSavedItems = [
  ["Sanctuary Rocks", "Venue • Rock / Metal • Saved SLURL", "Saved SLURL", "Teleport"],
  ["Moonlit Cathedral", "Photo Spot • Gothic • Moderate", "Photo Spot", "Teleport"],
  ["Valentina Boutique", "Store • Fashion • New Releases", "Store Find", "Shop"],
  ["Neon Nights Party", "Event • Tonight • 9 PM SLT", "Event", "View Event"],
  ["Metal Night Stage", "Post • Saved from CharlieJo", "Saved Post", "View Post"],
  ["Crystal Lagoon", "Beach Photo Spot • Moderate", "Photo Spot", "Teleport"],
];

export const gridsterTeleportCenterDestinations = [
  ["⌁", "icon-live", "Sanctuary Rocks", "Live music venue • Rock / Metal", "Live Now", "status-live"],
  ["◆", "icon-trending", "Neon District", "Cyber club • Nightlife", "Trending", "status-trending"],
  ["✦", "icon-popular", "Moonlit Cathedral", "Gothic photo spot", "Popular", "status-popular"],
  ["◇", "icon-active", "Ocean Breeze", "Beach hangout • Social", "Active", "status-active"],
];

export const gridsterUpcomingGridNights = [
  ["Sanctuary Rocks", "Metal Night • 8:00 PM SLT", "thumb-0"],
  ["Neon District", "Cyber Rave • 10:00 PM SLT", "thumb-1"],
  ["Ocean Breeze", "Beach Party • 2:00 PM SLT", "thumb-2"],
];

export const gridsterFeaturedPhotoSpots = [
  ["Moonlit Cathedral", "spot-1"],
  ["Crystal Lagoon", "spot-2"],
  ["Neon Alley", "spot-3"],
];

export const gridsterLiveNowEvents = [
  ["Sanctuary Rocks", "DJ RavenHex • Metal room is live", "Join"],
  ["Neon District", "Cyber Rave • 184 residents nearby", "Teleport"],
  ["Ocean Breeze", "Beach set • Sunset social", "Join"],
];

export const gridsterPopularGroups = [
  ["Club Elysium", "Nightlife, DJ sets, and featured party notices."],
  ["The Creators Collective", "Builders, bloggers, photographers, and event makers."],
  ["Pixel Fashion Society", "Style finds, creator drops, and editorial looks."],
  ["Sanctuary Rocks Crew", "Rock fans, live events, and metal night regulars."],
];

export const gridsterPostSampleComments = [
  ["R", "RavenHex", "This venue looks amazing. Saving this SLURL.", "8m"],
  ["N", "NovaVixen", "The neon lighting is everything.", "3m"],
];

export const gridsterComposerActions = ["▣ Photo", "◇ Event", "⌖ SLURL", "✎ Blog", "♙ Outfit", "🛍 Marketplace Find"];

export const gridsterComposerTemplates = ["Event Notice", "New Blog Post", "Store Release", "Photo Spot"];

export const gridsterTrendingTopics = [
  ["#SanctuaryRocks", "2.4K posts"],
  ["#CyberRave", "1.8K posts"],
  ["#BloggerDrop", "891 posts"],
  ["#WeekendEvents", "3.2K posts"],
  ["#PhotoSpots", "1.5K posts"],
];

export const gridsterWelcomeFeatures = ["Post", "Discover", "Teleport"];

export const gridsterExplorePreviewTiles = [
  ["♫", "Clubs", "Live DJs, events, parties"],
  ["🛍", "Stores", "New releases and creator drops"],
  ["✦", "Photo Spots", "Pretty sims and scenic backdrops"],
  ["⌂", "Rentals", "Homes, skyboxes, beach villas"],
];

export const gridsterProfileSummary = {
  initials: "CJ",
  displayName: "CharlieJo",
  role: "Second Life Blogger • Photographer • Creator",
  bio: "Capturing fashion, nightlife, events, and beautiful chaos across the grid with a neon eye for detail.",
  stats: [
    ["2.4K", "Followers"],
    ["320", "Following"],
    ["1.8K", "Posts"],
    ["1,250", "Bling Bits"],
  ],
  tags: ["Nightlife", "Fashion", "Photography", "Events"],
};

export const gridsterProfileFlairBadges = ["✨ Blogger", "🎧 DJ", "📸 Photographer", "💎 Bling Boosted"];

export const gridsterProfileSections = [
    ["Recent Posts", "Latest photos, event posts, blog updates, and nightlife moments.", "View Posts"],
    ["Saved Landmarks", "Favorite clubs, stores, photo spots, venues, and hangouts.", "View Landmarks"],
    ["Profile Flair", "Blogger, DJ, photographer, and Bling Boosted badges.", "Customize"],
    ["Creator Dashboard", "Profile views, SLURL clicks, event reach, and Bling Bits earned.", "View Analytics"],
  ];

export const gridsterAddSlurlFields = [
    ["Destination Name", "Moonlit Cathedral"],
    ["SLURL", "secondlife://Moonlit Cathedral/88/120/32"],
    ["Category", "Photo Spot / Event / Store / Venue / Community"],
    ["Rating", "General / Moderate / Adult"],
    ["Tags", "Gothic, Photos, Landmark, Moderate"],
  ];

export const gridsterFeedPreferenceCards = [
    ["Show Me More", ["Events", "Photo Spots", "Blogger Posts", "Store Releases", "Live DJs"]],
    ["Show Me Less", ["Repeated ads", "Overposted events", "Unrated adult content", "Empty SLURLs", "Low-credit posts"]],
    ["Ratings I Want To See", ["General", "Moderate", "Adult"]],
    ["Discovery Focus", ["Friends", "Local trends", "Popular across the grid", "New creators", "Nearby events"]],
    ["Hidden & Muted", ["Hidden posts", "Muted creators", "Blocked residents", "Reported content"]],
  ];

export const gridsterPhotoChallengeRules = [
    "Use your own photo",
    "Credit stores, poses, and locations when possible",
    "Mark Adult or Moderate content correctly",
    "No stolen images or fake creator credits",
  ];

export const gridsterPhotoChallengeEntries = [
    ["Rooftop Glow", "CharlieJo", "248"],
    ["Cyber Alley Kiss", "NovaVixen", "221"],
    ["Midnight Stage", "DJ Starfall", "187"],
    ["Electric Rain", "EchoMoon", "199"],
    ["Neon Wings", "RavenHex", "174"],
    ["City Pulse", "Pixel Pixie", "162"],
  ];

export const gridsterPhotoChallengeLeaders = [
    ["CharlieJo", "248 votes"],
    ["NovaVixen", "221 votes"],
    ["EchoMoon", "199 votes"],
  ];

export const gridsterSpotlightAwardCategories = [
    "Best Blogger",
    "Best DJ",
    "Best Venue",
    "Best Store",
    "Best Photographer",
    "Best Photo Spot",
    "Best Community Hub",
    "Rising Creator",
  ];

export const gridsterSpotlightAwardNominees = [
    ["CharlieJo", "Blogger", "412 votes"],
    ["DJ RavenHex", "DJ", "386 votes"],
    ["Sanctuary Rocks", "Venue", "361 votes"],
    ["Valentina Boutique", "Store", "334 votes"],
    ["Moonlit Cathedral", "Photo Spot", "309 votes"],
    ["Moonlit Hollow", "Community Hub", "288 votes"],
  ];

export const gridsterSpotlightAwardRules = [
    "Nominate real Gridster creators, places, stores, or communities",
    "No vote spam",
    "Credit creators honestly",
    "Respect content ratings and community rules",
  ];

export const gridsterVerificationTypes = [
    ["◆", "Resident", "For established Second Life residents and public personalities."],
    ["✦", "Blogger / Photographer", "For active bloggers, Flickr creators, editorial photographers, and content creators."],
    ["♫", "DJ / Host", "For performers, hosts, event staff, and live entertainment profiles."],
    ["◇", "Store Owner", "For designers, creators, marketplace sellers, and in-world brands."],
    ["⌖", "Venue / Sim Owner", "For clubs, event spaces, rentals, destinations, and public sims."],
    ["☽", "Community Hub", "For RP sims, clubs, families, fandoms, groups, and organized communities."],
  ];

export const gridsterVerificationRequirements = [
    "Active Gridster profile",
    "Clear Second Life identity or brand name",
    "Valid links such as Flickr, Primfeed, Marketplace, website, or SLURL",
    "No impersonation or misleading branding",
    "Respect ratings, creator credits, and community rules",
  ];

export const gridsterBlingBoostFields = [
    ["Boost Type", "Post / Event / Store / Profile / Community Hub"],
    ["Select Content", "Metal Night Stage photo post"],
    ["Target Audience", "Residents / Bloggers / DJs / Shoppers / Communities / Everyone"],
    ["Rating Visibility", "General / Moderate / Adult"],
    ["Boost Duration", "24 Hours / 3 Days / 7 Days"],
    ["Bling Bits Budget", "250 - 1,200 Bling Bits"],
  ];

export const gridsterBlingBoostPackages = [
    ["✦", "Spark Boost", "24 hours", "250 Bling Bits"],
    ["◆", "Glow Boost", "3 days", "600 Bling Bits"],
    ["◇", "Spotlight Boost", "7 days", "1,200 Bling Bits"],
    ["◈", "Event Rush", "Best for live events", "500 Bling Bits"],
  ];

export const gridsterCreateCommunityHubFields = [
    ["Community Name", "Moonlit Hollow"],
    ["Community Type", "RP Sim / Club / Family / Fandom / Venue Crew / Social Group"],
    ["Rating", "General / Moderate / Adult"],
    ["Description", "Gothic roleplay, events, stories, and dark fantasy gatherings."],
    ["Rules Link", "moonlithollow.grid/rules"],
    ["Main SLURL", "secondlife://Moonlit Hollow/128/92/27"],
    ["Application Link", "moonlithollow.grid/apply"],
    ["Tags", "Gothic, RP, Events, Community"],
  ];

export const gridsterCreateCommunityHubSections = ["Announcements", "Events", "Member Spotlights", "Applications"];

export const gridsterCreateBloggerPostFields = [
    ["Post Title", "Neon Noir: Midnight Luxe"],
    ["Style Category", "Fashion / Beauty / Tattoos / Decor / Nightlife / Beach / Gothic / Alternative"],
    ["Featured Brands", "Valentina Boutique, NovaVixen, Pixel Ink"],
    ["Outfit Credits", "Dress, boots, jewelry, mesh body appliers"],
    ["Pose Credits", "Moon Pose Studio • Editorial Set 04"],
    ["Location / Sim", "Moonlit Cathedral"],
    ["SLURL", "secondlife://Moonlit Cathedral/88/120/32"],
    ["Blog Link", "charliejo.grid/blog/neon-noir"],
    ["Flickr Link", "flickr.com/photos/charliejo/neon-noir"],
    ["Tags", "Fashion, Gothic, Nightlife, Tattoos"],
  ];

export const gridsterBloggerCreditRows = ["Body / Skin / Shape", "Outfit / Accessories", "Hair / Makeup / Tattoos", "Pose / Location"];

export const gridsterCreateStorePostFields = [
    ["Post Type", "New Release / Blogger Call / Sale / Marketplace Find / Event Booth"],
    ["Store Name", "Valentina Boutique"],
    ["Product / Collection Name", "Midnight Luxe Collection"],
    ["Price or Promo", "L$299 • Weekend promo"],
    ["Rating", "General / Moderate / Adult"],
    ["Marketplace Link", "marketplace.secondlife.com/stores/valentina"],
    ["In-World SLURL", "secondlife://Moonlit Market/142/88/24"],
    ["Tags", "Fashion, Event Look, Luxury, Blogger Pack"],
  ];

export const gridsterCreateEventFields = [
    ["Event Title", "Lunar Eclipse Live DJ Set"],
    ["Venue / Sim Name", "Club Elysium"],
    ["Date", "May 24, 2025"],
    ["Time in SLT", "9:00 PM SLT"],
    ["Event Rating", "General / Moderate / Adult"],
    ["DJ / Host", "DJ Starfall • Host RavenHex"],
    ["SLURL", "secondlife://Elysium Isle/128/128/24"],
    ["Event Tags", "Nightlife, DJ, Dance, Neon"],
  ];

export const gridsterSettingsCards = [
    {
      icon: "✦",
      title: "Profile Settings",
      desc: "Shape how residents see your Gridster identity.",
      options: ["Display name", "Bio", "Profile flair", "Avatar/banner"],
    },
    {
      icon: "⌕",
      title: "Discovery Preferences",
      desc: "Tune the places, posts, and grid activity you want to see first.",
      options: ["Events", "Stores", "Photo spots", "Communities"],
    },
    {
      icon: "◇",
      title: "Content Ratings",
      desc: "Keep discovery clear across General, Moderate, and Adult spaces.",
      options: ["General", "Moderate", "Adult", "Mature filters"],
    },
    {
      icon: "◌",
      title: "Privacy & Safety",
      desc: "Manage visibility, safety history, and who can reach you.",
      options: ["Blocked residents", "Hidden posts", "Report history", "Message permissions"],
    },
    {
      icon: "💎",
      title: "Bling Bits",
      desc: "Review rewards, boosts, goals, and flair purchases.",
      options: ["Weekly goal", "Boost history", "Rewards", "Profile flair purchases"],
    },
    {
      icon: "!",
      title: "Notifications",
      desc: "Choose which comments, follows, invites, and creator updates reach you.",
      options: ["Comments", "Follows", "Event invites", "Creator updates"],
    },
  ];

export const gridsterBlingShopItems = [
    ["✦", "Bling Boost", "Boost one post for 24 hours", "Cost: 250 Bits"],
    ["◇", "Featured Event", "Place your event in discovery", "Cost: 500 Bits"],
    ["◆", "Profile Flair", "Add sparkle badges to your profile", "Cost: 150 Bits"],
    ["◇", "Creator Spotlight", "Get featured in creator discovery", "Cost: 750 Bits"],
  ];

export const gridsterCreatorDashboardStats = [
    ["Profile Views", "4.8K", "+12% this week"],
    ["Event Clicks", "892", "+34% this week"],
    ["SLURL Teleports", "316", "+18% this week"],
    ["Bling Bits Earned", "620", "+90 today"],
  ];

export const gridsterVenueTools = [
    ["✦", "Event Builder", "Create event cards with posters, times, hosts, and SLURLs."],
    ["♫", "DJ Lineup", "Show who is playing tonight and when."],
    ["★", "Host Shoutout", "Spotlight hosts, greeters, and staff."],
    ["◆", "Traffic Boost", "Use Bling Bits to feature your venue in discovery."],
  ];

export const gridsterStoreToolFeatures = [
    ["◆", "New Release Drop", "Announce products with photos, credits, and SLURLs."],
    ["✦", "Blogger Call", "Find bloggers and photographers for your brand."],
    ["◇", "Weekend Sale", "Promote discounted items and limited-time deals."],
    ["⌁", "Marketplace Find", "Share product links, outfits, décor, and creator favorites."],
  ];

export const gridsterBloggerNetworkFeatures = [
    ["✦", "Blogger Calls", "Find stores looking for bloggers, photographers, and content creators."],
    ["◇", "Credit Builder", "Add outfit credits, store names, poses, locations, and SLURLs."],
    ["◆", "Lookbook Posts", "Share fashion, beauty, tattoos, décor, and event styling."],
    ["⌁", "Brand Matches", "Discover creators and stores that fit your personal style."],
  ];

export const gridsterCommunityHubFeatures = [
    ["☽", "RP Sim Pages", "Share lore, rules, characters, openings, and SLURLs."],
    ["✦", "Group Boards", "Post updates, announcements, photos, and event notices."],
    ["◆", "Member Spotlights", "Feature residents, staff, hosts, DJs, bloggers, and creators."],
    ["◇", "Application Posts", "Recruit staff, performers, tenants, models, bloggers, and roleplayers."],
  ];

export const gridsterPostReportOptions = [
    "Harassment",
    "Spam",
    "Misleading SLURL",
    "Unrated mature content",
    "Stolen content / missing credit",
    "Other",
  ];

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
