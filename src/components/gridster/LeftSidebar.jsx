import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  gridsterLeftSidebarActionItems,
  gridsterLeftSidebarNavItems,
  gridsterLeftSidebarProfile,
} from "../../data/gridsterMockData";
import {
  GRIDSTER_PROFILE_UPDATED_EVENT,
  computeGridsterProfileStrength,
  fetchGridsterProfile,
} from "../../lib/gridsterProfiles";
import GridsterPlusModal from "./GridsterPlusModal";

function initialsFromName(name) {
  const trimmed = String(name || "").trim();

  if (!trimmed) {
    return "?";
  }

  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

const GRIDSTER_PLUS_ARTWORK = "/gridster-logo.png";

const CREATOR_TOOL_TABS = {
  "New Blog": "blog",
  "Upload Photo": "photo",
  "Add Event": "event",
  "Save SLURL": "slurl",
};

const NAV_ACTION_COMPOSER_TABS = {
  CreateEvent: "event",
  CreateStorePost: "store",
  CreateBloggerPost: "blog",
  AddSLURL: "slurl",
};

function LeftSidebar({
  activePage,
  setActivePage,
  onOpenComposer,
  onOpenMyCreatorPages,
  showToast,
  children,
}) {
  const [showPlusModal, setShowPlusModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
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
        setCurrentUser(data?.user ?? null);
        refreshProfile(data?.user ?? null);
      }
    }).catch(() => {});

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      refreshProfile(session?.user ?? null);
    });

    const handleProfileUpdated = () => {
      supabase.auth.getUser().then(({ data }) => refreshProfile(data?.user ?? null)).catch(() => {});
    };

    window.addEventListener(GRIDSTER_PROFILE_UPDATED_EVENT, handleProfileUpdated);

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
      window.removeEventListener(GRIDSTER_PROFILE_UPDATED_EVENT, handleProfileUpdated);
    };
  }, []);

  const displayName = currentUser ? profile?.display_name || profile?.sl_username || "Set up your profile" : "Guest";
  const profileStrength = currentUser ? computeGridsterProfileStrength(profile) : 0;

  const openBlingDepot = (event) => {
    event.preventDefault();
    setActivePage("BlingBoost");
    window.history.pushState({}, "", "/bling-depot");
  };

  const handleToolClick = (tool) => {
    const tab = CREATOR_TOOL_TABS[tool];

    if (tab) {
      onOpenComposer?.(tab);
    } else {
      showToast?.(`${tool} coming soon.`);
    }
  };

  const handleNavActionClick = (page) => {
    if (page === "CreateCommunityHub") {
      onOpenMyCreatorPages?.();
      return;
    }

    const tab = NAV_ACTION_COMPOSER_TABS[page];

    if (tab) {
      onOpenComposer?.(tab);
      return;
    }

    setActivePage(page);
  };

  return (
    <aside className="left-panel">
      <section className="profile-card glass-card">
        <div
          className="profile-cover"
          style={profile?.banner_url ? { backgroundImage: `url("${profile.banner_url}")` } : undefined}
        ></div>
        <div className="profile-avatar">
          {currentUser && profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" />
          ) : (
            currentUser ? initialsFromName(displayName) : "?"
          )}
        </div>

        <h2>{displayName}</h2>
        <p className="profile-role">{currentUser ? profile?.creator_type || "Resident" : "Not logged in"}</p>
        <p className="profile-bio">
          {currentUser ? profile?.bio || "Add a bio to tell the grid about yourself." : "Log in to set up your Gridster profile."}
        </p>

        <div className="profile-stats">
          {gridsterLeftSidebarProfile.stats.map(([value, label]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="profile-strength">
          <div className="strength-label">
            <span>Profile Strength</span>
            <span className="strength-percent">{profileStrength}%</span>
          </div>
          <div className="strength-bar">
            <div className="strength-fill" style={{ width: `${profileStrength}%` }}></div>
          </div>
        </div>

        <div className="creator-tools">
          <span className="tools-label">Creator Tools</span>
          <div className="tools-buttons">
            {gridsterLeftSidebarProfile.tools.map((tool) => (
              <button key={tool} onClick={() => handleToolClick(tool)}>{tool}</button>
            ))}
          </div>
        </div>
      </section>

      {children}

      <section className="sidebar-menu glass-card">
        {gridsterLeftSidebarNavItems.map(([icon, label, page]) => (
          <button
            key={page}
            className={activePage === page ? "active" : ""}
            onClick={() => setActivePage(page)}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}

        {gridsterLeftSidebarActionItems.map(({ label, page, className, suffix }) => (
          <button
            className={activePage === page ? `${className} active` : className}
            key={page}
            onClick={() => handleNavActionClick(page)}
          >
            {label} {suffix ? <b>{suffix}</b> : null}
          </button>
        ))}

        {profile?.is_admin ? (
          <button
            className={activePage === "FeaturedAdmin" ? "active" : ""}
            onClick={() => setActivePage("FeaturedAdmin")}
          >
            <span>🛡</span>
            Manage Featured
          </button>
        ) : null}
      </section>

      <a href="/bling-depot" className="gridster-plus-card bling-depot-big-card" onClick={openBlingDepot}>
        <div className="bling-big-preview">
          <img
            src="/images/bling%20card.png.png"
            alt="Bling Depot"
            className="bling-card-photo"
          />
        </div>

        <div className="bling-crown" aria-hidden="true">&#128142;</div>

        <h3>Bling Depot</h3>
        <p>Profile glowies, badges, frames, backgrounds, and chat extras.</p>
        <small>For when your profile needs to be extra.</small>
        <span className="bling-open-button">Open Shop</span>
      </a>

      <section className="premium-card glass-card" onClick={() => setShowPlusModal(true)}>
        <div className="premium-card-art">
          <img src={GRIDSTER_PLUS_ARTWORK} alt="Gridster logo" />
        </div>
        <span className="crown">♛</span>
        <h3>Gridster Plus</h3>
        <p>Unlock featured posts, bigger uploads, boosted events, and more sparkle.</p>
        <button type="button">Upgrade Now</button>
      </section>

      {showPlusModal ? <GridsterPlusModal onClose={() => setShowPlusModal(false)} /> : null}
    </aside>
  );
}

export default LeftSidebar;
