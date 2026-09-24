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

// Both paths open the Auth page. The mode is not a separate page, so Auth
// has no single canonical path in GRIDSTER_PAGE_PATHS.
const GRIDSTER_AUTH_PATH_MODES = {
  "/login": "login",
  "/signup": "signup",
};

export function pathForGridsterPage(page) {
  return GRIDSTER_PAGE_PATHS[page] ?? null;
}

export function authModeForGridsterPath(pathname) {
  return GRIDSTER_AUTH_PATH_MODES[pathname] ?? null;
}

export function pageForGridsterPath(pathname) {
  if (authModeForGridsterPath(pathname)) {
    return "Auth";
  }

  const match = Object.entries(GRIDSTER_PAGE_PATHS).find(([, path]) => path === pathname);
  return match?.[0] ?? null;
}

// Keeps /login and /signup in the address bar while Auth is open so a refresh
// restores that mode. Every other known path still falls back to / when the
// current page has no path of its own.
export function nextGridsterHistoryPath({ activePage, showLanding, pathname }) {
  const mappedPagePath = !showLanding ? pathForGridsterPage(activePage) : null;

  if (mappedPagePath) {
    return mappedPagePath;
  }

  if (!showLanding && activePage === "Auth" && authModeForGridsterPath(pathname)) {
    return pathname;
  }

  if (pageForGridsterPath(pathname)) {
    return "/";
  }

  return null;
}
