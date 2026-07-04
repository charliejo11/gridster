import { useEffect, useRef, useState } from "react";
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
  gridsterGroupsPageGroups,
  gridsterLiveNow,
  gridsterLiveNowEvents,
  gridsterMarketplaceFinds,
  gridsterMessageConversations,
  gridsterMessageThreads,
  gridsterMessageQuickActions,
  gridsterNotifications,
  gridsterPopularGroups,
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
  gridsterPhotoChallengeEntries,
  gridsterPhotoChallengeLeaders,
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
  gridsterCommunityHubFeatures,
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
import "./GridsterHome.css";

const GRIDSTER_STORAGE_KEY = "gridster-preferences-v1";
const DEFAULT_GRIDSTER_STORAGE = {
  activePage: "Home",
  showLanding: true,
  theme: "dark-neon",
  likedPosts: {},
  savedPosts: {},
  notForMePosts: {},
  followedCreators: {},
  joinedGroups: {},
};
const GRIDSTER_PAGE_PATHS = {
  BlingBoost: "/bling-depot",
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

function readGridsterStorage() {
  if (typeof window === "undefined") {
    return DEFAULT_GRIDSTER_STORAGE;
  }

  try {
    const saved = window.localStorage.getItem(GRIDSTER_STORAGE_KEY);
    const parsedValue = saved ? JSON.parse(saved) : {};
    const parsed = parsedValue && typeof parsedValue === "object" ? parsedValue : {};

    return {
      ...DEFAULT_GRIDSTER_STORAGE,
      ...parsed,
      likedPosts: { ...DEFAULT_GRIDSTER_STORAGE.likedPosts, ...(parsed.likedPosts ?? {}) },
      savedPosts: { ...DEFAULT_GRIDSTER_STORAGE.savedPosts, ...(parsed.savedPosts ?? {}) },
      notForMePosts: { ...DEFAULT_GRIDSTER_STORAGE.notForMePosts, ...(parsed.notForMePosts ?? {}) },
      followedCreators: { ...DEFAULT_GRIDSTER_STORAGE.followedCreators, ...(parsed.followedCreators ?? {}) },
      joinedGroups: { ...DEFAULT_GRIDSTER_STORAGE.joinedGroups, ...(parsed.joinedGroups ?? {}) },
    };
  } catch {
    return DEFAULT_GRIDSTER_STORAGE;
  }
}

function writeGridsterStorage(nextStorage) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(GRIDSTER_STORAGE_KEY, JSON.stringify(nextStorage));
  } catch {
    // Keep the prototype usable if localStorage is unavailable.
  }
}

function saveGridsterValue(key, value) {
  writeGridsterStorage({
    ...readGridsterStorage(),
    [key]: value,
  });
}

function saveGridsterFlag(collection, id, value) {
  const currentStorage = readGridsterStorage();
  const currentCollection = currentStorage[collection] ?? {};
  const nextCollection = { ...currentCollection };

  if (value) {
    nextCollection[id] = true;
  } else {
    delete nextCollection[id];
  }

  writeGridsterStorage({
    ...currentStorage,
    [collection]: nextCollection,
  });
}

function usePersistedGridsterValue(key, defaultValue) {
  const [value, setValue] = useState(() => readGridsterStorage()[key] ?? defaultValue);

  useEffect(() => {
    saveGridsterValue(key, value);
  }, [key, value]);

  return [value, setValue];
}

function usePersistedGridsterFlag(collection, id, defaultValue = false) {
  const storageId = String(id ?? "default");
  const [value, setValue] = useState(() => Boolean(readGridsterStorage()[collection]?.[storageId] ?? defaultValue));

  useEffect(() => {
    saveGridsterFlag(collection, storageId, value);
  }, [collection, storageId, value]);

  return [value, setValue];
}

function getTeleportButtonProps(destinationName, slurlOverride) {
  const destination = getGridsterDestination(destinationName);

  return {
    "data-destination": destination?.name ?? destinationName,
    "data-slurl": slurlOverride ?? destination?.slurl ?? "",
  };
}

function GridsterHome() {
  const routePage = getGridsterPageFromPath();
  const [activePage, setActivePage] = usePersistedGridsterValue("activePage", routePage ?? "Home");
  const [showLanding, setShowLanding] = usePersistedGridsterValue("showLanding", routePage ? false : true);
  const [authMode, setAuthMode] = useState("login");
  const [toast, setToast] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [selectedProfileName, setSelectedProfileName] = useState("CharlieJo");
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
          <LeftSidebar activePage={activePage} setActivePage={setActivePage}>
            <ProfileFlairCard />
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
          setActivePage={setActivePage}
          onOpenProfile={openProfile}
          onAuthOpen={openAuth}
          showToast={showToast}
        />
      </DashboardLayout>

      <GalleryStrip galleryItems={gridsterGalleryItems} />
      <GridsterFooter />
      {toast ? (
        <div className="gridster-toast glass-card" role="status" aria-live="polite" key={toast.id}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Close notification">×</button>
        </div>
      ) : null}
    </main>
  );
}

function CenterContent({ activePage, galleryItems, authMode, selectedProfileName, setActivePage, onOpenProfile, onAuthOpen, showToast }) {
  if (activePage === "Home") {
    return (
      <>
        <CreatePostComposer />
        <TrendingNow />
        <WelcomeCard onExplore={() => setActivePage("Explore")} />
        <ExplorePreview />
        <TeleportCenter />
        <LunarEclipsePost showToast={showToast} />
        <VoguePixelsPost showToast={showToast} />
        <CreatorsCollectivePost showToast={showToast} />
        <UpcomingGridNights />
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
        <ExplorePageContent galleryItems={galleryItems} />
      </PageShell>
    );
  }

  if (activePage === "Search") {
    return (
      <PageShell title="Search" subtitle="Find residents, stores, events, groups, photo spots, SLURLs, and communities.">
        <SearchResultsPage onOpenProfile={onOpenProfile} />
      </PageShell>
    );
  }

  if (activePage === "Events") {
    return (
      <PageShell title="Events" subtitle="Find live DJs, club nights, shopping events, beach parties, and community gatherings.">
        <EventsPageContent />
        <LiveNowEvents />
        <VenueTools />
      </PageShell>
    );
  }

  if (activePage === "CreateEvent") {
    return (
      <PageShell
        title="Create Event"
        subtitle="Build an event card with time, host, DJ, rating, SLURL, and discovery tags."
      >
        <CreateEventPage />
      </PageShell>
    );
  }

  if (activePage === "CreateStorePost") {
    return (
      <PageShell
        title="Create Store Post"
        subtitle="Promote new releases, blogger calls, sales, marketplace finds, and in-world shopping events."
      >
        <CreateStorePostPage />
      </PageShell>
    );
  }

  if (activePage === "CreateBloggerPost") {
    return (
      <PageShell
        title="Create Blogger Post"
        subtitle="Share your look, credits, photos, locations, brands, poses, and SLURLs in one polished post."
      >
        <CreateBloggerPostPage />
      </PageShell>
    );
  }

  if (activePage === "CreateCommunityHub") {
    return (
      <PageShell
        title="Create Community Hub"
        subtitle="Build a home for your roleplay sim, club, family, fandom, venue crew, or themed community."
      >
        <CreateCommunityHubPage />
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

  if (activePage === "FeedPreferences") {
    return (
      <PageShell
        title="Feed Preferences"
        subtitle="Tune your Gridster feed so you see more of what you love and less of what is not for you."
      >
        <FeedPreferencesPage />
      </PageShell>
    );
  }

  if (activePage === "AddSLURL") {
    return (
      <PageShell
        title="Add SLURL"
        subtitle="Save clear teleport links, rate destinations honestly, and help residents find places across the grid."
      >
        <AddSLURLPage />
      </PageShell>
    );
  }

  if (activePage === "SavedItems") {
    return (
      <PageShell
        title="Saved Landmarks & Posts"
        subtitle="Your saved SLURLs, events, stores, photo spots, and favorite grid discoveries."
      >
        <SavedItemsPage />
      </PageShell>
    );
  }

  if (activePage === "PhotoChallenge") {
    return (
      <PageShell
        title="Photo Challenge"
        subtitle="Join weekly photo themes, show off your world, earn Bling Bits, and get featured across the grid."
      >
        <PhotoChallengePage />
      </PageShell>
    );
  }

  if (activePage === "SpotlightAwards") {
    return (
      <PageShell
        title="Spotlight Awards"
        subtitle="Celebrate the residents, creators, DJs, bloggers, venues, stores, and communities lighting up the grid."
      >
        <SpotlightAwardsPage />
      </PageShell>
    );
  }

  if (activePage === "VerificationCenter") {
    return (
      <PageShell
        title="Verification"
        subtitle="Help residents know which creators, stores, venues, DJs, bloggers, and communities are authentic across the grid."
      >
        <VerificationCenterPage />
      </PageShell>
    );
  }

  if (activePage === "Groups") {
    return (
      <PageShell title="Groups" subtitle="Join clubs, creator circles, RP hubs, blogger networks, and community crews.">
        <GroupsPageContent onOpenProfile={onOpenProfile} />
        <CommunityHubs />
        <CommunityStandards />
        <PopularGroupsCards />
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
        <CreatorDashboard />
        <BloggerNetwork />
        <StoreTools />
        <BlingBits />
        <ProfileFlairCard variant="wide" />
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
        <SettingsPage setActivePage={setActivePage} />
      </PageShell>
    );
  }

  return null;
}

function SearchResultsPage({ onOpenProfile }) {
  return (
    <section className="search-results-page">
      <div className="search-preview-card glass-card">
        <label className="search-preview-input">
          <span>⌕</span>
          <input placeholder="Search Gridster..." />
        </label>

        <div className="search-filter-pills">
          {gridsterSearchFilters.map((filter) => (
            <button key={filter}>{filter}</button>
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
            <ResultActionButton action={action} title={title} onOpenProfile={onOpenProfile} />
          </article>
        ))}
      </CardGrid>
    </section>
  );
}

function ResultActionButton({ action, title, onOpenProfile }) {
  if (["View", "View Profile", "Shop"].includes(action) && hasGridsterProfile(title)) {
    return <button onClick={() => onOpenProfile?.(title)}>{action}</button>;
  }

  if (action === "Join") {
    return <JoinButton storageKey={title} />;
  }

  if (action === "Teleport") {
    return <button {...getTeleportButtonProps(title)}>{action}</button>;
  }

  if (action.toLowerCase().startsWith("save")) {
    return <SaveButton label={action} storageKey={`search-result:${title}`} />;
  }

  return <button>{action}</button>;
}

function ExplorePageContent({ galleryItems }) {
  return (
    <>
      <section className="nav-card-grid explore-category-grid">
        {gridsterExploreCategories.map(([icon, title, desc]) => (
          <article className="nav-feature-card glass-card" key={title}>
            <span className="nav-card-icon">{icon}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
            <button>Browse</button>
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
            </article>
          ))}
        </div>
      </section>

      <GalleryPreview galleryItems={galleryItems} />
    </>
  );
}

function EventsPageContent() {
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
        </article>
      ))}
    </section>
  );
}

function GroupsPageContent({ onOpenProfile }) {
  return (
    <section className="nav-card-grid groups-page-grid">
      {gridsterGroupsPageGroups.map(([title, desc, members], index) => (
        <article className="nav-feature-card group-page-card glass-card" key={title}>
          <span className={`nav-card-icon thumb-${index % 4}`}>{title.charAt(0)}</span>
          {hasGridsterProfile(title) ? (
            <button className="profile-card-title-button" onClick={() => onOpenProfile?.(title)}>
              {title}
            </button>
          ) : (
            <h3>{title}</h3>
          )}
          <p>{desc}</p>
          <small>{members}</small>
          <JoinButton storageKey={title} />
        </article>
      ))}
    </section>
  );
}

function MessagesPageContent({ onOpenProfile, showToast }) {
  const [selectedName, setSelectedName] = useState(gridsterMessageConversations[0]?.[1] ?? "");
  const [threads, setThreads] = useState(() => ({ ...gridsterMessageThreads }));
  const [draft, setDraft] = useState("");

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

        <section className="inbox-preview-panel">
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
              <button type="button" key={action}>{action}</button>
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
          {profile.slurl ? <button {...getTeleportButtonProps(profile.displayName, profile.slurl)}>Teleport</button> : null}
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

function AddSLURLPage() {
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
          </aside>
        </div>

        <div className="slurl-actions">
          <SaveButton label="Save Landmark" storageKey="add-slurl-landmark" />
          <button>Preview SLURL</button>
          <button className="share-slurl-button">Share to Grid</button>
        </div>

        <p className="slurl-helper-note">
          Clear SLURLs, accurate ratings, and honest destination details make teleport discovery feel safer.
        </p>
      </div>

      <TeleportCenter />
    </section>
  );
}

function FeedPreferencesPage() {
  return (
    <section className="feed-preferences-page">
      <div className="feed-preferences-grid">
        {gridsterFeedPreferenceCards.map(([title, options]) => (
          <article className="feed-preference-card glass-card" key={title}>
            <SectionHeader className="feed-preference-heading" eyebrow="Feed Tuning" title={title} />

            <div className="feed-preference-pills">
              {options.map((option) => (
                <button key={option}>{option}</button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="feed-preferences-note glass-card">
        <p>
          Using Not For Me helps Gridster learn what to show less often without publicly downvoting anyone.
        </p>
        <button>Save Preferences</button>
      </div>
    </section>
  );
}

function SavedItemsPage() {
  return (
    <section className="saved-items-page">
      <div className="saved-filter-pills glass-card">
        {gridsterSavedFilters.map((filter) => (
          <button className={filter === "All" ? "active" : ""} key={filter}>
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
              <button {...(action === "Teleport" ? getTeleportButtonProps(title) : {})}>{action}</button>
              <button className="saved-remove-button" aria-label={`Remove ${title} from saved items`}>
                ×
              </button>
            </div>
          </article>
        ))}
      </CardGrid>
    </section>
  );
}

function PhotoChallengePage() {
  return (
    <section className="photo-challenge-page">
      <section className="photo-challenge-hero glass-card">
        <div className="challenge-hero-copy">
          <span>Weekly Theme</span>
          <h3>Neon Nights</h3>
          <p>Capture a nightlife, cyber, club, or glowing city scene anywhere in Second Life.</p>

          <div className="challenge-meta-grid">
            <div>
              <strong>Reward</strong>
              <span>Winner earns 500 Bling Bits + Featured Gallery placement.</span>
            </div>
            <div>
              <strong>Deadline</strong>
              <span>Sunday • 11:59 PM SLT</span>
            </div>
          </div>

          <div className="challenge-hero-actions">
            <button>Join Challenge</button>
            <button>Upload Entry</button>
            <button>View Entries</button>
          </div>
        </div>
        <div className="challenge-hero-art">
          <span>Neon Nights</span>
        </div>
      </section>

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
            {gridsterPhotoChallengeLeaders.map(([name, votes], index) => (
              <article key={name}>
                <strong>{index + 1}. {name}</strong>
                <span>{votes}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="featured-entries-section">
        <SectionHeader className="challenge-section-heading" eyebrow="Community Gallery" title="Featured Entries" />
        <div className="featured-entry-grid">
          {gridsterPhotoChallengeEntries.map(([title, creator, likes], index) => (
            <article className="featured-entry-card glass-card" key={title}>
              <div className={`entry-image entry-${index}`}></div>
              <div className="entry-card-copy">
                <h3>{title}</h3>
                <p>by {creator}</p>
              </div>
              <div className="entry-card-actions">
                <button>Vote</button>
                <span>{likes} likes</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function SpotlightAwardsPage() {
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
            <button>Nominate Someone</button>
            <button>View Winners</button>
            <button>Vote Now</button>
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
                <button>Vote</button>
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

function VerificationCenterPage() {
  return (
    <section className="verification-center-page">
      <section className="verification-hero-card glass-card">
        <div className="verification-hero-copy">
          <span>Verified Status</span>
          <h3>Verified Gridster Profiles</h3>
          <p>Verification helps confirm identity, reduce impersonation, protect creators, and make discovery safer.</p>

          <div className="verification-hero-actions">
            <button>Apply for Verification</button>
            <button>Check Requirements</button>
            <button>View Verified Directory</button>
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
          <button>Review Profile Links</button>
        </aside>
      </div>
    </section>
  );
}

function CreateCommunityHubPage() {
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
            <button>Upload Banner</button>
          </aside>
        </div>

        <section className="hub-sections-card">
          <SectionHeader className="hub-sections-heading" eyebrow="Hub Sections" title="Hub Sections" />
          <div className="hub-section-list">
            {gridsterCreateCommunityHubSections.map((section) => (
              <article className="hub-section-row" key={section}>
                <span>{section}</span>
                <button>Add Section</button>
              </article>
            ))}
          </div>
        </section>

        <div className="community-hub-actions">
          <button>Save Draft</button>
          <button>Preview Hub</button>
          <button className="publish-hub-button">Publish Hub</button>
        </div>

        <p className="community-hub-helper-note">
          Clear rules, accurate ratings, and honest SLURLs help residents find communities that fit them.
        </p>
      </div>
    </section>
  );
}

function CreateBloggerPostPage() {
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
            <button>Upload Photo</button>
          </aside>
        </div>

        <section className="credit-builder-card">
          <SectionHeader className="credit-builder-heading" eyebrow="Credit Builder" title="Credit Builder" />
          <div className="credit-row-list">
            {gridsterBloggerCreditRows.map((row) => (
              <article className="credit-row" key={row}>
                <span>{row}</span>
                <button>Add Credit</button>
              </article>
            ))}
          </div>
        </section>

        <div className="blogger-form-actions">
          <button>Save Draft</button>
          <button>Preview Post</button>
          <button className="publish-blogger-button">Publish Blogger Post</button>
        </div>

        <p className="blogger-helper-note">
          Good credits help stores, photographers, pose makers, and creators get seen.
        </p>
      </div>
    </section>
  );
}

function CreateStorePostPage() {
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
            <button>Upload Product Image</button>
          </aside>
        </div>

        <div className="store-form-actions">
          <button>Save Draft</button>
          <button>Preview Post</button>
          <button className="publish-store-button">Publish Store Post</button>
        </div>

        <p className="store-helper-note">
          Clear credits, honest ratings, working links, and SLURLs help shoppers find your creations faster.
        </p>
      </div>
    </section>
  );
}

function CreateEventPage() {
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
            <button>Upload Poster</button>
          </aside>
        </div>

        <div className="event-form-actions">
          <button>Save Draft</button>
          <button>Preview Event</button>
          <button className="publish-event-button">Publish Event</button>
        </div>

        <p className="event-helper-note">
          Clear SLURLs, accurate ratings, and honest event details help residents teleport with confidence.
        </p>
      </div>
    </section>
  );
}

function SettingsPage({ setActivePage }) {
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

          <button onClick={() => title === "Profile Settings" ? setActivePage?.("Profile") : undefined}>
            {title === "Profile Settings" ? "Edit Profile" : "Manage"}
          </button>
        </article>
      ))}
    </div>
  );
}

function CreatePostComposer() {
  return (
    <section className="create-post glass-card">
      <div className="composer-top">
        <div className="mini-avatar">CJ</div>
        <input placeholder="What's happening in your world?" />
        <span className="sparkle">✦</span>
      </div>

      <div className="composer-actions">
        {gridsterComposerActions.map((action) => (
          <button key={action}>{action}</button>
        ))}
      </div>

      <div className="composer-templates">
        <span className="templates-label">Quick Post Templates</span>
        <div className="template-chips">
          {gridsterComposerTemplates.map((template) => (
            <button className="template-chip" key={template}>{template}</button>
          ))}
        </div>
        <p className="composer-helper">Share a moment, promote an event, drop a SLURL, or show off your latest look.</p>
      </div>
    </section>
  );
}

function TrendingNow() {
  return (
    <section className="trending-card glass-card">
      <h3>Trending Now</h3>
      <div className="trending-pills">
        {gridsterTrendingTopics.map(([tag, count]) => (
          <button className="trend-pill" key={tag}>{tag} <span>{count}</span></button>
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

function ExplorePreview() {
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
            <button>Browse</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeleportCenter() {
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

function CommunityStandards() {
  return (
    <section className="community-card glass-card">
      <div className="community-header">
        <div>
          <span>Official Gridster Notice</span>
          <h2>Gridster Community Standards</h2>
          <p>Keep the grid fun, creative, and respectful.</p>
        </div>
        <button>Read Guidelines</button>
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

function BlingBits() {
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
        <button>View Rewards</button>
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

function CreatorDashboard() {
  return (
    <section className="creator-dashboard-card glass-card">
      <div className="creator-dashboard-header">
        <div>
          <span>Creator Insights</span>
          <h2>Creator Dashboard</h2>
          <p>Track how your posts, events, photos, and SLURLs are performing across the grid.</p>
        </div>
        <button>View Analytics</button>
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

function VenueTools() {
  return (
    <section className="venue-tools-card glass-card">
      <div className="venue-tools-header">
        <div>
          <span>Venue Promotion</span>
          <h2>Venue Tools</h2>
          <p>Promote events, manage lineups, share SLURLs, and bring residents straight to your venue.</p>
        </div>
        <button>Create Venue Event</button>
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

function StoreTools() {
  return (
    <section className="store-tools-card glass-card">
      <div className="store-tools-header">
        <div>
          <span>Creator Commerce</span>
          <h2>Store Tools</h2>
          <p>Promote new releases, blogger packs, sales, marketplace finds, and in-world shopping events.</p>
        </div>
        <button>Create Store Post</button>
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

function BloggerNetwork() {
  return (
    <section className="blogger-network-card glass-card">
      <div className="blogger-network-header">
        <div>
          <span>Editorial Connections</span>
          <h2>Blogger Network</h2>
          <p>Connect with brands, discover blogger calls, track credits, and share your latest looks.</p>
        </div>
        <button>Join Blogger Network</button>
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

function CommunityHubs() {
  return (
    <section className="community-hub-card glass-card">
      <div className="community-hub-header">
        <div>
          <span>Resident Communities</span>
          <h2>Community Hubs</h2>
          <p>Build spaces for roleplay sims, social groups, clubs, families, fandoms, and themed communities.</p>
        </div>
        <button>Create Community Hub</button>
      </div>

      <div className="community-hub-grid">
        {gridsterCommunityHubFeatures.map(([icon, title, desc]) => (
          <article className="community-hub-tile" key={title}>
            <span className="community-hub-icon">{icon}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
          </article>
        ))}
      </div>

      <div className="featured-community-strip">
        <span>Featured Community:</span>
        <strong>Moonlit Hollow</strong>
        <p>Gothic roleplay, events, stories, and dark fantasy.</p>
      </div>
    </section>
  );
}

function UpcomingGridNights() {


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

function LiveNowEvents() {
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
            {action === "Join" ? <JoinButton storageKey={name} /> : <button {...getTeleportButtonProps(name)}>{action}</button>}
          </div>
        ))}
      </div>
    </section>
  );
}

function PopularGroupsCards() {
  return (
    <div className="page-card-grid">
      {gridsterPopularGroups.map(([title, desc], index) => (
        <article className="group-summary-card glass-card" key={title}>
          <div className={`group-badge thumb-${index}`}>{title.charAt(0)}</div>
          <div>
            <h3>{title}</h3>
            <p>{desc}</p>
            <small>{index + 2}.4K members</small>
          </div>
          <JoinButton storageKey={title} />
        </article>
      ))}
    </div>
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

function ProfileFlairCard({ variant = "sidebar" }) {
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
          <button className="flair-badge" key={badge}>{badge}</button>
        ))}
      </div>

      <p className="flair-note">Unlock more flair with Bling Bits.</p>
      <button className="flair-action">Customize Flair</button>
    </section>
  );
}

function GalleryPreview({ galleryItems }) {
  return (
    <section className="gallery-preview-card glass-card">
      <div className="gallery-header">
        <h3>Gridster Gallery</h3>
        <a>Preview</a>
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

function GalleryStrip({ galleryItems }) {
  return (
    <section className="gallery-strip glass-card">
      <div className="gallery-header">
        <h3>Gridster Gallery</h3>
        <a>View All Gallery</a>
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

function GridsterFooter() {
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
        <a>About</a>
        <a>Safety</a>
        <a>Community Guidelines</a>
        <a>Premium</a>
        <a>Support</a>
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
