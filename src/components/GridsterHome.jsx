import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getBlingBalanceSummary, getEquippedCosmeticsForUser } from "../lib/blingDepot";
import {
  GRIDSTER_MESSAGE_EVENT,
  fetchConversations,
  fetchThread,
  markThreadRead,
  sendMessage,
} from "../lib/gridsterMessages";
import { fetchFriends } from "../lib/gridsterFriends";
import {
  FEED_DISCOVERY_FOCUS_ACTIVE,
  FEED_SHOW_LESS_ACTIVE,
  FEED_SHOW_MORE_ACTIVE,
  RATING_LABEL_TO_VALUE,
  blockCreator,
  fetchCreatorActions,
  fetchFeedPreferences,
  fetchHiddenPostIds,
  fetchHiddenPostsWithContent,
  fetchMyReportedPostIds,
  hidePostForUser,
  muteCreator,
  rankAndFilterPosts,
  reportPost,
  saveFeedPreferences,
  unblockCreator,
  unhidePostForUser,
  unmuteCreator,
} from "../lib/gridsterFeedPreferences";
import {
  addFavoritePlace,
  computeGridsterProfileStrength,
  fetchFavoritePlaces,
  fetchGridsterProfile,
  fetchProfilesByUserIds,
  fetchResidentDirectory,
  removeFavoritePlace,
} from "../lib/gridsterProfiles";
import {
  GRIDSTER_EVENT_TYPE_LABELS,
  GRIDSTER_MATURITY_RATING_LABELS,
  GRIDSTER_PLACE_CATEGORIES,
  GRIDSTER_PLACE_CATEGORY_LABELS,
  fetchFeaturedPhotoSpots,
  fetchGridsterEvents,
  fetchGridsterPlaces,
} from "../lib/gridsterPlaces";
import { GRIDSTER_GROUP_CATEGORY_LABELS, fetchGroups } from "../lib/gridsterGroups";
import { GRIDSTER_POST_TYPE_LABELS, fetchPostsByIds, fetchRecentPosts } from "../lib/gridsterPosts";
import {
  createPhotoChallenge,
  closePhotoChallengeAndAwardWinner,
  createPhotoEntry,
  deletePhotoEntry,
  fetchActivePhotoChallenge,
  fetchBadgeRewardOptions,
  fetchMyVotedEntryIds,
  fetchPhotoEntries,
  votePhotoEntry,
} from "../lib/gridsterPhotoChallenges";
import {
  readGridsterStorage,
  saveGridsterFlag,
  usePersistedGridsterFlag,
  usePersistedGridsterValue,
} from "../lib/gridsterStorage";
import {
  getGridsterDestination,
  getGridsterProfile,
  gridsterComposerActions,
  gridsterComposerTemplates,
  gridsterDashboardEvents,
  gridsterDjSets,
  gridsterGalleryItems,
  gridsterGridNightEvents,
  gridsterLiveNow,
  gridsterLiveNowEvents,
  gridsterMarketplaceFinds,
  gridsterPostSampleComments,
  gridsterProfileFlairBadges,
  gridsterSidebarGroups,
  gridsterSuggestedCreators,
  gridsterTeleportCenterDestinations,
  gridsterThemeOptions,
  gridsterTrendingTopics,
  gridsterUpcomingGridNights,
  gridsterWelcomeFeatures,
  gridsterExplorePreviewTiles,
  gridsterProfileSections,
  gridsterProfileSummary,
  gridsterFeedPreferenceCards,
  gridsterPhotoChallengeRules,
  gridsterSpotlightAwardCategories,
  gridsterSpotlightAwardNominees,
  gridsterSpotlightAwardRules,
  gridsterVerificationTypes,
  gridsterVerificationRequirements,
  gridsterSettingsCards,
  gridsterCreatorDashboardStats,
  gridsterVenueTools,
  gridsterStoreToolFeatures,
  gridsterBloggerNetworkFeatures,
  gridsterPostReportOptions,
  hasGridsterProfile,
} from "../data/gridsterMockData";
import Header from "./gridster/Header";
import LeftSidebar from "./gridster/LeftSidebar";
import RightSidebar from "./gridster/RightSidebar";
import LandingPage from "./gridster/LandingPage";
import ActionButton from "./gridster/ActionButton";
import CardGrid from "./gridster/CardGrid";
import DashboardLayout from "./gridster/DashboardLayout";
import FeedPost from "./gridster/FeedPost";
import PageHeader from "./gridster/PageHeader";
import SectionHeader from "./gridster/SectionHeader";
import AuthPage from "./gridster/AuthPage";
import ProfileSetup from "./gridster/ProfileSetup";
import BlingDepot from "./gridster/BlingDepot";
import TeleportDiscoveryFeed from "./gridster/TeleportDiscoveryFeed";
import TonightInSL from "./gridster/TonightInSL";
import BookingBoard from "./gridster/BookingBoard";
import FeaturedAdminPage from "./gridster/FeaturedAdminPage";
import GroupsPage from "./gridster/GroupsPage";
import GroupDetailPage from "./gridster/GroupDetailPage";
import ResidentProfilePage from "./gridster/ResidentProfilePage";
import ResidentDirectoryPage from "./gridster/ResidentDirectoryPage";
import CreatorPagesDirectory from "./gridster/CreatorPagesDirectory";
import CreatorPageDetail from "./gridster/CreatorPageDetail";
import MyCreatorPagesPage from "./gridster/MyCreatorPagesPage";
import GridsterComposerModal from "./gridster/GridsterComposerModal";
import TeleportStatusChip from "./gridster/TeleportStatusChip";
import SponsorsPage from "./gridster/SponsorsPage";
import "./GridsterHome.css";

const GRIDSTER_PAGE_PATHS = {
  BlingBoost: "/bling-depot",
  Messages: "/messenger",
  TeleportDiscovery: "/places",
  TonightInSL: "/tonight",
  BookingBoard: "/booking-board",
  Sponsors: "/sponsors",
};
const GRIDSTER_PATH_PAGES = Object.fromEntries(
  Object.entries(GRIDSTER_PAGE_PATHS).map(([page, path]) => [path, page])
);

function getGridsterPageFromPath() {
  if (typeof window === "undefined") {
    return null;
  }

  return GRIDSTER_PATH_PAGES[window.location.pathname] ?? null;
}

function getTeleportButtonProps(destinationName, slurlOverride) {
  const destination = getGridsterDestination(destinationName);

  return {
    "data-destination": destination?.name ?? destinationName,
    "data-slurl": slurlOverride ?? destination?.slurl ?? "",
  };
}

function GridsterHome() {
  const [routePage] = useState(() => getGridsterPageFromPath());
  const [activePage, setActivePage] = usePersistedGridsterValue("activePage", routePage ?? "Home");
  const [showLanding, setShowLanding] = usePersistedGridsterValue("showLanding", routePage ? false : true);
  const [hasAppliedRoute, setHasAppliedRoute] = useState(false);

  if (routePage && !hasAppliedRoute) {
    setHasAppliedRoute(true);
    setActivePage(routePage);
    setShowLanding(false);
  }

  const [authMode, setAuthMode] = useState("login");
  const [toast, setToast] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [selectedProfileName, setSelectedProfileName] = useState("CharlieJo");
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedResidentUserId, setSelectedResidentUserId] = useState(null);
  const [selectedMessageFriendId, setSelectedMessageFriendId] = useState(null);
  const [selectedCreatorPageId, setSelectedCreatorPageId] = useState(null);
  const [initialTeleportCategory, setInitialTeleportCategory] = useState(null);
  const [composer, setComposer] = useState(null);
  const [postsRefreshToken, setPostsRefreshToken] = useState(0);
  const [theme, setTheme] = usePersistedGridsterValue("theme", "dark-neon");
  const toastTimerRef = useRef(null);
  const toastIdRef = useRef(0);

  const activeThemeLabel = gridsterThemeOptions.find(([, themeClass]) => themeClass === theme)?.[0] ?? "Dark Neon";

  useEffect(() => {
    if (!routePage) {
      return;
    }

    setActivePage(routePage);
    setShowLanding(false);
  }, [routePage, setActivePage, setShowLanding]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handlePopState = () => {
      const nextRoutePage = getGridsterPageFromPath();

      if (nextRoutePage) {
        setActivePage(nextRoutePage);
        setShowLanding(false);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [setActivePage, setShowLanding]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextPath = !showLanding && GRIDSTER_PAGE_PATHS[activePage]
      ? GRIDSTER_PAGE_PATHS[activePage]
      : GRIDSTER_PATH_PAGES[window.location.pathname]
        ? "/"
        : null;

    if (nextPath && window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }, [activePage, showLanding]);

  const showToast = (message) => {
    window.clearTimeout(toastTimerRef.current);
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, message });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  };

  const handleTeleport = (destinationName, slurl) => {
    if (!destinationName || !slurl) {
      showToast("Teleport link coming soon.");
      return;
    }

    if (!/^(https?:|secondlife:)\/\//i.test(slurl)) {
      showToast("This SLURL looks broken — try re-saving it.");
      return;
    }

    window.open(slurl, "_blank", "noopener,noreferrer");
    showToast(`Teleport ready: ${destinationName}`);
  };

  const openProfile = (profileName) => {
    const profile = getGridsterProfile(profileName);

    if (!profile) {
      showToast("Profile preview coming soon.");
      return;
    }

    setSelectedProfileName(profile.displayName);
    setShowNotifications(false);
    setShowThemeMenu(false);
    setActivePage("ProfilePreview");
  };

  const openGroup = (groupId) => {
    setSelectedGroupId(groupId);
    setShowNotifications(false);
    setShowThemeMenu(false);
    setActivePage("GroupDetail");
  };

  const openResidentProfile = (userId) => {
    setSelectedResidentUserId(userId);
    setShowNotifications(false);
    setShowThemeMenu(false);
    setActivePage("ResidentProfile");
  };

  const openMessages = (friendUserId) => {
    setSelectedMessageFriendId(friendUserId ?? null);
    setShowNotifications(false);
    setShowThemeMenu(false);
    setActivePage("Messages");
  };

  const openCreatorPage = (pageId) => {
    setSelectedCreatorPageId(pageId);
    setShowNotifications(false);
    setShowThemeMenu(false);
    setActivePage("CreatorPageDetail");
  };

  const openMyCreatorPages = () => {
    setSelectedCreatorPageId(null);
    setShowNotifications(false);
    setShowThemeMenu(false);
    setActivePage("MyCreatorPages");
  };

  const openTeleportDiscovery = (category) => {
    setInitialTeleportCategory(category || null);
    setShowNotifications(false);
    setShowThemeMenu(false);
    setActivePage("TeleportDiscovery");
  };

  const handleSidebarNavigate = (page) => {
    setInitialTeleportCategory(null);
    setActivePage(page);
  };

  const openComposer = (tab, content = "") => {
    setComposer({ tab, content });
    setShowNotifications(false);
    setShowThemeMenu(false);
  };

  const closeComposer = () => setComposer(null);

  const handlePosted = () => {
    setPostsRefreshToken((current) => current + 1);
  };

  const openAuth = (mode = "login") => {
    setAuthMode(mode === "signup" ? "signup" : "login");
    setActivePage("Auth");
    setShowLanding(false);
    setShowNotifications(false);
    setShowThemeMenu(false);
  };

  const handleLandingNavigate = (page, mode) => {
    if (page === "Auth") {
      openAuth(mode);
      return;
    }

    setActivePage(page);
    setShowLanding(false);
  };

  const handleGridsterClick = (event) => {
    const button = event.target.closest("button");

    if (!button) {
      return;
    }

    if (button.textContent.toLowerCase().includes("teleport")) {
      handleTeleport(button.dataset.destination, button.dataset.slurl);
    }
  };

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} onNavigate={handleLandingNavigate} />;
  }


  return (
    <main className={`gridster-page ${theme}`} onClick={handleGridsterClick}>
      <Header
        activePage={activePage}
        setActivePage={setActivePage}
        setShowLanding={setShowLanding}
        theme={theme}
        setTheme={setTheme}
        showToast={showToast}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        showThemeMenu={showThemeMenu}
        setShowThemeMenu={setShowThemeMenu}
        onAuthOpen={() => openAuth("login")}
        themeOptions={gridsterThemeOptions}
        activeThemeLabel={activeThemeLabel}
      />

      <DashboardLayout
        leftSidebar={(
          <LeftSidebar
            activePage={activePage}
            setActivePage={handleSidebarNavigate}
            onOpenComposer={openComposer}
            onOpenMyCreatorPages={openMyCreatorPages}
            showToast={showToast}
          >
            <ProfileFlairCard showToast={showToast} setActivePage={setActivePage} />
          </LeftSidebar>
        )}
        rightSidebar={(
          <RightSidebar
            creators={gridsterSuggestedCreators}
            events={gridsterDashboardEvents}
            groups={gridsterSidebarGroups}
            liveNow={gridsterLiveNow}
            onOpenProfile={openProfile}
            onOpenResidentProfile={openResidentProfile}
            onOpenMessages={openMessages}
            showToast={showToast}
          />
        )}
      >
        <CenterContent
          activePage={activePage}
          galleryItems={gridsterGalleryItems}
          authMode={authMode}
          selectedProfileName={selectedProfileName}
          selectedGroupId={selectedGroupId}
          selectedResidentUserId={selectedResidentUserId}
          selectedMessageFriendId={selectedMessageFriendId}
          selectedCreatorPageId={selectedCreatorPageId}
          initialTeleportCategory={initialTeleportCategory}
          postsRefreshToken={postsRefreshToken}
          setActivePage={setActivePage}
          onOpenProfile={openProfile}
          onOpenGroup={openGroup}
          onOpenResidentProfile={openResidentProfile}
          onOpenMessages={openMessages}
          onOpenCreatorPage={openCreatorPage}
          onOpenMyCreatorPages={openMyCreatorPages}
          onOpenTeleportDiscovery={openTeleportDiscovery}
          onOpenComposer={openComposer}
          onAuthOpen={openAuth}
          showToast={showToast}
        />
      </DashboardLayout>

      <GalleryStrip galleryItems={gridsterGalleryItems} showToast={showToast} />
      <GridsterFooter showToast={showToast} setActivePage={setActivePage} />
      {toast ? (
        <div className="gridster-toast glass-card" role="status" aria-live="polite" key={toast.id}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Close notification">×</button>
        </div>
      ) : null}
      {composer ? (
        <GridsterComposerModal
          initialTab={composer.tab}
          initialContent={composer.content}
          onAuthOpen={openAuth}
          onClose={closeComposer}
          onPosted={handlePosted}
          showToast={showToast}
        />
      ) : null}
    </main>
  );
}

function CenterContent({ activePage, galleryItems, authMode, selectedProfileName, selectedGroupId, selectedResidentUserId, selectedMessageFriendId, selectedCreatorPageId, initialTeleportCategory, postsRefreshToken, setActivePage, onOpenProfile, onOpenGroup, onOpenResidentProfile, onOpenMessages, onOpenCreatorPage, onOpenMyCreatorPages, onOpenTeleportDiscovery, onOpenComposer, onAuthOpen, showToast }) {
  if (activePage === "Home") {
    return (
      <>
        <CreatePostComposer onOpenComposer={onOpenComposer} showToast={showToast} />
        <RecentPostsFeed refreshToken={postsRefreshToken} onOpenComposer={onOpenComposer} showToast={showToast} />
        <TrendingNow showToast={showToast} />
        <WelcomeCard onExplore={() => setActivePage("Explore")} />
        <ExplorePreview showToast={showToast} />
        <TeleportCenter showToast={showToast} />
        <UpcomingGridNights showToast={showToast} />
        <FeaturedPhotoSpots onAuthOpen={onAuthOpen} onViewAll={() => onOpenTeleportDiscovery?.("photo_spots")} showToast={showToast} />
      </>
    );
  }

  if (activePage === "Explore") {
    return (
      <PageShell
        title="Explore"
        subtitle="Discover where residents are posting, shopping, dancing, roleplaying, and teleporting right now."
      >
        <ExplorePageContent
          galleryItems={galleryItems}
          onOpenTeleportDiscovery={onOpenTeleportDiscovery}
          showToast={showToast}
        />
      </PageShell>
    );
  }

  if (activePage === "Search") {
    return (
      <PageShell title="Search" subtitle="Find residents, stores, events, groups, photo spots, SLURLs, and communities.">
        <SearchResultsPage onOpenResidentProfile={onOpenResidentProfile} onOpenGroup={onOpenGroup} showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "Events") {
    return (
      <PageShell title="Events" subtitle="Find live DJs, club nights, shopping events, beach parties, and community gatherings.">
        <EventsPageContent onOpenComposer={onOpenComposer} showToast={showToast} />
        <LiveNowEvents showToast={showToast} />
        <VenueTools showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "BlingBoost") {
    return (
      <PageShell
        title="Bling Depot"
        subtitle="Spend Bling Bits on profile glowies, backgrounds, stickers, badges, and boosts."
      >
        <BlingDepot onAuthOpen={() => onAuthOpen?.("login")} showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "FeaturedAdmin") {
    return (
      <PageShell
        title="Featured Places"
        subtitle="Manage Featured Sim/Store placements and review resident nominations."
      >
        <FeaturedAdminPage showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "TeleportDiscovery") {
    return (
      <PageShell
        title="Teleport Discovery"
        subtitle="Real places worth a teleport — clubs, beaches, RP sims, stores, and more, verified by the community."
      >
        <TeleportDiscoveryFeed
          initialCategory={initialTeleportCategory}
          onAuthOpen={() => onAuthOpen?.("login")}
          showToast={showToast}
        />
      </PageShell>
    );
  }

  if (activePage === "BookingBoard") {
    return (
      <PageShell
        title="Booking Board"
        subtitle="Clubs looking to hire DJs, hosts, dancers, and managers — and talent ready to work tonight."
      >
        <BookingBoard onAuthOpen={() => onAuthOpen?.("login")} showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "Sponsors") {
    return (
      <PageShell
        title="Sponsor Gridster"
        subtitle="Get your store, club, sim, event, or brand seen by Second Life residents."
      >
        <SponsorsPage showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "TonightInSL") {
    return (
      <PageShell
        title="Tonight in Second Life"
        subtitle="Live DJs, contests, grand openings, and everything happening on the grid right now."
      >
        <TonightInSL onAuthOpen={() => onAuthOpen?.("login")} showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "FeedPreferences") {
    return (
      <PageShell
        title="Feed Preferences"
        subtitle="Tune your Gridster feed so you see more of what you love and less of what is not for you."
      >
        <FeedPreferencesPage showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "SavedItems") {
    return (
      <PageShell
        title="Saved Landmarks & Posts"
        subtitle="Your saved SLURLs, events, stores, photo spots, and favorite grid discoveries."
      >
        <SavedItemsPage setActivePage={setActivePage} showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "PhotoChallenge") {
    return (
      <PageShell
        title="Photo Challenge"
        subtitle="Join weekly photo themes, show off your world, earn Bling Bits, and get featured across the grid."
      >
        <PhotoChallengePage showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "SpotlightAwards") {
    return (
      <PageShell
        title="Spotlight Awards"
        subtitle="Celebrate the residents, creators, DJs, bloggers, venues, stores, and communities lighting up the grid."
      >
        <SpotlightAwardsPage showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "VerificationCenter") {
    return (
      <PageShell
        title="Verification"
        subtitle="Help residents know which creators, stores, venues, DJs, bloggers, and communities are authentic across the grid."
      >
        <VerificationCenterPage showToast={showToast} onAuthOpen={onAuthOpen} />
      </PageShell>
    );
  }

  if (activePage === "Groups") {
    return (
      <PageShell title="Groups" subtitle="Join clubs, creator circles, RP hubs, blogger networks, and community crews.">
        <GroupsPage onOpenGroup={onOpenGroup} onAuthOpen={onAuthOpen} showToast={showToast} />
        <CommunityStandards setActivePage={setActivePage} />
      </PageShell>
    );
  }

  if (activePage === "CommunityGuidelines") {
    return (
      <PageShell title="Community Guidelines" subtitle="Keep the grid fun, creative, and respectful.">
        <LegalContentPage sections={COMMUNITY_GUIDELINES_SECTIONS} />
      </PageShell>
    );
  }

  if (activePage === "TermsOfService") {
    return (
      <PageShell title="Terms of Service" subtitle="The basics of using Gridster during its early beta.">
        <LegalContentPage sections={TERMS_OF_SERVICE_SECTIONS} />
      </PageShell>
    );
  }

  if (activePage === "PrivacyPolicy") {
    return (
      <PageShell title="Privacy Policy" subtitle="What we collect, how we use it, and how you stay in control.">
        <LegalContentPage sections={PRIVACY_POLICY_SECTIONS} />
      </PageShell>
    );
  }

  if (activePage === "GroupDetail") {
    return (
      <PageShell title="Group" subtitle="Posts, events, announcements, photos, and members for this community.">
        <GroupDetailPage
          groupId={selectedGroupId}
          onAuthOpen={onAuthOpen}
          onOpenResidentProfile={onOpenResidentProfile}
          showToast={showToast}
        />
      </PageShell>
    );
  }

  if (activePage === "ResidentProfile") {
    return (
      <PageShell title="Resident Profile" subtitle="A real Gridster profile — verified status, cosmetics, and more.">
        <ResidentProfilePage userId={selectedResidentUserId} showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "ResidentDirectory") {
    return (
      <PageShell title="Residents" subtitle="Find residents by what they're available for.">
        <ResidentDirectoryPage onOpenResidentProfile={onOpenResidentProfile} showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "CreatorPagesDirectory") {
    return (
      <PageShell title="Creator Pages" subtitle="Real stores, DJs, bloggers, clubs, and venues owned by residents.">
        <CreatorPagesDirectory onOpenCreatorPage={onOpenCreatorPage} showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "CreatorPageDetail") {
    return (
      <PageShell title="Creator Page" subtitle="A real, ownable page for a store, creator, club, or venue.">
        <CreatorPageDetail
          pageId={selectedCreatorPageId}
          onEditPage={() => setActivePage("MyCreatorPages")}
          showToast={showToast}
        />
      </PageShell>
    );
  }

  if (activePage === "MyCreatorPages") {
    return (
      <PageShell title="My Pages" subtitle="Create and manage your Creator Pages.">
        <MyCreatorPagesPage
          initialEditPageId={selectedCreatorPageId}
          onOpenCreatorPage={onOpenCreatorPage}
          onAuthOpen={() => onAuthOpen?.("login")}
          showToast={showToast}
        />
      </PageShell>
    );
  }

  if (activePage === "Messages") {
    return (
      <PageShell
        title="Messages"
        subtitle="Keep up with comments, event invites, creator updates, store notices, and private messages."
      >
        <MessagesPageContent
          initialFriendId={selectedMessageFriendId}
          onOpenResidentProfile={onOpenResidentProfile}
          showToast={showToast}
        />
      </PageShell>
    );
  }

  if (activePage === "GridNights") {
    return (
      <PageShell title="Grid Nights" subtitle="Live events, DJ sets, club nights, parties, and gatherings happening across Second Life.">
        <BetaPlaceholderNotice>
          🚧 Grid Nights is showing sample events while we build this out — post real events from Tonight in SL or the Events page.
        </BetaPlaceholderNotice>
        <CardGrid as="section" className="nav-event-grid grid-nights-grid">
          {gridsterGridNightEvents.map(([title, time, thumb]) => (
            <article className="nav-event-card glass-card" key={title}>
              <div className={`nav-event-thumb ${thumb}`}></div>
              <div className="nav-event-copy">
                <span>Event</span>
                <h3>{title}</h3>
                <p>{time}</p>
              </div>
              <button onClick={() => showToast?.("Event details coming soon.")}>View Event</button>
              <button {...getTeleportButtonProps(title.split(" — ")[0])}>Teleport</button>
              <TeleportStatusChip
                slurl={getGridsterDestination(title.split(" — ")[0])?.slurl}
                destinationName={title.split(" — ")[0]}
                showToast={showToast}
              />
            </article>
          ))}
        </CardGrid>
      </PageShell>
    );
  }

  if (activePage === "Marketplace") {
    return (
      <PageShell title="Marketplace Finds" subtitle="Discover products, outfits, décor, accessories, blogger picks, and creator drops.">
        <BetaPlaceholderNotice>
          🚧 Marketplace Finds is showing sample listings while we build this out — post real store drops from the composer's Store tab.
        </BetaPlaceholderNotice>
        <CardGrid as="section" className="page-card-grid marketplace-grid">
          {gridsterMarketplaceFinds.map(([name, category], index) => (
            <article className="marketplace-card glass-card" key={name}>
              <div className={`marketplace-thumb thumb-${index % 6}`}>{name.charAt(0)}</div>
              <div className="marketplace-copy">
                <h3>{name}</h3>
                <p>{category}</p>
              </div>
              <div className="marketplace-actions">
                <button onClick={() => showToast?.("Opening marketplace listing...")}>View</button>
                <SaveButton label="Save" savedLabel="Saved" storageKey={`marketplace:${name}`} />
              </div>
            </article>
          ))}
        </CardGrid>
      </PageShell>
    );
  }

  if (activePage === "DJSets") {
    return (
      <PageShell title="DJ Sets" subtitle="Find live DJs, upcoming sets, club schedules, and music nights across the grid.">
        <BetaPlaceholderNotice>
          🚧 DJ Sets is showing sample listings while we build this out — post real live DJ events from Tonight in SL.
        </BetaPlaceholderNotice>
        <CardGrid as="section" className="page-card-grid dj-sets-grid">
          {gridsterDjSets.map(([name, venue, genre]) => (
            <article className="dj-set-card glass-card" key={name}>
              <div className={`dj-avatar thumb-${name.charCodeAt(0) % 6}`}>{name.split(" ").pop().charAt(0)}</div>
              <div className="dj-copy">
                <h3>{name}</h3>
                <p>{venue} • {genre}</p>
              </div>
              <div className="dj-actions">
                <FollowButton storageKey={name} />
                <button onClick={() => showToast?.("DJ set page coming soon.")}>View Set</button>
                <button {...getTeleportButtonProps(venue)}>Teleport</button>
                <TeleportStatusChip slurl={getGridsterDestination(venue)?.slurl} destinationName={venue} showToast={showToast} />
              </div>
            </article>
          ))}
        </CardGrid>
      </PageShell>
    );
  }

  if (activePage === "ProfilePreview") {
    const profile = getGridsterProfile(selectedProfileName) ?? getGridsterProfile("CharlieJo");

    return (
      <PageShell
        title={`${profile.displayName} Profile`}
        subtitle={`${profile.profileType} • ${profile.category}`}
      >
        <ProfilePreviewPage profile={profile} showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "Profile") {
    return (
      <PageShell title="Profile" subtitle="Create, edit, and preview your Gridster resident identity.">
        <ProfileSetup
          onAuthOpen={() => onAuthOpen?.("login")}
          onOpenResidentProfile={onOpenResidentProfile}
          onOpenBlingDepot={() => setActivePage("BlingBoost")}
          onOpenMyCreatorPages={onOpenMyCreatorPages}
          showToast={showToast}
        />
        <CreatorDashboard showToast={showToast} />
        <BloggerNetwork showToast={showToast} />
        <StoreTools showToast={showToast} />
        <BlingBits showToast={showToast} />
        <ProfileFlairCard variant="wide" showToast={showToast} setActivePage={setActivePage} />
      </PageShell>
    );
  }

  if (activePage === "Auth") {
    return <AuthPage initialMode={authMode} onProfileOpen={() => setActivePage("Profile")} />;
  }

  if (activePage === "Settings") {
    return (
      <PageShell
        title="Settings"
        subtitle="Manage profile, discovery, ratings, privacy, safety, and Bling Bits."
      >
        <SettingsPage setActivePage={setActivePage} showToast={showToast} />
      </PageShell>
    );
  }

  return null;
}

const SEARCH_FILTERS = ["All", "Residents", "Groups", "Places", "Events"];

function SearchResultsPage({ onOpenResidentProfile, onOpenGroup, showToast }) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      fetchResidentDirectory(),
      fetchGroups(),
      fetchGridsterPlaces(),
      fetchGridsterEvents(),
    ]).then(([residentsResult, groupsResult, placesResult, eventsResult]) => {
      if (!active) {
        return;
      }

      setResidents(residentsResult.status === "fulfilled" ? residentsResult.value || [] : []);
      setGroups(groupsResult.status === "fulfilled" ? groupsResult.value || [] : []);
      setPlaces(placesResult.status === "fulfilled" ? placesResult.value || [] : []);
      setEvents(eventsResult.status === "fulfilled" ? eventsResult.value || [] : []);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    const matches = [];

    if (activeFilter === "All" || activeFilter === "Residents") {
      residents.forEach((resident) => {
        const name = resident.display_name || resident.sl_username || "Resident";
        const haystack = `${resident.display_name || ""} ${resident.sl_username || ""}`.toLowerCase();

        if (!normalizedQuery || haystack.includes(normalizedQuery)) {
          matches.push({
            type: "resident",
            key: `resident-${resident.user_id}`,
            title: name,
            meta: resident.creator_type || "Resident",
            data: resident,
          });
        }
      });
    }

    if (activeFilter === "All" || activeFilter === "Groups") {
      groups.forEach((group) => {
        const haystack = `${group.name || ""}`.toLowerCase();

        if (!normalizedQuery || haystack.includes(normalizedQuery)) {
          matches.push({
            type: "group",
            key: `group-${group.id}`,
            title: group.name,
            meta: `${GRIDSTER_GROUP_CATEGORY_LABELS[group.category] || group.category} • ${group.member_count || 0} members`,
            data: group,
          });
        }
      });
    }

    if (activeFilter === "All" || activeFilter === "Places") {
      places.forEach((place) => {
        const haystack = `${place.title || ""} ${place.region_name || ""}`.toLowerCase();

        if (!normalizedQuery || haystack.includes(normalizedQuery)) {
          matches.push({
            type: "place",
            key: `place-${place.id}`,
            title: place.title,
            meta: `${GRIDSTER_PLACE_CATEGORY_LABELS[place.category] || place.category}${place.region_name ? " • " + place.region_name : ""}`,
            data: place,
          });
        }
      });
    }

    if (activeFilter === "All" || activeFilter === "Events") {
      events.forEach((event) => {
        const haystack = `${event.title || ""} ${event.region_name || ""}`.toLowerCase();

        if (!normalizedQuery || haystack.includes(normalizedQuery)) {
          matches.push({
            type: "event",
            key: `event-${event.id}`,
            title: event.title,
            meta: `${GRIDSTER_EVENT_TYPE_LABELS[event.event_type] || "Event"}${event.when_label ? " • " + event.when_label : ""}`,
            data: event,
          });
        }
      });
    }

    return matches;
  }, [residents, groups, places, events, normalizedQuery, activeFilter]);

  return (
    <section className="search-results-page">
      <div className="search-preview-card glass-card">
        <label className="search-preview-input">
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search residents, groups, places, and events..."
          />
        </label>

        <div className="search-filter-pills">
          {SEARCH_FILTERS.map((filter) => (
            <button
              key={filter}
              className={activeFilter === filter ? "active" : ""}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="tonight-message">Loading search results...</p>
      ) : results.length === 0 ? (
        <p className="tonight-message">
          {normalizedQuery ? `No results for "${query}".` : "Nothing here yet in this category."}
        </p>
      ) : (
        <CardGrid className="search-results-grid">
          {results.map((result, index) => (
            <article className="search-result-card glass-card" key={result.key}>
              <div className={`search-result-icon result-${index % 6}`}>{result.title?.charAt(0) || "?"}</div>
              <div className="search-result-copy">
                <h3>{result.title}</h3>
                <p>{result.meta}</p>
              </div>
              <SearchResultAction
                result={result}
                onOpenResidentProfile={onOpenResidentProfile}
                onOpenGroup={onOpenGroup}
                showToast={showToast}
              />
            </article>
          ))}
        </CardGrid>
      )}
    </section>
  );
}

function SearchResultAction({ result, onOpenResidentProfile, onOpenGroup, showToast }) {
  if (result.type === "resident") {
    return <button onClick={() => onOpenResidentProfile?.(result.data.user_id)}>View Profile</button>;
  }

  if (result.type === "group") {
    return <button onClick={() => onOpenGroup?.(result.data.id)}>View Group</button>;
  }

  return (
    <>
      <button {...getTeleportButtonProps(result.title, result.data.slurl)}>Teleport</button>
      <TeleportStatusChip slurl={result.data.slurl} destinationName={result.title} showToast={showToast} />
    </>
  );
}

const EXPLORE_CATEGORY_DESCRIPTIONS = {
  clubs: "Live DJs, parties, hosts, and nightlife.",
  beaches: "Sandy shores, sunsets, and beach hangouts.",
  rp_sims: "Roleplay hubs, fandoms, and story-driven sims.",
  stores: "New releases, sales, and creator drops.",
  photo_spots: "Beautiful sims, sets, and scenic backdrops.",
  adult_venues: "Adult-rated venues and experiences.",
  live_music: "Live shows, concerts, and music venues.",
  hangouts: "Casual hangouts and social spaces.",
};

function ExplorePageContent({ galleryItems, onOpenTeleportDiscovery, showToast }) {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchGridsterPlaces()
      .then((data) => {
        if (active) {
          setPlaces(data || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const recentPlaces = places.slice(0, 5);

  return (
    <>
      <section className="nav-card-grid explore-category-grid">
        {GRIDSTER_PLACE_CATEGORIES.map((category) => (
          <article className="nav-feature-card glass-card" key={category}>
            <span className="nav-card-icon">{GRIDSTER_PLACE_CATEGORY_LABELS[category].charAt(0)}</span>
            <h3>{GRIDSTER_PLACE_CATEGORY_LABELS[category]}</h3>
            <p>{EXPLORE_CATEGORY_DESCRIPTIONS[category]}</p>
            <button onClick={() => onOpenTeleportDiscovery?.(category)}>Browse</button>
          </article>
        ))}
      </section>

      <section className="nav-list-card glass-card">
        <SectionHeader className="nav-section-heading" eyebrow="Live Discovery" title="Recently Added Places" />

        {loading ? <p className="tonight-message">Loading destinations...</p> : null}

        {!loading && recentPlaces.length === 0 ? (
          <p className="tonight-message">
            No places posted yet.{" "}
            <button type="button" className="tonight-post-button" onClick={() => onOpenTeleportDiscovery?.()}>
              Browse Places
            </button>
          </p>
        ) : null}

        <div className="nav-destination-list">
          {recentPlaces.map((place) => (
            <article className="nav-destination-row" key={place.id}>
              <div className="nav-row-orb">{place.title.charAt(0)}</div>
              <div>
                <strong>{place.title}</strong>
                <small>{GRIDSTER_PLACE_CATEGORY_LABELS[place.category] || place.category} • {place.region_name}</small>
              </div>
              <button {...getTeleportButtonProps(place.title, place.slurl)}>Teleport</button>
              <TeleportStatusChip slurl={place.slurl} destinationName={place.title} showToast={showToast} />
            </article>
          ))}
        </div>
      </section>

      <GalleryPreview galleryItems={galleryItems} showToast={showToast} />
    </>
  );
}

function EventsPageContent({ onOpenComposer, showToast }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetchGridsterEvents()
      .then((nextEvents) => {
        if (active) {
          setEvents(nextEvents || []);
        }
      })
      .catch((fetchError) => {
        if (active) {
          setError(fetchError.message || "Could not load events.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="tonight-message">Loading events...</p>;
  }

  if (error) {
    return <p className="tonight-message tonight-error" role="alert">{error}</p>;
  }

  if (events.length === 0) {
    return (
      <p className="tonight-message">
        No events posted yet.{" "}
        <button type="button" className="tonight-post-button" onClick={() => onOpenComposer?.("event")}>
          + Post an Event
        </button>
      </p>
    );
  }

  return (
    <div className="tonight-grid">
      {events.map((eventItem) => (
        <article className="discovery-event-card glass-card" key={eventItem.id}>
          <div className="event-card-photo">
            {eventItem.photo_url ? (
              <img src={eventItem.photo_url} alt="" />
            ) : (
              <span className="event-card-photo-fallback">
                {GRIDSTER_EVENT_TYPE_LABELS[eventItem.event_type]?.charAt(0) ?? "?"}
              </span>
            )}
          </div>

          <div className="event-card-body">
            <div className="event-card-meta">
              <span className="event-type-pill">{GRIDSTER_EVENT_TYPE_LABELS[eventItem.event_type]}</span>
              <span className="event-when">{eventItem.when_label}</span>
            </div>

            <h3>{eventItem.title}</h3>

            {eventItem.gridster_places ? (
              <span className="event-place-link">📍 {eventItem.gridster_places.title}</span>
            ) : null}

            {eventItem.region_name ? <p className="event-region">{eventItem.region_name}</p> : null}
            {eventItem.description ? <p className="event-description">{eventItem.description}</p> : null}

            <span className="event-maturity-badge">
              {GRIDSTER_MATURITY_RATING_LABELS[eventItem.maturity_rating]}
            </span>
          </div>

          <div className="event-card-actions">
            <button type="button" data-destination={eventItem.title} data-slurl={eventItem.slurl}>
              Teleport
            </button>
            <TeleportStatusChip slurl={eventItem.slurl} destinationName={eventItem.title} showToast={showToast} />
          </div>
        </article>
      ))}
    </div>
  );
}

function MessagesPageContent({ initialFriendId, onOpenResidentProfile, showToast }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedFriendId, setSelectedFriendId] = useState(initialFriendId || null);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [sending, setSending] = useState(false);
  const [equippedThemeClass, setEquippedThemeClass] = useState("");

  const refreshConversations = (userId) => {
    if (!userId) {
      setConversations([]);
      setLoadingConversations(false);
      return;
    }

    fetchConversations(userId)
      .then((data) => setConversations(data))
      .catch(() => {})
      .finally(() => setLoadingConversations(false));
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user ?? null;

      if (!active) {
        return;
      }

      setCurrentUser(user);
      refreshConversations(user?.id);

      if (user) {
        getEquippedCosmeticsForUser(user.id)
          .then((equipped) => {
            if (!active) {
              return;
            }

            const theme = equipped?.find((cosmetic) => cosmetic.item_type === "messenger_theme");
            setEquippedThemeClass(theme?.bling_items?.preview_class || "");
          })
          .catch(() => {});
      }
    }).catch(() => {});

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialFriendId) {
      setSelectedFriendId(initialFriendId);
    }
  }, [initialFriendId]);

  useEffect(() => {
    if (!currentUser || !selectedFriendId) {
      setThread([]);
      return;
    }

    let active = true;

    const refreshThread = () => {
      fetchThread(currentUser.id, selectedFriendId)
        .then((data) => {
          if (active) {
            setThread(data);
          }
        })
        .catch(() => {});
    };

    refreshThread();
    markThreadRead(currentUser.id, selectedFriendId).catch(() => {});

    const pollTimer = setInterval(refreshThread, 4000);

    const handleMessageEvent = () => {
      refreshThread();
      refreshConversations(currentUser.id);
    };

    window.addEventListener(GRIDSTER_MESSAGE_EVENT, handleMessageEvent);

    return () => {
      active = false;
      clearInterval(pollTimer);
      window.removeEventListener(GRIDSTER_MESSAGE_EVENT, handleMessageEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, selectedFriendId]);

  const selectedConversation = conversations.find((item) => item.friend.user_id === selectedFriendId);
  const selectedFriend = selectedConversation?.friend;

  const handleSend = (event) => {
    event.preventDefault();

    const text = draft.trim();

    if (!text || !selectedFriendId || !currentUser) {
      return;
    }

    setSending(true);

    sendMessage(currentUser.id, selectedFriendId, text)
      .then(() => {
        setDraft("");
        return fetchThread(currentUser.id, selectedFriendId);
      })
      .then((data) => setThread(data))
      .catch((error) => showToast?.(error.message || "Could not send that message."))
      .finally(() => setSending(false));
  };

  if (!currentUser) {
    return <p className="groups-directory-message">Log in to message your friends.</p>;
  }

  return (
    <section className="gridster-inbox-page">
      <div className="gridster-inbox-shell glass-card">
        <aside className="inbox-conversation-column">
          <div className="inbox-panel-header">
            <div>
              <span>Direct Messages</span>
              <h3>Inbox</h3>
            </div>
            <strong>{conversations.length}</strong>
          </div>

          <div className="inbox-conversation-list">
            {loadingConversations ? (
              <p className="sidebar-widget-empty">Loading conversations...</p>
            ) : conversations.length === 0 ? (
              <p className="sidebar-widget-empty">No friends yet — add a friend from their profile to start chatting.</p>
            ) : (
              conversations.map(({ friend, lastMessage, unreadCount }, index) => (
                <button
                  type="button"
                  className={`inbox-conversation-row ${friend.user_id === selectedFriendId ? "active" : ""}`}
                  key={friend.user_id}
                  onClick={() => setSelectedFriendId(friend.user_id)}
                >
                  <span className={`conversation-avatar conversation-${index % 6}`}>
                    {friend.avatar_url ? <img src={friend.avatar_url} alt="" /> : (friend.display_name || friend.sl_username || "?").charAt(0).toUpperCase()}
                  </span>
                  <span className="conversation-copy">
                    <strong>{friend.display_name || friend.sl_username}</strong>
                    <small>{lastMessage ? lastMessage.content : "Say hello!"}</small>
                  </span>
                  {unreadCount > 0 ? <em>{unreadCount}</em> : null}
                </button>
              ))
            )}
          </div>
        </aside>

        <section className={`inbox-preview-panel ${equippedThemeClass}`}>
          {!selectedFriend ? (
            <p className="groups-directory-message">Select a friend to start messaging.</p>
          ) : (
            <>
              <div className="inbox-preview-header">
                <div className="preview-identity">
                  <span className="preview-avatar">
                    {selectedFriend.avatar_url ? <img src={selectedFriend.avatar_url} alt="" /> : (selectedFriend.display_name || selectedFriend.sl_username || "?").charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <h3>{selectedFriend.display_name || selectedFriend.sl_username}</h3>
                  </div>
                </div>
                <button type="button" onClick={() => onOpenResidentProfile?.(selectedFriend.user_id)}>View Profile</button>
              </div>

              <div className="inbox-message-stack">
                {thread.length === 0 ? (
                  <p className="sidebar-widget-empty">No messages yet. Say hello!</p>
                ) : (
                  thread.map((message) => (
                    <article className={`dm-message ${message.sender_id === currentUser.id ? "sent" : ""}`} key={message.id}>
                      <p>{message.content}</p>
                    </article>
                  ))
                )}
              </div>

              <form className="dm-input-row" onSubmit={handleSend}>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write a message..."
                  disabled={sending}
                />
                <button type="submit" disabled={sending || !draft.trim()}>
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

function ProfilePageContent() {
  return (
    <>
      <ProfileSummary />
      <section className="profile-sections-grid">
        {gridsterProfileSections.map(([title, desc, action], index) => (
          <article className="profile-section-card glass-card" key={title}>
            <span className={`nav-card-icon thumb-${index % 4}`}>{index + 1}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
            <button>{action}</button>
          </article>
        ))}
      </section>
    </>
  );
}

function ProfilePreviewPage({ profile, showToast }) {
  const stats = [
    ["Followers", profile.followers],
    ["Posts", profile.posts],
    ["Type", profile.profileType],
    ["Rating", profile.rating],
  ];

  return (
    <section className="profile-preview-page">
      <section className="profile-preview-hero glass-card">
        <div className="profile-preview-banner"></div>
        <div className="profile-preview-body">
          <div className="profile-preview-avatar">{profile.displayName.slice(0, 2).toUpperCase()}</div>
          <div className="profile-preview-copy">
            <span>{profile.profileType}</span>
            <h3>{profile.displayName}</h3>
            <strong>{profile.category}</strong>
            <p>{profile.bio}</p>
          </div>
        </div>

        <div className="profile-preview-stats">
          {stats.map(([label, value]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="profile-preview-flair">
          {profile.flair.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>

        <div className="profile-preview-actions">
          <FollowButton storageKey={profile.displayName} />
          <button onClick={() => showToast?.(`Message preview opened for ${profile.displayName}.`)}>Message</button>
          <SaveButton label="Save" savedLabel="Saved" storageKey={`profile:${profile.displayName}`} />
          <button onClick={() => showToast?.(`Profile link copied for ${profile.displayName}.`)}>Share</button>
          {profile.slurl ? (
            <>
              <button {...getTeleportButtonProps(profile.displayName, profile.slurl)}>Teleport</button>
              <TeleportStatusChip slurl={profile.slurl} destinationName={profile.displayName} showToast={showToast} />
            </>
          ) : null}
        </div>
      </section>

      <section className="profile-preview-grid">
        <ProfilePreviewSection title="Recent Posts" items={profile.recentPosts} />
        <ProfilePreviewSection title="Featured Links" items={profile.featuredLinks} />
        <ProfilePreviewSection title="Grid Activity" items={profile.activity} />
      </section>
    </section>
  );
}

function ProfilePreviewSection({ title, items }) {
  return (
    <article className="profile-preview-section glass-card">
      <SectionHeader className="profile-preview-section-heading" eyebrow="Profile" title={title} />
      <div className="profile-preview-list">
        {items.map((item) => (
          <div key={item}>
            <span></span>
            <p>{item}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

const FEED_RATING_VALUE_TO_LABEL = Object.fromEntries(
  Object.entries(RATING_LABEL_TO_VALUE).map(([label, value]) => [value, label])
);

function FeedPreferencesPage({ showToast }) {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [showMore, setShowMore] = useState([]);
  const [showLess, setShowLess] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [discoveryFocus, setDiscoveryFocus] = useState([]);
  const [hiddenPosts, setHiddenPosts] = useState([]);
  const [mutedProfiles, setMutedProfiles] = useState([]);
  const [blockedProfiles, setBlockedProfiles] = useState([]);
  const [reportedCount, setReportedCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id ?? null;

      if (!active) return;
      setUserId(currentUserId);

      const [prefs, hidden, creatorActions, reportedIds] = await Promise.all([
        fetchFeedPreferences(currentUserId),
        fetchHiddenPostsWithContent(currentUserId),
        fetchCreatorActions(currentUserId),
        fetchMyReportedPostIds(currentUserId),
      ]);

      if (!active) return;

      setShowMore(prefs.show_more);
      setShowLess(prefs.show_less);
      setRatings(prefs.ratings.map((value) => FEED_RATING_VALUE_TO_LABEL[value]).filter(Boolean));
      setDiscoveryFocus(prefs.discovery_focus);
      setHiddenPosts(hidden);
      setReportedCount(reportedIds.size);

      const profileMap = await fetchProfilesByUserIds([...creatorActions.muted, ...creatorActions.blocked]);

      if (!active) return;

      setMutedProfiles([...creatorActions.muted].map((id) => ({ id, profile: profileMap.get(id) })));
      setBlockedProfiles([...creatorActions.blocked].map((id) => ({ id, profile: profileMap.get(id) })));
    }

    load()
      .catch((loadError) => {
        console.error("Gridster feed preferences: could not load", loadError);
        if (active) showToast?.(loadError.message || "Could not load your feed preferences.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePill = (setValue, option) => {
    setValue((current) => (current.includes(option) ? current.filter((item) => item !== option) : [...current, option]));
  };

  const handleSave = async () => {
    if (!userId) {
      showToast?.("Log in to save feed preferences.");
      return;
    }

    setSaving(true);

    try {
      await saveFeedPreferences(userId, {
        show_more: showMore,
        show_less: showLess,
        ratings: ratings.map((label) => RATING_LABEL_TO_VALUE[label]).filter(Boolean),
        discovery_focus: discoveryFocus,
      });
      showToast?.("Feed preferences saved.");
    } catch (saveError) {
      console.error("Gridster feed preferences: could not save", saveError);
      showToast?.(saveError.message || "Could not save feed preferences.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnhide = async (postId) => {
    setBusyKey(`hide-${postId}`);

    try {
      await unhidePostForUser(userId, postId);
      setHiddenPosts((current) => current.filter((post) => post.id !== postId));
    } catch (unhideError) {
      console.error("Gridster feed preferences: could not unhide post", unhideError);
      showToast?.(unhideError.message || "Could not unhide this post.");
    } finally {
      setBusyKey("");
    }
  };

  const handleUnmute = async (targetUserId) => {
    setBusyKey(`mute-${targetUserId}`);

    try {
      await unmuteCreator(userId, targetUserId);
      setMutedProfiles((current) => current.filter((entry) => entry.id !== targetUserId));
      showToast?.("Creator unmuted.");
    } catch (unmuteError) {
      console.error("Gridster feed preferences: could not unmute creator", unmuteError);
      showToast?.(unmuteError.message || "Could not unmute this creator.");
    } finally {
      setBusyKey("");
    }
  };

  const handleUnblock = async (targetUserId) => {
    setBusyKey(`block-${targetUserId}`);

    try {
      await unblockCreator(userId, targetUserId);
      setBlockedProfiles((current) => current.filter((entry) => entry.id !== targetUserId));
      showToast?.("Resident unblocked.");
    } catch (unblockError) {
      console.error("Gridster feed preferences: could not unblock resident", unblockError);
      showToast?.(unblockError.message || "Could not unblock this resident.");
    } finally {
      setBusyKey("");
    }
  };

  if (loading) {
    return <p className="groups-directory-message">Loading feed preferences...</p>;
  }

  const cardConfigByTitle = {
    "Show Me More": { value: showMore, setValue: setShowMore, activeOptions: FEED_SHOW_MORE_ACTIVE },
    "Show Me Less": { value: showLess, setValue: setShowLess, activeOptions: FEED_SHOW_LESS_ACTIVE },
    "Ratings I Want To See": { value: ratings, setValue: setRatings, activeOptions: null },
    "Discovery Focus": { value: discoveryFocus, setValue: setDiscoveryFocus, activeOptions: FEED_DISCOVERY_FOCUS_ACTIVE },
  };

  return (
    <section className="feed-preferences-page">
      <div className="feed-preferences-grid">
        {gridsterFeedPreferenceCards
          .filter(([title]) => title !== "Hidden & Muted")
          .map(([title, options]) => {
            const config = cardConfigByTitle[title];

            return (
              <article className="feed-preference-card glass-card" key={title}>
                <SectionHeader className="feed-preference-heading" eyebrow="Feed Tuning" title={title} />

                <div className="feed-preference-pills">
                  {options.map((option) => {
                    const selected = config.value.includes(option);
                    const inactive = config.activeOptions && !config.activeOptions.includes(option);

                    return (
                      <button
                        key={option}
                        className={selected ? "active" : ""}
                        title={inactive ? "Saved, but doesn't affect your feed yet." : undefined}
                        onClick={() => togglePill(config.setValue, option)}
                      >
                        {option}
                        {inactive ? " •" : ""}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
      </div>

      <article className="feed-preference-card glass-card feed-preference-hidden-muted">
        <SectionHeader className="feed-preference-heading" eyebrow="Feed Tuning" title="Hidden & Muted" />

        <div className="feed-preference-management-group">
          <h4>Hidden posts ({hiddenPosts.length})</h4>
          {hiddenPosts.length ? (
            <ul className="feed-preference-management-list">
              {hiddenPosts.map((post) => (
                <li key={post.id}>
                  <span>
                    {post.author_name || "A Gridster resident"}
                    {": "}
                    {(post.content || "").slice(0, 60) || GRIDSTER_POST_TYPE_LABELS[post.post_type] || "Post"}
                  </span>
                  <button disabled={busyKey === `hide-${post.id}`} onClick={() => handleUnhide(post.id)}>
                    Unhide
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No hidden posts.</p>
          )}
        </div>

        <div className="feed-preference-management-group">
          <h4>Muted creators ({mutedProfiles.length})</h4>
          {mutedProfiles.length ? (
            <ul className="feed-preference-management-list">
              {mutedProfiles.map((entry) => (
                <li key={entry.id}>
                  <span>{entry.profile?.display_name || "A Gridster resident"}</span>
                  <button disabled={busyKey === `mute-${entry.id}`} onClick={() => handleUnmute(entry.id)}>
                    Unmute
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No muted creators.</p>
          )}
        </div>

        <div className="feed-preference-management-group">
          <h4>Blocked residents ({blockedProfiles.length})</h4>
          {blockedProfiles.length ? (
            <ul className="feed-preference-management-list">
              {blockedProfiles.map((entry) => (
                <li key={entry.id}>
                  <span>{entry.profile?.display_name || "A Gridster resident"}</span>
                  <button disabled={busyKey === `block-${entry.id}`} onClick={() => handleUnblock(entry.id)}>
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No blocked residents.</p>
          )}
        </div>

        <div className="feed-preference-management-group">
          <h4>Reported content ({reportedCount})</h4>
          <p>{reportedCount ? "Thanks for helping keep Gridster safe." : "You haven't reported anything yet."}</p>
        </div>
      </article>

      <div className="feed-preferences-note glass-card">
        <p>
          Using 👎 Not For Me on a post also helps Gridster learn what to show less often, without publicly
          downvoting anyone. Options marked with • are saved to your account but don't change your feed yet —
          there's no real signal for them today, so we're not faking one.
        </p>
        <button disabled={saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </section>
  );
}

const SAVED_ITEM_FILTERS = ["All", "Places", "Events", "Posts"];

function SavedItemsPage({ setActivePage, showToast }) {
  const [user, setUser] = useState(null);
  const [favoritePlaces, setFavoritePlaces] = useState([]);
  const [savedEvents, setSavedEvents] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const refreshSaved = async (nextUser) => {
    if (!nextUser) {
      setFavoritePlaces([]);
      setSavedEvents([]);
      setSavedPosts([]);
      return;
    }

    const storage = readGridsterStorage();
    const savedEventIds = Object.keys(storage.savedEvents ?? {});
    const savedPostIds = Object.keys(storage.savedPosts ?? {});

    const [places, allEvents, posts] = await Promise.all([
      fetchFavoritePlaces(nextUser.id),
      savedEventIds.length ? fetchGridsterEvents() : Promise.resolve([]),
      fetchPostsByIds(savedPostIds),
    ]);

    setFavoritePlaces(places || []);
    setSavedEvents((allEvents || []).filter((eventItem) => savedEventIds.includes(String(eventItem.id))));
    setSavedPosts(posts || []);
  };

  useEffect(() => {
    let active = true;

    supabase.auth
      .getUser()
      .then(async ({ data }) => {
        const nextUser = data?.user ?? null;

        if (!active) {
          return;
        }

        setUser(nextUser);

        try {
          await refreshSaved(nextUser);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleRemovePlace = async (row) => {
    if (!user) {
      return;
    }

    setBusyId(row.id);

    try {
      await removeFavoritePlace(user.id, row.place_id);
      await refreshSaved(user);
      showToast?.("Removed from saved places.");
    } catch (removeError) {
      showToast?.(removeError.message || "Could not remove this place.");
    } finally {
      setBusyId("");
    }
  };

  const handleRemoveEvent = async (eventItem) => {
    saveGridsterFlag("savedEvents", eventItem.id, false);
    await refreshSaved(user);
    showToast?.("Removed from saved events.");
  };

  const handleRemovePost = async (post) => {
    saveGridsterFlag("savedPosts", post.id, false);
    await refreshSaved(user);
    showToast?.("Removed from saved posts.");
  };

  if (loading) {
    return <p className="tonight-message">Loading your saved items...</p>;
  }

  if (!user) {
    return <p className="tonight-message">Log in to see your saved places, events, and posts.</p>;
  }

  const totalCount = favoritePlaces.length + savedEvents.length + savedPosts.length;
  const showPlaces = activeFilter === "All" || activeFilter === "Places";
  const showEvents = activeFilter === "All" || activeFilter === "Events";
  const showPosts = activeFilter === "All" || activeFilter === "Posts";

  return (
    <section className="saved-items-page">
      <div className="saved-filter-pills glass-card">
        {SAVED_ITEM_FILTERS.map((filter) => (
          <button
            className={activeFilter === filter ? "active" : ""}
            key={filter}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {totalCount === 0 ? (
        <p className="tonight-message">
          Nothing saved yet.{" "}
          <button type="button" className="tonight-post-button" onClick={() => setActivePage?.("TeleportDiscovery")}>
            Browse Places
          </button>
        </p>
      ) : null}

      <CardGrid className="saved-items-grid">
        {showPlaces
          ? favoritePlaces.map((row, index) => {
              const place = row.gridster_places;

              if (!place) {
                return null;
              }

              return (
                <article className="saved-item-card glass-card" key={`place-${row.id}`}>
                  <div className={`saved-item-thumb thumb-${index % 6}`}>{place.title.charAt(0)}</div>
                  <div className="saved-item-copy">
                    <span>Saved Place</span>
                    <h3>{place.title}</h3>
                    <p>{GRIDSTER_PLACE_CATEGORY_LABELS[place.category] || place.category} • {place.region_name}</p>
                  </div>
                  <div className="saved-item-actions">
                    <button {...getTeleportButtonProps(place.title, place.slurl)}>Teleport</button>
                    <TeleportStatusChip slurl={place.slurl} destinationName={place.title} showToast={showToast} />
                    <button
                      className="saved-remove-button"
                      aria-label={`Remove ${place.title} from saved items`}
                      disabled={busyId === row.id}
                      onClick={() => handleRemovePlace(row)}
                    >
                      ×
                    </button>
                  </div>
                </article>
              );
            })
          : null}

        {showEvents
          ? savedEvents.map((eventItem, index) => (
              <article className="saved-item-card glass-card" key={`event-${eventItem.id}`}>
                <div className={`saved-item-thumb thumb-${index % 6}`}>{eventItem.title.charAt(0)}</div>
                <div className="saved-item-copy">
                  <span>Saved Event</span>
                  <h3>{eventItem.title}</h3>
                  <p>{GRIDSTER_EVENT_TYPE_LABELS[eventItem.event_type]} • {eventItem.when_label}</p>
                </div>
                <div className="saved-item-actions">
                  <button {...getTeleportButtonProps(eventItem.title, eventItem.slurl)}>Teleport</button>
                  <TeleportStatusChip slurl={eventItem.slurl} destinationName={eventItem.title} showToast={showToast} />
                  <button
                    className="saved-remove-button"
                    aria-label={`Remove ${eventItem.title} from saved items`}
                    onClick={() => handleRemoveEvent(eventItem)}
                  >
                    ×
                  </button>
                </div>
              </article>
            ))
          : null}

        {showPosts
          ? savedPosts.map((post, index) => (
              <article className="saved-item-card glass-card" key={`post-${post.id}`}>
                <div className={`saved-item-thumb thumb-${index % 6}`}>{(post.author_name || "?").charAt(0)}</div>
                <div className="saved-item-copy">
                  <span>Saved Post</span>
                  <h3>{post.author_name || "Gridster Resident"}</h3>
                  <p>{post.content ? post.content.slice(0, 90) : GRIDSTER_POST_TYPE_LABELS[post.post_type]}</p>
                </div>
                <div className="saved-item-actions">
                  <button
                    className="saved-remove-button"
                    aria-label="Remove this post from saved items"
                    onClick={() => handleRemovePost(post)}
                  >
                    ×
                  </button>
                </div>
              </article>
            ))
          : null}
      </CardGrid>
    </section>
  );
}

const EMPTY_PHOTO_ENTRY_FORM = { photo_url: "", caption: "", creator_name: "" };
const EMPTY_PHOTO_CHALLENGE_FORM = {
  title: "",
  description: "",
  reward_bling_bits: 500,
  reward_badge_item_id: "",
  deadline_label: "",
};

function PhotoChallengePage({ showToast }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [entries, setEntries] = useState([]);
  const [votedEntryIds, setVotedEntryIds] = useState(new Set());
  const [badgeOptions, setBadgeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryForm, setEntryForm] = useState(EMPTY_PHOTO_ENTRY_FORM);
  const [submittingEntry, setSubmittingEntry] = useState(false);
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [challengeForm, setChallengeForm] = useState(EMPTY_PHOTO_CHALLENGE_FORM);
  const [submittingChallenge, setSubmittingChallenge] = useState(false);
  const [closingChallenge, setClosingChallenge] = useState(false);

  const refreshChallengeAndEntries = async () => {
    const nextChallenge = await fetchActivePhotoChallenge();
    setChallenge(nextChallenge);

    if (nextChallenge) {
      const nextEntries = await fetchPhotoEntries(nextChallenge.id);
      setEntries(nextEntries || []);
    } else {
      setEntries([]);
    }

    return nextChallenge;
  };

  useEffect(() => {
    let active = true;

    async function load(nextUser) {
      if (!active) {
        return;
      }

      setUser(nextUser);
      setLoading(true);

      try {
        await refreshChallengeAndEntries();

        if (nextUser) {
          const [votedIds, blingSummary, profile] = await Promise.all([
            fetchMyVotedEntryIds(nextUser.id),
            getBlingBalanceSummary(),
            fetchGridsterProfile(nextUser.id),
          ]);

          if (active) {
            setVotedEntryIds(votedIds);
            setIsAdmin(Boolean(blingSummary?.isAdmin));
            setEntryForm((current) => ({
              ...current,
              creator_name: current.creator_name || profile?.display_name || profile?.sl_username || "",
            }));

            if (blingSummary?.isAdmin) {
              const badges = await fetchBadgeRewardOptions();
              if (active) {
                setBadgeOptions(badges || []);
              }
            }
          }
        } else if (active) {
          setVotedEntryIds(new Set());
          setIsAdmin(false);
          setBadgeOptions([]);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Could not load the Photo Challenge.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    supabase.auth
      .getUser()
      .then(({ data }) => load(data?.user ?? null))
      .catch((authError) => {
        if (!active) {
          return;
        }

        setError(authError.message || "Could not check your login session.");
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user ?? null);
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const leaders = useMemo(() => {
    return [...entries].sort((a, b) => b.vote_count - a.vote_count).slice(0, 3);
  }, [entries]);

  const scrollToEntries = () => {
    document.getElementById("featured-entries-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleOpenEntryForm = () => {
    if (!user) {
      showToast?.("Log in to enter the Photo Challenge.");
      return;
    }

    setShowEntryForm(true);
  };

  const updateEntryField = (field, value) => {
    setEntryForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmitEntry = async (event) => {
    event.preventDefault();

    if (!user || !challenge) {
      return;
    }

    setSubmittingEntry(true);
    setMessage("");
    setError("");

    try {
      await createPhotoEntry(user.id, challenge.id, entryForm);
      await refreshChallengeAndEntries();
      setEntryForm((current) => ({ ...EMPTY_PHOTO_ENTRY_FORM, creator_name: current.creator_name }));
      setShowEntryForm(false);
      setMessage("Entry submitted.");
      showToast?.("Entry submitted.");
    } catch (submitError) {
      setError(submitError.message || "Could not submit this entry.");
    } finally {
      setSubmittingEntry(false);
    }
  };

  const handleDeleteEntry = async (entry) => {
    setBusyId(entry.id);

    try {
      await deletePhotoEntry(entry.id, user.id);
      await refreshChallengeAndEntries();
      showToast?.("Entry removed.");
    } catch (deleteError) {
      showToast?.(deleteError.message || "Could not remove this entry.");
    } finally {
      setBusyId("");
    }
  };

  const handleVote = async (entry) => {
    if (!user) {
      showToast?.("Log in to vote in the Photo Challenge.");
      return;
    }

    setBusyId(entry.id);

    try {
      const result = await votePhotoEntry(entry.id);
      await refreshChallengeAndEntries();
      setVotedEntryIds((current) => new Set(current).add(entry.id));
      showToast?.(result?.already_voted ? "You already voted for this entry." : "Vote recorded.");
    } catch (voteError) {
      showToast?.(voteError.message || "Could not record your vote.");
    } finally {
      setBusyId("");
    }
  };

  const updateChallengeField = (field, value) => {
    setChallengeForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmitChallenge = async (event) => {
    event.preventDefault();
    setSubmittingChallenge(true);

    try {
      await createPhotoChallenge(challengeForm);
      await refreshChallengeAndEntries();
      setChallengeForm(EMPTY_PHOTO_CHALLENGE_FORM);
      setShowChallengeForm(false);
      showToast?.("New Photo Challenge created.");
    } catch (createError) {
      showToast?.(createError.message || "Could not create this challenge.");
    } finally {
      setSubmittingChallenge(false);
    }
  };

  const handleCloseChallenge = async () => {
    if (!challenge) {
      return;
    }

    setClosingChallenge(true);

    try {
      const result = await closePhotoChallengeAndAwardWinner(challenge.id);
      await refreshChallengeAndEntries();

      if (result?.winner_user_id) {
        showToast?.(`Challenge closed. Winner awarded ${result.awarded_bling_bits} Bling Bits.`);
      } else {
        showToast?.("Challenge closed. No entries were submitted.");
      }
    } catch (closeError) {
      showToast?.(closeError.message || "Could not close this challenge.");
    } finally {
      setClosingChallenge(false);
    }
  };

  return (
    <section className="photo-challenge-page">
      <section className="photo-challenge-hero glass-card">
        <div className="challenge-hero-copy">
          <span>Weekly Theme</span>
          <h3>{loading ? "Loading..." : challenge?.title || "No Active Challenge"}</h3>
          <p>{challenge?.description || "Check back soon for the next weekly Photo Challenge theme."}</p>

          {challenge ? (
            <div className="challenge-meta-grid">
              <div>
                <strong>Reward</strong>
                <span>Winner earns {challenge.reward_bling_bits} Bling Bits{challenge.reward_badge_item_id ? " + a badge" : ""}.</span>
              </div>
              <div>
                <strong>Deadline</strong>
                <span>{challenge.deadline_label || "TBA"}</span>
              </div>
            </div>
          ) : null}

          <div className="challenge-hero-actions">
            <button onClick={handleOpenEntryForm}>Join Challenge</button>
            <button onClick={handleOpenEntryForm}>Upload Entry</button>
            <button onClick={scrollToEntries}>View Entries</button>
          </div>
        </div>
        <div className="challenge-hero-art">
          <span>{challenge?.title || "Photo Challenge"}</span>
        </div>
      </section>

      {error ? <p className="challenge-message challenge-error" role="alert">{error}</p> : null}
      {message ? <p className="challenge-message challenge-success">{message}</p> : null}

      {showEntryForm ? (
        <form className="place-post-form glass-card" onSubmit={handleSubmitEntry}>
          <label>
            <span>Photo URL</span>
            <input
              type="text"
              value={entryForm.photo_url}
              onChange={(event) => updateEntryField("photo_url", event.target.value)}
              placeholder="https://..."
              required
            />
          </label>

          <label>
            <span>Caption</span>
            <input
              type="text"
              value={entryForm.caption}
              onChange={(event) => updateEntryField("caption", event.target.value)}
            />
          </label>

          <div className="place-post-form-actions">
            <button type="button" onClick={() => setShowEntryForm(false)}>Cancel</button>
            <button type="submit" disabled={submittingEntry}>
              {submittingEntry ? "Submitting..." : "Submit Entry"}
            </button>
          </div>
        </form>
      ) : null}

      {isAdmin ? (
        <section className="challenge-admin-panel glass-card">
          <SectionHeader className="challenge-section-heading" eyebrow="Admin" title="Manage This Challenge" />

          <div className="challenge-admin-actions">
            <button type="button" onClick={() => setShowChallengeForm((current) => !current)}>
              {showChallengeForm ? "Cancel New Challenge" : "Create New Challenge"}
            </button>
            {challenge ? (
              <button type="button" disabled={closingChallenge} onClick={handleCloseChallenge}>
                {closingChallenge ? "Closing..." : "Close Challenge & Award Winner"}
              </button>
            ) : null}
          </div>

          {showChallengeForm ? (
            <form className="place-post-form" onSubmit={handleSubmitChallenge}>
              <label>
                <span>Theme Title</span>
                <input
                  type="text"
                  value={challengeForm.title}
                  onChange={(event) => updateChallengeField("title", event.target.value)}
                  required
                />
              </label>

              <label>
                <span>Description</span>
                <input
                  type="text"
                  value={challengeForm.description}
                  onChange={(event) => updateChallengeField("description", event.target.value)}
                />
              </label>

              <label>
                <span>Reward (Bling Bits)</span>
                <input
                  type="number"
                  min="0"
                  value={challengeForm.reward_bling_bits}
                  onChange={(event) => updateChallengeField("reward_bling_bits", event.target.value)}
                />
              </label>

              <label>
                <span>Reward Badge (optional)</span>
                <select
                  value={challengeForm.reward_badge_item_id}
                  onChange={(event) => updateChallengeField("reward_badge_item_id", event.target.value)}
                >
                  <option value="">No badge</option>
                  {badgeOptions.map((badge) => (
                    <option key={badge.id} value={badge.id}>{badge.name}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Deadline</span>
                <input
                  type="text"
                  value={challengeForm.deadline_label}
                  onChange={(event) => updateChallengeField("deadline_label", event.target.value)}
                  placeholder="Sunday • 11:59 PM SLT"
                />
              </label>

              <div className="place-post-form-actions">
                <button type="submit" disabled={submittingChallenge}>
                  {submittingChallenge ? "Creating..." : "Create Challenge"}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      <div className="photo-challenge-content">
        <section className="challenge-rules-card glass-card">
          <SectionHeader className="challenge-section-heading" eyebrow="Challenge Rules" title="Keep It Fair" />
          <ul>
            {gridsterPhotoChallengeRules.map((rule) => (
              <li key={rule}>
                <span></span>
                {rule}
              </li>
            ))}
          </ul>
        </section>

        <section className="challenge-leaderboard-card glass-card">
          <SectionHeader className="challenge-section-heading" eyebrow="Top This Week" title="Leaderboard" />
          <div className="challenge-leader-list">
            {leaders.length === 0 ? <p>No entries yet.</p> : null}
            {leaders.map((entry, index) => (
              <article key={entry.id}>
                <strong>{index + 1}. {entry.creator_name || "Unknown"}</strong>
                <span>{entry.vote_count} votes</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="featured-entries-section" id="featured-entries-section">
        <SectionHeader className="challenge-section-heading" eyebrow="Community Gallery" title="Featured Entries" />
        <div className="featured-entry-grid">
          {entries.length === 0 ? <p>No entries submitted yet. Be the first!</p> : null}
          {entries.map((entry, index) => {
            const busy = busyId === entry.id;
            const voted = votedEntryIds.has(entry.id);
            const isOwner = user?.id === entry.user_id;

            return (
              <article className="featured-entry-card glass-card" key={entry.id}>
                <div className={`entry-image entry-${index % 6}`}>
                  {entry.photo_url ? <img src={entry.photo_url} alt="" /> : null}
                </div>
                <div className="entry-card-copy">
                  <h3>{entry.caption || "Untitled"}</h3>
                  <p>by {entry.creator_name || "Unknown"}</p>
                </div>
                <div className="entry-card-actions">
                  <button disabled={busy || voted} onClick={() => handleVote(entry)}>
                    {voted ? "Voted" : "Vote"}
                  </button>
                  <span>{entry.vote_count} votes</span>
                  {isOwner ? (
                    <button disabled={busy} onClick={() => handleDeleteEntry(entry)}>Delete</button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function SpotlightAwardsPage({ showToast }) {
  return (
    <section className="spotlight-awards-page">
      <section className="spotlight-hero-card glass-card">
        <div className="spotlight-hero-copy">
          <span>This Month’s Spotlight</span>
          <h3>No Winner Yet</h3>
          <strong>Nominations Open</strong>
          <p>We haven’t crowned a winner yet — nominate your favorite creators below to kick off the first cycle.</p>

          <div className="spotlight-reward-pill">
            <span>Reward</span>
            <strong>1,000 Bling Bits + Featured Profile placement</strong>
          </div>

          <div className="spotlight-hero-actions">
            <button onClick={() => showToast?.("Nominations coming soon.")}>Nominate Someone</button>
            <button onClick={() => showToast?.("Past winners coming soon.")}>View Winners</button>
            <button onClick={() => showToast?.("Voting coming soon.")}>Vote Now</button>
          </div>
        </div>
        <div className="spotlight-diamond-art">
          <span>◆</span>
          <strong>Spotlight</strong>
        </div>
      </section>

      <section className="award-categories-card glass-card">
        <SectionHeader className="spotlight-section-heading" eyebrow="Award Categories" title="Celebrate Every Corner Of The Grid" />
        <div className="award-category-grid">
          {gridsterSpotlightAwardCategories.map((category, index) => (
            <article className="award-category-tile" key={category}>
              <span>{index + 1}</span>
              <strong>{category}</strong>
            </article>
          ))}
        </div>
      </section>

      <div className="spotlight-lower-grid">
        <section className="nominees-section">
          <SectionHeader className="spotlight-section-heading" eyebrow="Community Nominees" title="Vote For This Month’s Favorites" />
          <div className="nominee-grid">
            {gridsterSpotlightAwardNominees.map(([name, category, votes], index) => (
              <article className="nominee-card glass-card" key={name}>
                <div className={`nominee-thumb nominee-${index}`}>{name.charAt(0)}</div>
                <div className="nominee-copy">
                  <h3>{name}</h3>
                  <p>{category}</p>
                  <span>{votes}</span>
                </div>
                <button onClick={() => showToast?.(`Vote recorded for ${name}.`)}>Vote</button>
              </article>
            ))}
          </div>
        </section>

        <aside className="spotlight-rules-card glass-card">
          <SectionHeader className="spotlight-section-heading" eyebrow="Spotlight Rules" title="Keep Awards Fair" />
          <ul>
            {gridsterSpotlightAwardRules.map((rule) => (
              <li key={rule}>
                <span></span>
                {rule}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}

function VerificationCenterPage({ showToast, onAuthOpen }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let active = true;

    const refreshProfile = (nextUser) => {
      if (!nextUser) {
        setProfile(null);
        return;
      }

      fetchGridsterProfile(nextUser.id)
        .then((nextProfile) => {
          if (active) {
            setProfile(nextProfile);
          }
        })
        .catch(() => {});
    };

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data?.user ?? null);
        refreshProfile(data?.user ?? null);
      }
    }).catch(() => {});

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      refreshProfile(session?.user ?? null);
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const displayName = user ? profile?.display_name || profile?.sl_username || "Set up your profile" : "Not logged in";
  const profileStrength = user ? computeGridsterProfileStrength(profile) : 0;
  const isEligible = user && Boolean(profile?.display_name?.trim() && profile?.sl_username?.trim() && profile?.bio?.trim());
  const statusLabel = !user
    ? "Log In to Check Status"
    : profile?.sl_verified
      ? "Verified"
      : isEligible
        ? "Eligible to Apply"
        : "Complete Your Profile First";

  return (
    <section className="verification-center-page">
      <section className="verification-hero-card glass-card">
        <div className="verification-hero-copy">
          <span>Verified Status</span>
          <h3>Verified Gridster Profiles</h3>
          <p>Verification helps confirm identity, reduce impersonation, protect creators, and make discovery safer.</p>

          <div className="verification-hero-actions">
            <button onClick={() => showToast?.("Applying for creator verification coming soon.")}>Apply for Verification</button>
            <button onClick={() => showToast?.("Verification requirements coming soon.")}>Check Requirements</button>
            <button onClick={() => showToast?.("Verified directory coming soon.")}>View Verified Directory</button>
          </div>
        </div>

        <div className="verification-badge-art">
          <span>◆</span>
          <strong>Verified</strong>
        </div>
      </section>

      <section className="verification-type-section">
        <SectionHeader className="verification-section-heading" eyebrow="Verification Types" title="Who Can Get Verified" />

        <div className="verification-type-grid">
          {gridsterVerificationTypes.map(([icon, title, desc]) => (
            <article className="verification-type-card glass-card" key={title}>
              <span className="verification-type-icon">{icon}</span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="verification-lower-grid">
        <section className="verification-requirements-card glass-card">
          <SectionHeader className="verification-section-heading" eyebrow="Verification Requirements" title="Before You Apply" />
          <ul>
            {gridsterVerificationRequirements.map((item) => (
              <li key={item}>
                <span></span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <aside className="verification-status-card glass-card">
          <SectionHeader className="verification-section-heading" eyebrow="Your Verification Status" title={displayName} />
          <strong>{statusLabel}</strong>

          <div className="verification-strength">
            <div>
              <span>Profile strength</span>
              <b>{profileStrength}%</b>
            </div>
            <div className="verification-strength-bar">
              <span style={{ width: `${profileStrength}%` }}></span>
            </div>
          </div>

          <p>
            {!user
              ? "Log in to check your verification eligibility."
              : "Suggested next step: Add official links and featured posts."}
          </p>
          {user ? (
            <button onClick={() => showToast?.("Reviewing profile links coming soon.")}>Review Profile Links</button>
          ) : (
            <button onClick={() => onAuthOpen?.("login")}>Log In</button>
          )}
        </aside>
      </div>
    </section>
  );
}

function SettingsPage({ setActivePage, showToast }) {
  return (
    <div className="settings-page-inner">
      <BetaPlaceholderNotice>
        🚧 Most settings here are previews for now — Profile Settings is the one that's fully wired up during beta.
      </BetaPlaceholderNotice>
      <div className="settings-grid">
        {gridsterSettingsCards.map(({ icon, title, desc, options }) => (
        <article className="settings-card glass-card" key={title}>
          <div className="settings-card-top">
            <span className="settings-icon">{icon}</span>
            <div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          </div>

          <ul className="settings-option-list">
            {options.map((option) => (
              <li key={option}>
                <span></span>
                {option}
              </li>
            ))}
          </ul>

          <button
            onClick={() =>
              title === "Profile Settings"
                ? setActivePage?.("Profile")
                : showToast?.(`${title} coming soon.`)
            }
          >
            {title === "Profile Settings" ? "Edit Profile" : "Manage"}
          </button>
        </article>
        ))}
      </div>
    </div>
  );
}

const COMPOSER_ACTION_TABS = {
  "▣ Photo": "photo",
  "◇ Event": "event",
  "⌖ SLURL": "slurl",
  "✎ Blog": "blog",
};

function CreatePostComposer({ onOpenComposer, showToast }) {
  const [content, setContent] = useState("");

  const handleAction = (action) => {
    const tab = COMPOSER_ACTION_TABS[action];

    if (tab) {
      onOpenComposer?.(tab);
    } else {
      showToast?.(`${action} coming soon.`);
    }
  };

  return (
    <section className="create-post glass-card">
      <div className="composer-top">
        <div className="mini-avatar">CJ</div>
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="What's happening in your world?"
        />
        <span className="sparkle">✦</span>
      </div>

      <div className="composer-actions">
        {gridsterComposerActions.map((action) => (
          <button key={action} onClick={() => handleAction(action)}>{action}</button>
        ))}
        <button className="composer-post-button" onClick={() => onOpenComposer?.("general", content)}>
          Post
        </button>
      </div>

      <div className="composer-templates">
        <span className="templates-label">Quick Post Templates</span>
        <div className="template-chips">
          {gridsterComposerTemplates.map((template) => (
            <button
              className="template-chip"
              key={template}
              onClick={() => showToast?.(`${template} template coming soon.`)}
            >
              {template}
            </button>
          ))}
        </div>
        <p className="composer-helper">Share a moment, promote an event, drop a SLURL, or show off your latest look.</p>
      </div>
    </section>
  );
}

function RecentPostsFeed({ refreshToken, onOpenComposer, showToast }) {
  const [posts, setPosts] = useState([]);
  const [profilesById, setProfilesById] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [hiddenPostIds, setHiddenPostIds] = useState(() => new Set());
  const [mutedUserIds, setMutedUserIds] = useState(() => new Set());
  const [blockedUserIds, setBlockedUserIds] = useState(() => new Set());
  const [friendUserIds, setFriendUserIds] = useState(() => new Set());
  const [feedPreferences, setFeedPreferences] = useState(null);
  // Posts hidden *this render*, kept separate from the DB-backed hiddenPostIds
  // above so the user sees a brief "post hidden" confirmation card instead of
  // the post just vanishing - the DB list is what actually filters posts out
  // on the next load.
  const [sessionHiddenIds, setSessionHiddenIds] = useState(() => new Set());

  useEffect(() => {
    let active = true;
    setSessionHiddenIds(new Set());

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;

      if (!active) {
        return;
      }

      setCurrentUserId(userId);

      const [rawPosts, prefs, hiddenIds, creatorActions, friends] = await Promise.all([
        fetchRecentPosts(),
        fetchFeedPreferences(userId),
        fetchHiddenPostIds(userId),
        fetchCreatorActions(userId),
        userId ? fetchFriends(userId) : Promise.resolve([]),
      ]);

      if (!active) {
        return;
      }

      setFeedPreferences(prefs);
      setHiddenPostIds(hiddenIds);
      setMutedUserIds(creatorActions.muted);
      setBlockedUserIds(creatorActions.blocked);
      setFriendUserIds(new Set(friends.map((friend) => friend.user_id)));
      setPosts(rawPosts || []);

      // Best-effort: the feed still works with the author_name snapshot
      // stored on each post if this lookup fails for any reason.
      try {
        const profileMap = await fetchProfilesByUserIds((rawPosts || []).map((post) => post.user_id));

        if (active) {
          setProfilesById(profileMap);
        }
      } catch (profileError) {
        console.error("Gridster feed: could not load author profiles", profileError);
      }
    }

    load()
      .catch((loadError) => {
        console.error("Gridster feed: could not load posts", loadError);

        if (active) {
          showToast?.(loadError.message || "Could not load the feed.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const rankedPosts = useMemo(() => {
    if (!feedPreferences) {
      return posts;
    }

    return rankAndFilterPosts(posts, {
      preferences: feedPreferences,
      hiddenPostIds,
      mutedUserIds,
      blockedUserIds,
      friendUserIds,
      profilesById,
      trendingTags: gridsterTrendingTopics.map(([tag]) => tag),
    });
  }, [posts, feedPreferences, hiddenPostIds, mutedUserIds, blockedUserIds, friendUserIds, profilesById]);

  const handleHide = (post) => {
    setSessionHiddenIds((current) => new Set(current).add(post.id));

    if (!currentUserId) {
      return;
    }

    hidePostForUser(currentUserId, post.id).catch((hideError) => {
      console.error("Gridster feed: could not save hidden post", hideError);
    });
  };

  const handleMute = (post, authorName) => {
    if (!currentUserId) {
      onOpenComposer && showToast?.("Log in to mute creators.");
      return;
    }

    setMutedUserIds((current) => new Set(current).add(post.user_id));
    muteCreator(currentUserId, post.user_id)
      .then(() => showToast?.(`${authorName} muted. You'll see less from them.`))
      .catch((muteError) => {
        console.error("Gridster feed: could not mute creator", muteError);
        showToast?.(muteError.message || "Could not mute this resident.");
      });
  };

  const handleBlock = (post, authorName) => {
    if (!currentUserId) {
      showToast?.("Log in to block residents.");
      return;
    }

    setBlockedUserIds((current) => new Set(current).add(post.user_id));
    blockCreator(currentUserId, post.user_id)
      .then(() => showToast?.(`${authorName} blocked.`))
      .catch((blockError) => {
        console.error("Gridster feed: could not block resident", blockError);
        showToast?.(blockError.message || "Could not block this resident.");
      });
  };

  const handleReport = (post, reason) => {
    if (!currentUserId) {
      showToast?.("Log in to report posts.");
      return;
    }

    reportPost(currentUserId, post.id, reason)
      .then(() => showToast?.("Report submitted. Thank you for helping keep Gridster safe."))
      .catch((reportError) => {
        console.error("Gridster feed: could not submit report", reportError);
        showToast?.(reportError.message || "Could not submit this report.");
      });
  };

  if (loading) {
    return <p className="groups-directory-message">Loading feed...</p>;
  }

  if (!posts.length) {
    return (
      <p className="groups-directory-message">
        No posts yet. Be the first to start the grid.{" "}
        <button type="button" className="groups-directory-create-button" onClick={() => onOpenComposer?.("general")}>
          + Create the First Post
        </button>
      </p>
    );
  }

  if (!rankedPosts.length) {
    return (
      <p className="groups-directory-message">
        No posts match your current Feed Preferences. Try adjusting your ratings or muted/blocked list.
      </p>
    );
  }

  return (
    <>
      {rankedPosts.map((post) => {
        const authorProfile = profilesById.get(post.user_id);
        const authorName = authorProfile?.display_name || post.author_name || "A Gridster resident";
        const authorAvatarUrl = authorProfile?.avatar_url;

        if (sessionHiddenIds.has(post.id)) {
          return <HiddenPostNotice key={post.id} name={authorName} />;
        }

        return (
        <FeedPost
          key={post.id}
          header={(
            <PostHeader
              name={authorName}
              avatarUrl={authorAvatarUrl}
              label={GRIDSTER_POST_TYPE_LABELS[post.post_type] || "Post"}
              timeLabel={new Date(post.created_at).toLocaleString()}
              showToast={showToast}
              onHide={() => handleHide(post)}
              onMute={() => handleMute(post, authorName)}
              onBlock={() => handleBlock(post, authorName)}
              onReport={(reason) => handleReport(post, reason)}
            />
          )}
          actions={<PostActions likes="0" comments="0" postId={post.id} showToast={showToast} />}
        >
          <div className="recent-post-body">
            {post.content ? <p>{post.content}</p> : null}
            {post.photo_url ? (
              <div className="recent-post-photo">
                <img src={post.photo_url} alt="" />
              </div>
            ) : null}
            {post.link_url ? (
              <a className="recent-post-link" href={post.link_url} target="_blank" rel="noreferrer">
                {post.link_url}
              </a>
            ) : null}
            {post.slurl ? (
              <div className="recent-post-actions">
                <button type="button" data-destination={post.region_name || post.content || "Gridster"} data-slurl={post.slurl}>
                  Teleport
                </button>
                <TeleportStatusChip slurl={post.slurl} destinationName={post.region_name || post.content || "Gridster"} showToast={showToast} />
              </div>
            ) : null}
          </div>
        </FeedPost>
        );
      })}
    </>
  );
}

function TrendingNow({ showToast }) {
  return (
    <section className="trending-card glass-card">
      <h3>Trending Now</h3>
      <div className="trending-pills">
        {gridsterTrendingTopics.map(([tag, count]) => (
          <button
            className="trend-pill"
            key={tag}
            onClick={() => showToast?.(`Browsing ${tag} coming soon.`)}
          >
            {tag} <span>{count}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function WelcomeCard({ onExplore }) {
  return (
    <section className="welcome-card glass-card">
      <h2>Welcome to Gridster</h2>
      <p>Your Second Life social hub for posts, events, creators, stores, photo spots, and instant teleport discovery.</p>
      <div className="welcome-features">
        {gridsterWelcomeFeatures.map((feature) => (
          <span className="feature-pill" key={feature}>{feature}</span>
        ))}
      </div>
      <button className="cta-button" onClick={onExplore}>Explore The Grid</button>
    </section>
  );
}

function ExplorePreview({ showToast }) {
  return (
    <section className="explore-card glass-card">
      <div className="explore-header">
        <h3>Explore The Grid</h3>
        <p>Trending destinations, stores, clubs, and photo spots people are visiting right now.</p>
      </div>
      <div className="explore-tiles">
        {gridsterExplorePreviewTiles.map(([icon, title, desc]) => (
          <div className="explore-tile" key={title}>
            <span className="explore-icon">{icon}</span>
            <h4>{title}</h4>
            <p>{desc}</p>
            <button onClick={() => showToast?.(`Browsing ${title} coming soon.`)}>Browse</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeleportCenter({ showToast }) {
  return (
    <section className="teleport-center-card glass-card">
      <div className="teleport-center-header">
        <div>
          <span>SLURL Discovery</span>
          <h3>Teleport Center</h3>
          <p>Save favorite places, jump to live events, and discover where the grid is active right now.</p>
          <small className="teleport-slurl-note">
            Gridster uses SLURLs so residents can jump straight into Second Life destinations.
          </small>
        </div>
      </div>

      <div className="teleport-list">
        {gridsterTeleportCenterDestinations.map(([icon, iconClass, title, desc, status, statusClass]) => (
          <article className="teleport-row" key={title}>
            <div className={`teleport-icon ${iconClass}`}>{icon}</div>
            <div className="teleport-copy">
              <strong>{title}</strong>
              <small>{desc}</small>
            </div>
            <span className={`teleport-status ${statusClass}`}>{status}</span>
            <button {...getTeleportButtonProps(title)}>Teleport</button>
            <TeleportStatusChip slurl={getGridsterDestination(title)?.slurl} destinationName={title} showToast={showToast} />
          </article>
        ))}
      </div>
    </section>
  );
}

function CommunityStandards({ setActivePage }) {
  return (
    <section className="community-card glass-card">
      <div className="community-header">
        <div>
          <span>Official Gridster Notice</span>
          <h2>Gridster Community Standards</h2>
          <p>Keep the grid fun, creative, and respectful.</p>
        </div>
        <button onClick={() => setActivePage?.("CommunityGuidelines")}>Read Guidelines</button>
      </div>

      <div className="community-rules">
        <article className="rule-tile">
          <strong>Respect residents</strong>
          <p>No harassment, stalking, threats, or personal attacks.</p>
        </article>
        <article className="rule-tile">
          <strong>Credit creators</strong>
          <p>Give credit for photos, outfits, builds, poses, and store releases.</p>
        </article>
        <article className="rule-tile">
          <strong>Mark mature content</strong>
          <p>Use proper ratings for adult, moderate, and general content.</p>
        </article>
        <article className="rule-tile">
          <strong>No spam teleport traps</strong>
          <p>SLURLs should be clear, honest, and safe to visit.</p>
        </article>
      </div>
    </section>
  );
}

function LegalContentPage({ intro, sections }) {
  return (
    <section className="legal-content-page glass-card">
      {intro ? <p className="legal-content-intro">{intro}</p> : null}
      {sections.map((section) => (
        <article className="legal-content-section" key={section.heading}>
          <h3>{section.heading}</h3>
          <p>{section.body}</p>
        </article>
      ))}
    </section>
  );
}

const COMMUNITY_GUIDELINES_SECTIONS = [
  { heading: "Respect residents", body: "No harassment, stalking, threats, or personal attacks against other residents or creators." },
  { heading: "Credit creators", body: "Give credit for photos, outfits, builds, poses, and store releases whenever you can." },
  { heading: "Mark mature content", body: "Use proper ratings for adult, moderate, and general content so residents know what to expect." },
  { heading: "No spam or teleport traps", body: "SLURLs, event listings, and store links should be clear, honest, and safe to visit." },
  { heading: "No impersonation", body: "Don't post as, or claim to be, another resident, creator, store, or venue." },
  { heading: "Report problems", body: "Use the report option on posts and profiles to flag anything that breaks these guidelines. Violations may lead to content removal or account suspension." },
];

const TERMS_OF_SERVICE_SECTIONS = [
  { heading: "About Gridster", body: "Gridster is an independent, fan-made social hub for the Second Life community. It is not affiliated with, endorsed by, or sponsored by Linden Research, Inc. “Second Life” is a trademark of Linden Research, Inc." },
  { heading: "Beta status", body: "Gridster is currently in early beta. Features may change, break, or be removed without notice while we keep improving the site." },
  { heading: "Your account and content", body: "You're responsible for what you post. You keep ownership of your content, and by posting it you allow Gridster to display it to other residents on the platform." },
  { heading: "Acceptable use", body: "You agree to follow Gridster's Community Guidelines and to use the platform lawfully and respectfully." },
  { heading: "No warranty", body: "Gridster is provided “as is,” without warranties of any kind, during this beta period and beyond." },
  { heading: "Suspension", body: "We may suspend or remove accounts or content that violate these terms or the Community Guidelines." },
];

const PRIVACY_POLICY_SECTIONS = [
  { heading: "What we collect", body: "Your email address (for login), the Second Life username and profile details you choose to add, and the content you post — including posts, events, places, and photo links." },
  { heading: "How we use it", body: "To run your account, show your profile and content to other residents, and improve Gridster." },
  { heading: "What we don't do", body: "We don't sell your personal data to third parties." },
  { heading: "Storage", body: "Your data is stored securely with Supabase, our database provider." },
  { heading: "Your control", body: "You can edit or delete your profile and your posts at any time from within Gridster." },
  { heading: "Beta note", body: "Since Gridster is in early beta, please avoid posting highly sensitive personal information until the platform has matured." },
];

function BlingBits({ showToast }) {
  return (
    <section className="bling-card glass-card">
      <div className="bling-header">
        <div>
          <span>Earn Bling Bits</span>
          <h2>Bling Bits</h2>
          <p>
            Earn Bling Bits by posting, discovering places, supporting creators, and
            joining events across the grid.
          </p>
          <p className="bling-microcopy">
            Use Bling Bits to boost posts, feature events, unlock profile flair,
            and support creators.
          </p>
          <div className="bling-labels">
            <span>Bling Boost</span>
            <span>Bling Bonus</span>
          </div>
        </div>
        <button onClick={() => showToast?.("Bling Bits rewards history coming soon.")}>View Rewards</button>
      </div>

      <div className="reward-tiles">
        <article className="reward-tile">
          <span className="bling-mark"></span>
          <strong>Post Photos</strong>
          <em>+10 Bling Bits</em>
        </article>
        <article className="reward-tile">
          <span className="bling-mark"></span>
          <strong>Share SLURLs</strong>
          <em>+15 Bling Bits</em>
        </article>
        <article className="reward-tile">
          <span className="bling-mark"></span>
          <strong>Attend Events</strong>
          <em>+25 Bling Bits</em>
        </article>
        <article className="reward-tile">
          <span className="bling-mark"></span>
          <strong>Boost Creators</strong>
          <em>+30 Bling Bits</em>
        </article>
      </div>

      <div className="bling-progress">
        <div className="bling-progress-label">
          <span>Weekly Bling Goal</span>
          <strong>620 / 1000</strong>
        </div>
        <div className="bling-progress-track">
          <div className="bling-progress-fill"></div>
        </div>
      </div>
    </section>
  );
}

function CreatorDashboard({ showToast }) {
  return (
    <section className="creator-dashboard-card glass-card">
      <div className="creator-dashboard-header">
        <div>
          <span>Creator Insights</span>
          <h2>Creator Dashboard</h2>
          <p>Track how your posts, events, photos, and SLURLs are performing across the grid.</p>
        </div>
        <button onClick={() => showToast?.("Creator analytics coming soon.")}>View Analytics</button>
      </div>

      <div className="creator-stat-grid">
        {gridsterCreatorDashboardStats.map(([label, value, trend]) => (
          <article className="creator-stat-tile" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <em>{trend}</em>
          </article>
        ))}
      </div>

      <div className="top-post-strip">
        <div>
          <span>Top Performing Post</span>
          <p>“Metal Night Stage” gained 156 likes and 48 teleport clicks.</p>
        </div>
        <div className="mini-bars" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </section>
  );
}

function VenueTools({ showToast }) {
  return (
    <section className="venue-tools-card glass-card">
      <div className="venue-tools-header">
        <div>
          <span>Venue Promotion</span>
          <h2>Venue Tools</h2>
          <p>Promote events, manage lineups, share SLURLs, and bring residents straight to your venue.</p>
        </div>
        <button onClick={() => showToast?.("Creating a venue event coming soon.")}>Create Venue Event</button>
      </div>

      <div className="venue-tool-grid">
        {gridsterVenueTools.map(([icon, title, desc]) => (
          <article className="venue-tool-tile" key={title}>
            <span className="venue-tool-icon">{icon}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
          </article>
        ))}
      </div>

      <div className="featured-venue-strip">
        <span>Featured Venue:</span>
        <strong>Sanctuary Rocks</strong>
        <p>Metal, rock, DJs, and late-night chaos.</p>
      </div>
    </section>
  );
}

function StoreTools({ showToast }) {
  return (
    <section className="store-tools-card glass-card">
      <div className="store-tools-header">
        <div>
          <span>Creator Commerce</span>
          <h2>Store Tools</h2>
          <p>Promote new releases, blogger packs, sales, marketplace finds, and in-world shopping events.</p>
        </div>
        <button onClick={() => showToast?.("Creating a store post coming soon.")}>Create Store Post</button>
      </div>

      <div className="store-feature-grid">
        {gridsterStoreToolFeatures.map(([icon, title, desc]) => (
          <article className="store-feature-tile" key={title}>
            <span className="store-feature-icon">{icon}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
          </article>
        ))}
      </div>

      <div className="featured-store-strip">
        <span>Featured Store:</span>
        <strong>Valentina Boutique</strong>
        <p>Luxury fashion, event looks, and statement pieces.</p>
      </div>
    </section>
  );
}

function BloggerNetwork({ showToast }) {
  return (
    <section className="blogger-network-card glass-card">
      <div className="blogger-network-header">
        <div>
          <span>Editorial Connections</span>
          <h2>Blogger Network</h2>
          <p>Connect with brands, discover blogger calls, track credits, and share your latest looks.</p>
        </div>
        <button onClick={() => showToast?.("Joining the Blogger Network coming soon.")}>Join Blogger Network</button>
      </div>

      <div className="blogger-feature-grid">
        {gridsterBloggerNetworkFeatures.map(([icon, title, desc]) => (
          <article className="blogger-feature-tile" key={title}>
            <span className="blogger-feature-icon">{icon}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
          </article>
        ))}
      </div>

      <div className="featured-blogger-strip">
        <span>Featured Blogger:</span>
        <strong>CharlieJo</strong>
        <p>Fashion, nightlife, tattoos, events, and beautiful chaos.</p>
      </div>
    </section>
  );
}

function UpcomingGridNights({ showToast }) {


  return (
    <FeedPost
      className="feed-card"
      header={(
        <div className="feed-card-header">
          <div className="post-avatar">✦</div>
          <div>
            <strong>Upcoming Grid Nights</strong>
            <span>Community calendar • This week</span>
          </div>
        </div>
      )}
    >
      <div className="event-list">
        {gridsterUpcomingGridNights.map(([title, time, thumb]) => (
          <div className="grid-event-row" key={title}>
            <div className={`grid-event-thumb ${thumb}`}></div>
            <div className="grid-event-copy">
              <strong>{title}</strong>
              <small>{time}</small>
            </div>
            <button {...getTeleportButtonProps(title)}>Teleport</button>
            <TeleportStatusChip slurl={getGridsterDestination(title)?.slurl} destinationName={title} showToast={showToast} />
          </div>
        ))}
      </div>
    </FeedPost>
  );
}

function FeaturedPhotoSpots({ onAuthOpen, onViewAll, showToast }) {
  const [user, setUser] = useState(null);
  const [spots, setSpots] = useState([]);
  const [favoritePlaceIds, setFavoritePlaceIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let active = true;

    async function load(nextUser) {
      if (!active) {
        return;
      }

      setUser(nextUser);

      try {
        const [nextSpots, favorites] = await Promise.all([
          fetchFeaturedPhotoSpots(),
          nextUser ? fetchFavoritePlaces(nextUser.id) : Promise.resolve([]),
        ]);

        if (!active) {
          return;
        }

        setSpots(nextSpots || []);
        setFavoritePlaceIds(new Set((favorites || []).map((favorite) => favorite.place_id)));
      } catch (loadError) {
        if (active) {
          showToast?.(loadError.message || "Could not load Featured Photo Spots.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    supabase.auth
      .getUser()
      .then(({ data }) => load(data?.user ?? null))
      .catch(() => load(null));

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleFavorite = async (spot) => {
    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    const isFavorited = favoritePlaceIds.has(spot.id);
    setBusyId(spot.id);

    try {
      if (isFavorited) {
        await removeFavoritePlace(user.id, spot.id);
      } else {
        await addFavoritePlace(user.id, spot.id);
      }

      setFavoritePlaceIds((current) => {
        const next = new Set(current);

        if (isFavorited) {
          next.delete(spot.id);
        } else {
          next.add(spot.id);
        }

        return next;
      });

      setSpots((current) =>
        current.map((current_spot) =>
          current_spot.id === spot.id
            ? { ...current_spot, favorite_count: current_spot.favorite_count + (isFavorited ? -1 : 1) }
            : current_spot
        )
      );
    } catch (toggleError) {
      showToast?.(toggleError.message || "Could not update your favorite.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <FeedPost
      className="feed-card"
      header={(
        <div className="feed-card-header">
          <div className="post-avatar">▣</div>
          <div>
            <strong>Featured Photo Spots</strong>
            <span>Most-favorited landmarks • Real destinations</span>
          </div>
        </div>
      )}
    >
      {loading ? <p className="groups-directory-message">Loading photo spots...</p> : null}

      {!loading && spots.length === 0 ? (
        <p className="groups-directory-message">No photo spots yet — add one from Places to be featured here.</p>
      ) : null}

      <div className="photo-spot-grid">
        {spots.map((spot) => (
          <div className="photo-spot-card" key={spot.id}>
            <div className="photo-spot-thumb">
              <img src={spot.photo_url} alt="" />
            </div>
            <div className="photo-spot-info">
              <strong>{spot.title}</strong>
              {spot.region_name ? <small>{spot.region_name}</small> : null}
              <div className="photo-spot-actions">
                <button type="button" data-destination={spot.title} data-slurl={spot.slurl}>
                  Teleport
                </button>
                <TeleportStatusChip slurl={spot.slurl} destinationName={spot.title} showToast={showToast} />
                <button
                  type="button"
                  className={favoritePlaceIds.has(spot.id) ? "photo-spot-favorite-button is-favorited" : "photo-spot-favorite-button"}
                  disabled={busyId === spot.id}
                  onClick={() => handleToggleFavorite(spot)}
                >
                  {favoritePlaceIds.has(spot.id) ? "♥" : "♡"} {spot.favorite_count}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {spots.length ? (
        <button type="button" className="photo-spot-view-all-button" onClick={onViewAll}>
          View All Photo Spots
        </button>
      ) : null}
    </FeedPost>
  );
}

function LiveNowEvents({ showToast }) {
  return (
    <section className="post-card glass-card feed-card page-live-card">
      <div className="feed-card-header">
        <div className="post-avatar">●</div>
        <div>
          <strong>Live Now</strong>
          <span>Active events around the grid</span>
        </div>
      </div>

      <div className="page-live-list">
        {gridsterLiveNowEvents.map(([name, label, action]) => (
          <div className="live-now-row" key={name}>
            <div className="live-indicator" />
            <div>
              <strong>{name}</strong>
              <small>{label}</small>
            </div>
            {action === "Join" ? (
              <JoinButton storageKey={name} />
            ) : (
              <>
                <button {...getTeleportButtonProps(name)}>{action}</button>
                <TeleportStatusChip slurl={getGridsterDestination(name)?.slurl} destinationName={name} showToast={showToast} />
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfileSummary() {
  return (
    <section className="profile-summary-card glass-card">
      <div className="profile-summary-cover"></div>
      <div className="profile-summary-body">
        <div className="profile-summary-avatar">{gridsterProfileSummary.initials}</div>
        <div className="profile-summary-copy">
          <span>{gridsterProfileSummary.displayName}</span>
          <h3>{gridsterProfileSummary.role}</h3>
          <p>{gridsterProfileSummary.bio}</p>
        </div>
      </div>
      <div className="profile-summary-stats">
        {gridsterProfileSummary.stats.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="profile-summary-tags">
        {gridsterProfileSummary.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </section>
  );
}

function ProfileFlairCard({ variant = "sidebar", showToast, setActivePage }) {
  const className = variant === "wide" ? "profile-flair-card profile-flair-card-wide glass-card" : "profile-flair-card glass-card";

  return (
    <section className={className}>
      <div className="flair-card-header">
        <span>Badge System</span>
        <h3>Profile Flair</h3>
        <p>Show off your grid personality.</p>
      </div>

      <div className="flair-badges">
        {gridsterProfileFlairBadges.map((badge) => (
          <button
            className="flair-badge"
            key={badge}
            onClick={() => showToast?.(`${badge} is unlocked with Bling Bits in Bling Depot.`)}
          >
            {badge}
          </button>
        ))}
      </div>

      <p className="flair-note">Unlock more flair with Bling Bits.</p>
      <button className="flair-action" onClick={() => setActivePage?.("BlingBoost")}>Customize Flair</button>
    </section>
  );
}

function GalleryPreview({ galleryItems, showToast }) {
  return (
    <section className="gallery-preview-card glass-card">
      <div className="gallery-header">
        <h3>Gridster Gallery</h3>
        <a onClick={() => showToast?.("Full gallery preview coming soon.")}>Preview</a>
      </div>
      <div className="gallery-preview-grid">
        {galleryItems.slice(0, 4).map((item) => (
          <div key={item.title} className={`gallery-item gallery-${item.index}`}>
            <div className="gallery-image"></div>
            <div className="gallery-info">
              <span className="gallery-category">{item.category}</span>
              <h4>{item.title}</h4>
              <p>by {item.creator}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function GalleryStrip({ galleryItems, showToast }) {
  return (
    <section className="gallery-strip glass-card">
      <div className="gallery-header">
        <h3>Gridster Gallery</h3>
        <a onClick={() => showToast?.("Full gallery view coming soon.")}>View All Gallery</a>
      </div>

      <div className="gallery-row">
        {galleryItems.map((item) => (
          <div key={item.title} className={`gallery-item gallery-${item.index}`}>
            <div className="gallery-image"></div>
            <div className="gallery-info">
              <span className="gallery-category">{item.category}</span>
              <h4>{item.title}</h4>
              <p>by {item.creator}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PageShell({ title, subtitle, children }) {
  return (
    <section className="center-page">
      <PageHeader title={title} subtitle={subtitle} />
      {children}
    </section>
  );
}

function BetaPlaceholderNotice({ children }) {
  return <p className="beta-placeholder-notice">{children}</p>;
}

function PostHeader({ name, avatarUrl, label, timeLabel = "2h ago", showToast, onHide, onMute, onBlock, onReport }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");

  const closeMenu = () => {
    setMenuOpen(false);
    setReportOpen(false);
  };

  return (
    <div className="post-header">
      <div className="post-avatar">
        {avatarUrl ? <img src={avatarUrl} alt="" /> : name.charAt(0).toUpperCase()}
      </div>
      <div className="post-header-copy">
        <strong>{name}</strong>
        <span>{label} • {timeLabel}</span>
      </div>
      <div className="post-safety-control">
        <button
          className={menuOpen ? "safety-more-button active" : "safety-more-button"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          More
        </button>

        {menuOpen ? (
          <div className="post-safety-menu glass-card">
            <button
              onClick={() => {
                showToast?.("Post hidden from your feed.");
                onHide?.();
                closeMenu();
              }}
            >
              Hide Post
            </button>
            <button onClick={() => setReportOpen(true)}>Report Post</button>
            <button
              onClick={() => {
                onMute?.();
                closeMenu();
              }}
            >
              Mute Creator
            </button>
            <button
              onClick={() => {
                onBlock?.();
                closeMenu();
              }}
            >
              Block Resident
            </button>
            <button
              onClick={() => {
                showToast?.("SLURL copied.");
                closeMenu();
              }}
            >
              Copy SLURL
            </button>
          </div>
        ) : null}
      </div>

      {reportOpen ? (
        <div className="post-report-panel glass-card">
          <div className="report-panel-header">
            <span>Safety Report</span>
            <h3>Report Post</h3>
            <p>Select the closest reason. Reports stay private and help keep Gridster safer.</p>
          </div>

          <div className="report-option-list">
            {gridsterPostReportOptions.map((option) => (
              <button
                key={option}
                className={reportReason === option ? "active" : ""}
                onClick={() => setReportReason(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="report-actions">
            <button onClick={closeMenu}>Cancel</button>
            <button
              className="submit-report-button"
              onClick={() => {
                onReport?.(reportReason);
                closeMenu();
              }}
            >
              Submit Report
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FollowButton({ storageKey = "creator" }) {
  const [following, setFollowing] = usePersistedGridsterFlag("followedCreators", storageKey);

  return (
    <ActionButton
      className={following ? "follow-toggle is-following" : "follow-toggle"}
      aria-pressed={following}
      onClick={() => setFollowing((current) => !current)}
    >
      {following ? "Following" : "Follow"}
    </ActionButton>
  );
}

function PostActions({ likes, comments, postId = "gridster-post", showToast }) {
  const initialLikes = Number.parseInt(String(likes).replace(/,/g, ""), 10);
  const [liked, setLiked] = usePersistedGridsterFlag("likedPosts", postId);
  const [notForMe, setNotForMe] = usePersistedGridsterFlag("notForMePosts", postId);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reposted, setReposted] = useState(false);
  const likeCount = Number.isNaN(initialLikes) ? likes : initialLikes + (liked ? 1 : 0);

  return (
    <div className="post-actions">
      <div className="post-action-stats">
        <span>💗 {likeCount}</span>
        <span>💬 {comments}</span>
      </div>
      <button
        className={liked ? "like-toggle is-liked" : "like-toggle"}
        aria-pressed={liked}
        onClick={() => setLiked((current) => !current)}
      >
        {liked ? "♥ Liked" : "♡ Like"}
      </button>
      <button
        className={commentsOpen ? "comment-toggle is-open" : "comment-toggle"}
        aria-expanded={commentsOpen}
        onClick={() => setCommentsOpen((current) => !current)}
      >
        💬 Comment
      </button>
      <button
        className={shareOpen || reposted ? "share-toggle is-open" : "share-toggle"}
        aria-expanded={shareOpen}
        onClick={() => setShareOpen((current) => !current)}
      >
        {reposted ? "Reposted" : "↗ Share"}
      </button>
      <button
        className={notForMe ? "not-for-me-toggle is-tuned" : "not-for-me-toggle"}
        title="Helps tune your feed."
        aria-pressed={notForMe}
        onClick={() => {
          setNotForMe((current) => !current);
          showToast?.("Got it — we’ll show you less like this.");
        }}
      >
        {notForMe ? "Less Like This" : "👎 Not For Me"}
      </button>
      <SaveButton label="🔖 Save" savedLabel="🔖 Saved" storageKey={postId} />

      {shareOpen ? (
        <div className="share-preview-panel">
          <div className="share-panel-heading">
            <span>Share to Gridster</span>
            <button onClick={() => setShareOpen(false)}>Cancel</button>
          </div>

          <div className="share-option-list">
            <button
              className={reposted ? "active" : ""}
              onClick={() => {
                setReposted(true);
                showToast?.("Reposted to your grid.");
              }}
            >
              Repost to My Grid
            </button>
            <button onClick={() => showToast?.("Message share preview opened.")}>Send in Message</button>
            <button onClick={() => showToast?.("Post link copied.")}>Copy Post Link</button>
            <button onClick={() => showToast?.("SLURL copied.")}>Copy SLURL</button>
          </div>

          <textarea placeholder="Add a note before sharing..." />

          <div className="share-panel-actions">
            <button onClick={() => setShareOpen(false)}>Cancel</button>
            <button
              className="share-now-button"
              onClick={() => {
                showToast?.("Shared to your grid.");
                setShareOpen(false);
              }}
            >
              Share Now
            </button>
          </div>
        </div>
      ) : null}

      {commentsOpen ? (
        <div className="comment-preview-panel">
          <div className="comment-preview-list">
            {gridsterPostSampleComments.map(([initial, name, text, time]) => (
              <article className="comment-preview-row" key={`${name}-${time}`}>
                <div className="comment-avatar">{initial}</div>
                <div className="comment-bubble">
                  <div className="comment-meta">
                    <strong>{name}</strong>
                    <span>{time}</span>
                  </div>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="comment-input-row">
            <div className="comment-avatar comment-avatar-me">CJ</div>
            <input placeholder="Write a comment..." />
            <button onClick={() => showToast?.("Comment posted.")}>Send</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SaveButton({ label = "Save", savedLabel = "Saved", storageKey }) {
  const [saved, setSaved] = usePersistedGridsterFlag("savedPosts", storageKey ?? `save:${label}`);

  return (
    <ActionButton
      className={saved ? "interactive-save-button is-saved" : "interactive-save-button"}
      aria-pressed={saved}
      onClick={() => setSaved((current) => !current)}
    >
      {saved ? savedLabel : label}
    </ActionButton>
  );
}

function JoinButton({ storageKey = "group" }) {
  const [joined, setJoined] = usePersistedGridsterFlag("joinedGroups", storageKey);

  return (
    <ActionButton
      className={joined ? "join-toggle is-joined" : "join-toggle"}
      aria-pressed={joined}
      onClick={() => setJoined((current) => !current)}
    >
      {joined ? "Joined" : "Join"}
    </ActionButton>
  );
}

function GridsterFooter({ showToast, setActivePage }) {
  return (
    <footer className="gridster-footer glass-card">
      <div className="footer-brand">
        <h2>Gridster</h2>
        <span>Post • Discover • Teleport</span>
        <p>
          A Second Life social hub for residents, creators, DJs, bloggers, stores,
          clubs, and sims.
        </p>
      </div>

      <nav className="footer-links" aria-label="Footer navigation">
        <a onClick={() => showToast?.("About Gridster coming soon.")}>About</a>
        <a onClick={() => showToast?.("Safety Center coming soon.")}>Safety</a>
        <a onClick={() => setActivePage?.("CommunityGuidelines")}>Community Guidelines</a>
        <a onClick={() => setActivePage?.("PrivacyPolicy")}>Privacy Policy</a>
        <a onClick={() => setActivePage?.("TermsOfService")}>Terms of Service</a>
        <a onClick={() => setActivePage?.("BlingBoost")}>Premium</a>
        <a onClick={() => setActivePage?.("Sponsors")}>Sponsors</a>
        <a onClick={() => showToast?.("Support coming soon.")}>Support</a>
      </nav>

      <div className="footer-signal">
        <strong>Built for the grid.</strong>
        <div className="footer-pills">
          <span>SLURL Ready</span>
          <span>Creator Friendly</span>
          <span>Event First</span>
        </div>
      </div>
    </footer>
  );
}

function HiddenPostNotice({ name }) {
  return (
    <article className="post-hidden-card glass-card">
      <div className="post-hidden-icon">✓</div>
      <div className="post-header-copy">
        <strong>Post hidden from your feed.</strong>
        <p>{name} will show up less often while Gridster tunes your feed.</p>
      </div>
    </article>
  );
}

export default GridsterHome;
