import { useState } from "react";
import {
  gridsterLeftSidebarActionItems,
  gridsterLeftSidebarNavItems,
  gridsterLeftSidebarProfile,
} from "../../data/gridsterMockData";
import GridsterPlusModal from "./GridsterPlusModal";

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
        <div className="profile-cover"></div>
        <div className="profile-avatar">{gridsterLeftSidebarProfile.initials}</div>

        <h2>{gridsterLeftSidebarProfile.displayName}</h2>
        <p className="profile-role">{gridsterLeftSidebarProfile.role}</p>
        <p className="profile-bio">
          {gridsterLeftSidebarProfile.bio}
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
            <span className="strength-percent">{gridsterLeftSidebarProfile.strength}</span>
          </div>
          <div className="strength-bar">
            <div className="strength-fill" style={{ width: gridsterLeftSidebarProfile.strength }}></div>
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
