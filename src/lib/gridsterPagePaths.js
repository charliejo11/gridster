// Public paths for in-app pages. The reverse map is what deep links and
// the back button use to restore a page from window.location.pathname.
export const GRIDSTER_PAGE_PATHS = {
  BlingBoost: "/bling-depot",
  Messages: "/messenger",
  TeleportDiscovery: "/places",
  TonightInSL: "/tonight",
  BookingBoard: "/booking-board",
  Sponsors: "/sponsors",
  Games: "/games",
  CommunityGuidelines: "/community-guidelines",
  PrivacyPolicy: "/privacy",
  TermsOfService: "/terms",
};

export function pathForGridsterPage(page) {
  return GRIDSTER_PAGE_PATHS[page] ?? null;
}

export function pageForGridsterPath(pathname) {
  const match = Object.entries(GRIDSTER_PAGE_PATHS).find(([, path]) => path === pathname);
  return match?.[0] ?? null;
}
