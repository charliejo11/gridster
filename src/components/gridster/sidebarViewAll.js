const SIDEBAR_VIEW_ALL_PAGES = {
  "Trending Events": "Events",
  "Popular Groups": "Groups",
  "Suggested Creators": "CreatorPagesDirectory",
  Friends: "Messages",
  "Live Now": "TonightInSL",
  "Friend Alerts": "Notifications",
  "SLURL Teleport": "TeleportDiscovery",
};

export function sidebarViewAllPage(title) {
  return SIDEBAR_VIEW_ALL_PAGES[title] ?? null;
}
