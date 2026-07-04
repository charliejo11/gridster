import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getBlingBalanceSummary, getEquippedCosmeticsForUser } from "../lib/blingDepot";
import { fetchGridsterProfile } from "../lib/gridsterProfiles";
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
  gridsterEventsPageEvents,
  gridsterExploreCategories,
  gridsterExploreDestinations,
  gridsterFeaturedPhotoSpots,
  gridsterFeaturedPlaces,
  gridsterGalleryItems,
  gridsterGridNightEvents,
  gridsterLiveNow,
  gridsterLiveNowEvents,
  gridsterMarketplaceFinds,
  gridsterMessageConversations,
  gridsterMessageThreads,
  gridsterMessageQuickActions,
  gridsterNotifications,
  gridsterPostSampleComments,
  gridsterProfileFlairBadges,
  gridsterSavedFilters,
  gridsterSavedItems,
  gridsterSearchFilters,
  gridsterSearchResults,
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
  gridsterAddSlurlFields,
  gridsterFeedPreferenceCards,
  gridsterPhotoChallengeRules,
  gridsterSpotlightAwardCategories,
  gridsterSpotlightAwardNominees,
  gridsterSpotlightAwardRules,
  gridsterVerificationTypes,
  gridsterVerificationRequirements,
  gridsterCreateCommunityHubFields,
  gridsterCreateCommunityHubSections,
  gridsterCreateBloggerPostFields,
  gridsterBloggerCreditRows,
  gridsterCreateStorePostFields,
  gridsterCreateEventFields,
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
import GroupsPage from "./gridster/GroupsPage";
import GroupDetailPage from "./gridster/GroupDetailPage";
import TeleportStatusChip from "./gridster/TeleportStatusChip";
import "./GridsterHome.css";

const GRIDSTER_PAGE_PATHS = {
  BlingBoost: "/bling-depot",
  Messages: "/messenger",
  TeleportDiscovery: "/places",
  TonightInSL: "/tonight",
  BookingBoard: "/booking-board",
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
        notifications={gridsterNotifications}
      />

      <DashboardLayout
        leftSidebar={(
          <LeftSidebar activePage={activePage} setActivePage={setActivePage} showToast={showToast}>
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
            places={gridsterFeaturedPlaces}
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
          setActivePage={setActivePage}
          onOpenProfile={openProfile}
          onOpenGroup={openGroup}
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
    </main>
  );
}

function CenterContent({ activePage, galleryItems, authMode, selectedProfileName, selectedGroupId, setActivePage, onOpenProfile, onOpenGroup, onAuthOpen, showToast }) {
  if (activePage === "Home") {
    return (
      <>
        <CreatePostComposer showToast={showToast} />
        <TrendingNow showToast={showToast} />
        <WelcomeCard onExplore={() => setActivePage("Explore")} />
        <ExplorePreview showToast={showToast} />
        <TeleportCenter showToast={showToast} />
        <LunarEclipsePost showToast={showToast} />
        <VoguePixelsPost showToast={showToast} />
        <CreatorsCollectivePost showToast={showToast} />
        <UpcomingGridNights showToast={showToast} />
        <FeaturedPhotoSpots />
      </>
    );
  }

  if (activePage === "Explore") {
    return (
      <PageShell
        title="Explore"
        subtitle="Discover where residents are posting, shopping, dancing, roleplaying, and teleporting right now."
      >
        <ExplorePageContent galleryItems={galleryItems} showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "Search") {
    return (
      <PageShell title="Search" subtitle="Find residents, stores, events, groups, photo spots, SLURLs, and communities.">
        <SearchResultsPage onOpenProfile={onOpenProfile} showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "Events") {
    return (
      <PageShell title="Events" subtitle="Find live DJs, club nights, shopping events, beach parties, and community gatherings.">
        <EventsPageContent showToast={showToast} />
        <LiveNowEvents showToast={showToast} />
        <VenueTools showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "CreateEvent") {
    return (
      <PageShell
        title="Create Event"
        subtitle="Build an event card with time, host, DJ, rating, SLURL, and discovery tags."
      >
        <CreateEventPage showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "CreateStorePost") {
    return (
      <PageShell
        title="Create Store Post"
        subtitle="Promote new releases, blogger calls, sales, marketplace finds, and in-world shopping events."
      >
        <CreateStorePostPage showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "CreateBloggerPost") {
    return (
      <PageShell
        title="Create Blogger Post"
        subtitle="Share your look, credits, photos, locations, brands, poses, and SLURLs in one polished post."
      >
        <CreateBloggerPostPage showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "CreateCommunityHub") {
    return (
      <PageShell
        title="Create Community Hub"
        subtitle="Build a home for your roleplay sim, club, family, fandom, venue crew, or themed community."
      >
        <CreateCommunityHubPage showToast={showToast} />
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

  if (activePage === "TeleportDiscovery") {
    return (
      <PageShell
        title="Teleport Discovery"
        subtitle="Real places worth a teleport — clubs, beaches, RP sims, stores, and more, verified by the community."
      >
        <TeleportDiscoveryFeed onAuthOpen={() => onAuthOpen?.("login")} showToast={showToast} />
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

  if (activePage === "AddSLURL") {
    return (
      <PageShell
        title="Add SLURL"
        subtitle="Save clear teleport links, rate destinations honestly, and help residents find places across the grid."
      >
        <AddSLURLPage showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "SavedItems") {
    return (
      <PageShell
        title="Saved Landmarks & Posts"
        subtitle="Your saved SLURLs, events, stores, photo spots, and favorite grid discoveries."
      >
        <SavedItemsPage showToast={showToast} />
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
        <VerificationCenterPage showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "Groups") {
    return (
      <PageShell title="Groups" subtitle="Join clubs, creator circles, RP hubs, blogger networks, and community crews.">
        <GroupsPage onOpenGroup={onOpenGroup} onAuthOpen={onAuthOpen} showToast={showToast} />
        <CommunityStandards showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "GroupDetail") {
    return (
      <PageShell title="Group" subtitle="Posts, events, announcements, photos, and members for this community.">
        <GroupDetailPage groupId={selectedGroupId} onAuthOpen={onAuthOpen} showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "Messages") {
    return (
      <PageShell
        title="Messages"
        subtitle="Keep up with comments, event invites, creator updates, store notices, and private messages."
      >
        <MessagesPageContent onOpenProfile={onOpenProfile} showToast={showToast} />
      </PageShell>
    );
  }

  if (activePage === "GridNights") {
    return (
      <PageShell title="Grid Nights" subtitle="Live events, DJ sets, club nights, parties, and gatherings happening across Second Life.">
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
        <ProfileSetup onAuthOpen={() => onAuthOpen?.("login")} showToast={showToast} />
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

function SearchResultsPage({ onOpenProfile, showToast }) {
  return (
    <section className="search-results-page">
      <div className="search-preview-card glass-card">
        <label className="search-preview-input">
          <span>⌕</span>
          <input placeholder="Search Gridster..." />
        </label>

        <div className="search-filter-pills">
          {gridsterSearchFilters.map((filter) => (
            <button key={filter} onClick={() => showToast?.(`Filtering by ${filter} coming soon.`)}>{filter}</button>
          ))}
        </div>
      </div>

      <CardGrid className="search-results-grid">
        {gridsterSearchResults.map(([title, meta, action], index) => (
          <article className="search-result-card glass-card" key={title}>
            <div className={`search-result-icon result-${index}`}>{title.charAt(0)}</div>
            <div className="search-result-copy">
              <h3>{title}</h3>
              <p>{meta}</p>
            </div>
            <ResultActionButton action={action} title={title} onOpenProfile={onOpenProfile} showToast={showToast} />
          </article>
        ))}
      </CardGrid>
    </section>
  );
}

function ResultActionButton({ action, title, onOpenProfile, showToast }) {
  if (["View", "View Profile", "Shop"].includes(action) && hasGridsterProfile(title)) {
    return <button onClick={() => onOpenProfile?.(title)}>{action}</button>;
  }

  if (action === "Join") {
    return <JoinButton storageKey={title} />;
  }

  if (action === "Teleport") {
    return (
      <>
        <button {...getTeleportButtonProps(title)}>{action}</button>
        <TeleportStatusChip slurl={getGridsterDestination(title)?.slurl} destinationName={title} showToast={showToast} />
      </>
    );
  }

  if (action.toLowerCase().startsWith("save")) {
    return <SaveButton label={action} storageKey={`search-result:${title}`} />;
  }

  return <button onClick={() => showToast?.(`${action} for ${title} coming soon.`)}>{action}</button>;
}

function ExplorePageContent({ galleryItems, showToast }) {
  return (
    <>
      <section className="nav-card-grid explore-category-grid">
        {gridsterExploreCategories.map(([icon, title, desc]) => (
          <article className="nav-feature-card glass-card" key={title}>
            <span className="nav-card-icon">{icon}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
            <button onClick={() => showToast?.(`Browsing ${title} coming soon.`)}>Browse</button>
          </article>
        ))}
      </section>

      <section className="nav-list-card glass-card">
        <SectionHeader className="nav-section-heading" eyebrow="Live Discovery" title="Trending Destinations" />

        <div className="nav-destination-list">
          {gridsterExploreDestinations.map(([title, rating, action]) => (
            <article className="nav-destination-row" key={title}>
              <div className="nav-row-orb">{title.charAt(0)}</div>
              <div>
                <strong>{title}</strong>
                <small>{rating}</small>
              </div>
              <button {...(action === "Teleport" ? getTeleportButtonProps(title) : {})}>{action}</button>
              {action === "Teleport" ? (
                <TeleportStatusChip slurl={getGridsterDestination(title)?.slurl} destinationName={title} showToast={showToast} />
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <GalleryPreview galleryItems={galleryItems} showToast={showToast} />
    </>
  );
}

function EventsPageContent({ showToast }) {
  return (
    <section className="nav-event-grid">
      {gridsterEventsPageEvents.map(([title, time, rating, venue], index) => (
        <article className="nav-event-card glass-card" key={title}>
          <div className={`nav-event-thumb thumb-${index % 4}`}></div>
          <div className="nav-event-copy">
            <span>{rating}</span>
            <h3>{title}</h3>
            <p>{time}</p>
            <small>{venue}</small>
          </div>
          <button {...getTeleportButtonProps(venue)}>Teleport</button>
          <TeleportStatusChip slurl={getGridsterDestination(venue)?.slurl} destinationName={venue} showToast={showToast} />
        </article>
      ))}
    </section>
  );
}

function MessagesPageContent({ onOpenProfile, showToast }) {
  const [selectedName, setSelectedName] = useState(gridsterMessageConversations[0]?.[1] ?? "");
  const [threads, setThreads] = useState(() => ({ ...gridsterMessageThreads }));
  const [draft, setDraft] = useState("");
  const [equippedThemeClass, setEquippedThemeClass] = useState("");

  useEffect(() => {
    let active = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        const currentUser = data?.user;

        if (!currentUser) {
          return null;
        }

        return getEquippedCosmeticsForUser(currentUser.id);
      })
      .then((equipped) => {
        if (!active || !equipped) {
          return;
        }

        const theme = equipped.find((cosmetic) => cosmetic.item_type === "messenger_theme");
        setEquippedThemeClass(theme?.bling_items?.preview_class || "");
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const selectedConversation = gridsterMessageConversations.find(([, name]) => name === selectedName);
  const selectedInitial = selectedConversation?.[0] ?? "?";
  const activeMessages = threads[selectedName]
    ?? (selectedConversation ? [[selectedName, selectedConversation[2], "received"]] : []);

  const handleSend = (event) => {
    event.preventDefault();

    const text = draft.trim();

    if (!text || !selectedName) {
      return;
    }

    setThreads((current) => ({
      ...current,
      [selectedName]: [...activeMessages, ["CharlieJo", text, "sent"]],
    }));
    setDraft("");
    showToast?.("Message sent.");
  };

  return (
    <section className="gridster-inbox-page">
      <div className="gridster-inbox-shell glass-card">
        <aside className="inbox-conversation-column">
          <div className="inbox-panel-header">
            <div>
              <span>Direct Messages</span>
              <h3>Inbox</h3>
            </div>
            <strong>{gridsterMessageConversations.length}</strong>
          </div>

          <div className="inbox-conversation-list">
            {gridsterMessageConversations.map(([initial, name, message, time], index) => (
              <button
                type="button"
                className={`inbox-conversation-row ${name === selectedName ? "active" : ""}`}
                key={name}
                onClick={() => {
                  setSelectedName(name);
                  setDraft("");
                }}
              >
                <span className={`conversation-avatar conversation-${index}`}>{initial}</span>
                <span className="conversation-copy">
                  <strong>{name}</strong>
                  <small>{message}</small>
                </span>
                <em>{time}</em>
              </button>
            ))}
          </div>
        </aside>

        <section className={`inbox-preview-panel ${equippedThemeClass}`}>
          <div className="inbox-preview-header">
            <div className="preview-identity">
              <span className="preview-avatar">{selectedInitial}</span>
              <div>
                <h3>{selectedName}</h3>
                <span className="preview-status">Online</span>
              </div>
            </div>
            <button type="button" onClick={() => onOpenProfile?.(selectedName)}>View Profile</button>
          </div>

          <div className="inbox-message-stack">
            {activeMessages.map(([name, text, direction], index) => (
              <article className={`dm-message ${direction === "sent" ? "sent" : ""}`} key={`${selectedName}-${index}`}>
                <span>{name}</span>
                <p>{text}</p>
              </article>
            ))}
          </div>

          <div className="message-quick-actions">
            {gridsterMessageQuickActions.map((action) => (
              <button type="button" key={action} onClick={() => showToast?.(`${action} coming soon.`)}>{action}</button>
            ))}
          </div>

          <form className="dm-input-row" onSubmit={handleSend}>
            <span>CJ</span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a message..."
            />
            <button type="submit">Send</button>
          </form>
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

function AddSLURLPage({ showToast }) {
  return (
    <section className="add-slurl-page">
      <div className="slurl-form-card glass-card">
        <div className="slurl-form-grid">
          <div className="slurl-fields">
            {gridsterAddSlurlFields.map(([label, value]) => (
              <label className="slurl-field" key={label}>
                <span>{label}</span>
                <input value={value} readOnly />
              </label>
            ))}
          </div>

          <aside className="slurl-preview-panel">
            <span>Saved Landmark</span>
            <h3>SLURL PREVIEW</h3>
            <p>Show residents the destination name, rating, tags, and a clean teleport action before they jump.</p>
            <button {...getTeleportButtonProps("Moonlit Cathedral")}>Test Teleport</button>
            <TeleportStatusChip
              slurl={getGridsterDestination("Moonlit Cathedral")?.slurl}
              destinationName="Moonlit Cathedral"
              showToast={showToast}
            />
          </aside>
        </div>

        <div className="slurl-actions">
          <SaveButton label="Save Landmark" storageKey="add-slurl-landmark" />
          <button onClick={() => showToast?.("SLURL preview coming soon.")}>Preview SLURL</button>
          <button className="share-slurl-button" onClick={() => showToast?.("Sharing to grid coming soon.")}>Share to Grid</button>
        </div>

        <p className="slurl-helper-note">
          Clear SLURLs, accurate ratings, and honest destination details make teleport discovery feel safer.
        </p>
      </div>

      <TeleportCenter showToast={showToast} />
    </section>
  );
}

function FeedPreferencesPage({ showToast }) {
  return (
    <section className="feed-preferences-page">
      <div className="feed-preferences-grid">
        {gridsterFeedPreferenceCards.map(([title, options]) => (
          <article className="feed-preference-card glass-card" key={title}>
            <SectionHeader className="feed-preference-heading" eyebrow="Feed Tuning" title={title} />

            <div className="feed-preference-pills">
              {options.map((option) => (
                <button key={option} onClick={() => showToast?.(`${option} coming soon.`)}>{option}</button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="feed-preferences-note glass-card">
        <p>
          Using Not For Me helps Gridster learn what to show less often without publicly downvoting anyone.
        </p>
        <button onClick={() => showToast?.("Feed preferences saved.")}>Save Preferences</button>
      </div>
    </section>
  );
}

function SavedItemsPage({ showToast }) {
  return (
    <section className="saved-items-page">
      <div className="saved-filter-pills glass-card">
        {gridsterSavedFilters.map((filter) => (
          <button
            className={filter === "All" ? "active" : ""}
            key={filter}
            onClick={() => showToast?.(`Filtering by ${filter} coming soon.`)}
          >
            {filter}
          </button>
        ))}
      </div>

      <CardGrid className="saved-items-grid">
        {gridsterSavedItems.map(([title, details, label, action], index) => (
          <article className="saved-item-card glass-card" key={title}>
            <div className={`saved-item-thumb thumb-${index % 6}`}>{title.charAt(0)}</div>
            <div className="saved-item-copy">
              <span>{label}</span>
              <h3>{title}</h3>
              <p>{details}</p>
              <small>Saved {index + 1}d ago</small>
            </div>
            <div className="saved-item-actions">
              <button
                {...(action === "Teleport" ? getTeleportButtonProps(title) : {})}
                onClick={action === "Teleport" ? undefined : () => showToast?.(`${action} for ${title} coming soon.`)}
              >
                {action}
              </button>
              {action === "Teleport" ? (
                <TeleportStatusChip slurl={getGridsterDestination(title)?.slurl} destinationName={title} showToast={showToast} />
              ) : null}
              <button
                className="saved-remove-button"
                aria-label={`Remove ${title} from saved items`}
                onClick={() => showToast?.(`${title} removed from saved items.`)}
              >
                ×
              </button>
            </div>
          </article>
        ))}
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
          <h3>CharlieJo</h3>
          <strong>Blogger • Photographer • Creator</strong>
          <p>Recognized for fashion, nightlife, tattoos, events, and beautiful chaos across the grid.</p>

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

function VerificationCenterPage({ showToast }) {
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
          <SectionHeader className="verification-section-heading" eyebrow="Your Verification Status" title="CharlieJo" />
          <strong>Eligible to Apply</strong>

          <div className="verification-strength">
            <div>
              <span>Profile strength</span>
              <b>82%</b>
            </div>
            <div className="verification-strength-bar">
              <span style={{ width: "82%" }}></span>
            </div>
          </div>

          <p>Suggested next step: Add official links and featured posts.</p>
          <button onClick={() => showToast?.("Reviewing profile links coming soon.")}>Review Profile Links</button>
        </aside>
      </div>
    </section>
  );
}

function CreateCommunityHubPage({ showToast }) {
  return (
    <section className="create-community-page">
      <div className="community-hub-form-card glass-card">
        <div className="community-hub-form-grid">
          <div className="community-hub-fields">
            {gridsterCreateCommunityHubFields.map(([label, value]) => (
              <label className="community-hub-field" key={label}>
                <span>{label}</span>
                <input value={value} readOnly />
              </label>
            ))}
          </div>

          <aside className="community-hub-preview-panel">
            <span>Gridster Community Page</span>
            <h3>COMMUNITY HUB PREVIEW</h3>
            <p>Frame your sim, crew, family, fandom, or group with a banner residents can recognize instantly.</p>
            <button onClick={() => showToast?.("Uploading a banner coming soon.")}>Upload Banner</button>
          </aside>
        </div>

        <section className="hub-sections-card">
          <SectionHeader className="hub-sections-heading" eyebrow="Hub Sections" title="Hub Sections" />
          <div className="hub-section-list">
            {gridsterCreateCommunityHubSections.map((section) => (
              <article className="hub-section-row" key={section}>
                <span>{section}</span>
                <button onClick={() => showToast?.(`Adding a ${section} section coming soon.`)}>Add Section</button>
              </article>
            ))}
          </div>
        </section>

        <div className="community-hub-actions">
          <button onClick={() => showToast?.("Draft saved.")}>Save Draft</button>
          <button onClick={() => showToast?.("Hub preview coming soon.")}>Preview Hub</button>
          <button className="publish-hub-button" onClick={() => showToast?.("Publishing a community hub coming soon.")}>Publish Hub</button>
        </div>

        <p className="community-hub-helper-note">
          Clear rules, accurate ratings, and honest SLURLs help residents find communities that fit them.
        </p>
      </div>
    </section>
  );
}

function CreateBloggerPostPage({ showToast }) {
  return (
    <section className="create-blogger-page">
      <div className="blogger-form-card glass-card">
        <div className="blogger-form-grid">
          <div className="blogger-fields">
            {gridsterCreateBloggerPostFields.map(([label, value]) => (
              <label className="blogger-field" key={label}>
                <span>{label}</span>
                <input value={value} readOnly />
              </label>
            ))}
          </div>

          <aside className="blog-photo-preview-panel">
            <span>Gridster Blogger Post</span>
            <h3>BLOG PHOTO PREVIEW</h3>
            <p>Upload an editorial look, location shoot, fashion detail, or creator feature image.</p>
            <button onClick={() => showToast?.("Uploading a photo coming soon.")}>Upload Photo</button>
          </aside>
        </div>

        <section className="credit-builder-card">
          <SectionHeader className="credit-builder-heading" eyebrow="Credit Builder" title="Credit Builder" />
          <div className="credit-row-list">
            {gridsterBloggerCreditRows.map((row) => (
              <article className="credit-row" key={row}>
                <span>{row}</span>
                <button onClick={() => showToast?.(`Adding a ${row} credit coming soon.`)}>Add Credit</button>
              </article>
            ))}
          </div>
        </section>

        <div className="blogger-form-actions">
          <button onClick={() => showToast?.("Draft saved.")}>Save Draft</button>
          <button onClick={() => showToast?.("Post preview coming soon.")}>Preview Post</button>
          <button className="publish-blogger-button" onClick={() => showToast?.("Publishing a blogger post coming soon.")}>Publish Blogger Post</button>
        </div>

        <p className="blogger-helper-note">
          Good credits help stores, photographers, pose makers, and creators get seen.
        </p>
      </div>
    </section>
  );
}

function CreateStorePostPage({ showToast }) {
  return (
    <section className="create-store-page">
      <div className="store-form-card glass-card">
        <div className="store-form-grid">
          <div className="store-fields">
            {gridsterCreateStorePostFields.map(([label, value]) => (
              <label className="store-field" key={label}>
                <span>{label}</span>
                <input value={value} readOnly />
              </label>
            ))}
          </div>

          <aside className="product-preview-panel">
            <span>Gridster Store Post</span>
            <h3>PRODUCT PREVIEW</h3>
            <p>Show a release image, vendor ad, blogger pack graphic, or event booth promo.</p>
            <button onClick={() => showToast?.("Uploading a product image coming soon.")}>Upload Product Image</button>
          </aside>
        </div>

        <div className="store-form-actions">
          <button onClick={() => showToast?.("Draft saved.")}>Save Draft</button>
          <button onClick={() => showToast?.("Post preview coming soon.")}>Preview Post</button>
          <button className="publish-store-button" onClick={() => showToast?.("Publishing a store post coming soon.")}>Publish Store Post</button>
        </div>

        <p className="store-helper-note">
          Clear credits, honest ratings, working links, and SLURLs help shoppers find your creations faster.
        </p>
      </div>
    </section>
  );
}

function CreateEventPage({ showToast }) {
  return (
    <section className="create-event-page">
      <div className="event-form-card glass-card">
        <div className="event-form-grid">
          <div className="event-fields">
            {gridsterCreateEventFields.map(([label, value]) => (
              <label className="event-field" key={label}>
                <span>{label}</span>
                <input value={value} readOnly />
              </label>
            ))}
          </div>

          <aside className="event-poster-preview">
            <span>Gridster Event Preview</span>
            <h3>YOUR EVENT POSTER</h3>
            <p>Drop in a club flyer, DJ poster, sale graphic, or community event image.</p>
            <button onClick={() => showToast?.("Uploading a poster coming soon.")}>Upload Poster</button>
          </aside>
        </div>

        <div className="event-form-actions">
          <button onClick={() => showToast?.("Draft saved.")}>Save Draft</button>
          <button onClick={() => showToast?.("Event preview coming soon.")}>Preview Event</button>
          <button className="publish-event-button" onClick={() => showToast?.("Publishing an event coming soon.")}>Publish Event</button>
        </div>

        <p className="event-helper-note">
          Clear SLURLs, accurate ratings, and honest event details help residents teleport with confidence.
        </p>
      </div>
    </section>
  );
}

function SettingsPage({ setActivePage, showToast }) {
  return (
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
  );
}

function CreatePostComposer({ showToast }) {
  return (
    <section className="create-post glass-card">
      <div className="composer-top">
        <div className="mini-avatar">CJ</div>
        <input placeholder="What's happening in your world?" />
        <span className="sparkle">✦</span>
      </div>

      <div className="composer-actions">
        {gridsterComposerActions.map((action) => (
          <button key={action} onClick={() => showToast?.(`${action} coming soon.`)}>{action}</button>
        ))}
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

function LunarEclipsePost({ showToast }) {
  const [hidden, setHidden] = useState(false);

  if (hidden) {
    return <HiddenPostNotice name="Club Elysium" />;
  }

  return (
    <FeedPost
      header={(
        <PostHeader
          name="Club Elysium"
          label="posted an event"
          showToast={showToast}
          onHide={() => setHidden(true)}
        />
      )}
      actions={<PostActions likes="156" comments="32" postId="lunar-eclipse-event" showToast={showToast} />}
    >
      <div className="event-card">
        <div className="event-poster">
          <span className="event-poster-label">CLUB ELYSIUM</span>
          <h2>LUNAR ECLIPSE</h2>
          <p>Live DJ Set</p>
          <div className="event-poster-badge">Featured Event</div>
        </div>

        <div className="event-info">
          <div className="featured-label">✦ Featured Event</div>
          <h2>Lunar Eclipse Live DJ Set</h2>
          <p>An unforgettable night of music, light, fog, neon, and connection.</p>

          <ul className="event-details-list">
            <li>
              <span className="detail-icon">✦</span>
              <span>Saturday, May 24, 2025</span>
            </li>
            <li>
              <span className="detail-icon">⏰</span>
              <span>9:00 PM SLT</span>
            </li>
            <li>
              <span className="detail-icon">⌖</span>
              <span>Club Elysium • Elysium Isle</span>
            </li>
          </ul>

          <div className="slurl-card">
            <div className="place-thumb"></div>
            <div>
              <strong>Club Elysium</strong>
              <small>Elysium Isle</small>
            </div>
            <button {...getTeleportButtonProps("Club Elysium")}>Teleport</button>
            <TeleportStatusChip
              slurl={getGridsterDestination("Club Elysium")?.slurl}
              destinationName="Club Elysium"
              showToast={showToast}
            />
          </div>
        </div>
      </div>
    </FeedPost>
  );
}

function VoguePixelsPost({ showToast }) {
  const [hidden, setHidden] = useState(false);

  if (hidden) {
    return <HiddenPostNotice name="Vogue Pixels" />;
  }

  return (
    <FeedPost
      header={(
        <PostHeader
          name="Vogue Pixels"
          label="shared a blog post"
          showToast={showToast}
          onHide={() => setHidden(true)}
        />
      )}
      actions={<PostActions likes="98" comments="14" postId="vogue-pixels-blog" showToast={showToast} />}
    >
      <p className="post-text">
        Neon dreams and city lights. New editorial is up on the blog! ✨
      </p>

      <div className="photo-grid">
        <div className="photo-tile tile-one"></div>
        <div className="photo-tile tile-two"></div>
        <div className="photo-tile tile-three">
          <span>+6</span>
        </div>
      </div>

    </FeedPost>
  );
}

function CreatorsCollectivePost({ showToast }) {
  const [hidden, setHidden] = useState(false);

  if (hidden) {
    return <HiddenPostNotice name="The Creators Collective" />;
  }

  return (
    <FeedPost
      header={(
        <PostHeader
          name="The Creators Collective"
          label="posted an update"
          showToast={showToast}
          onHide={() => setHidden(true)}
        />
      )}
      actions={<PostActions likes="72" comments="18" postId="creators-collective-update" showToast={showToast} />}
    >
      <p className="post-text">
        We’re excited to welcome NovaVixen to the team as our new Events Coordinator. Get ready for even more amazing grid experiences.
      </p>
    </FeedPost>
  );
}

function CommunityStandards({ showToast }) {
  return (
    <section className="community-card glass-card">
      <div className="community-header">
        <div>
          <span>Official Gridster Notice</span>
          <h2>Gridster Community Standards</h2>
          <p>Keep the grid fun, creative, and respectful.</p>
        </div>
        <button onClick={() => showToast?.("Community guidelines coming soon.")}>Read Guidelines</button>
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

function FeaturedPhotoSpots() {
  return (
    <FeedPost
      className="feed-card"
      header={(
        <div className="feed-card-header">
          <div className="post-avatar">▣</div>
          <div>
            <strong>Featured Photo Spots</strong>
            <span>Save-worthy landmarks • Curated</span>
          </div>
        </div>
      )}
    >
      <div className="photo-spot-grid">
        {gridsterFeaturedPhotoSpots.map(([title, thumb]) => (
          <div className="photo-spot-card" key={title}>
            <div className={`photo-spot-thumb ${thumb}`}></div>
            <div className="photo-spot-info">
              <strong>{title}</strong>
              <SaveButton label="Save Landmark" storageKey={`photo-spot:${title}`} />
            </div>
          </div>
        ))}
      </div>
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

function PostHeader({ name, label, showToast, onHide }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");

  const closeMenu = () => {
    setMenuOpen(false);
    setReportOpen(false);
  };

  return (
    <div className="post-header">
      <div className="post-avatar">{name.charAt(0)}</div>
      <div className="post-header-copy">
        <strong>{name}</strong>
        <span>{label} • 2h ago</span>
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
                showToast?.("Resident blocked. You can manage blocked users in Settings.");
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
                showToast?.("Report submitted. Thank you for helping keep Gridster safe.");
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
        <a onClick={() => showToast?.("Community Guidelines coming soon.")}>Community Guidelines</a>
        <a onClick={() => setActivePage?.("BlingBoost")}>Premium</a>
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
