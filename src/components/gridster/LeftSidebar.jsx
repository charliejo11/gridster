import {
  gridsterLeftSidebarActionItems,
  gridsterLeftSidebarNavItems,
  gridsterLeftSidebarProfile,
} from "../../data/gridsterMockData";

function LeftSidebar({
  activePage,
  setActivePage,
  children,
}) {
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
              <button key={tool}>{tool}</button>
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
            onClick={() => setActivePage(page)}
          >
            {label} {suffix ? <b>{suffix}</b> : null}
          </button>
        ))}
      </section>

      <section className="premium-card glass-card">
        <span className="crown">♛</span>
        <h3>Gridster Plus</h3>
        <p>Unlock featured posts, bigger uploads, boosted events, and more sparkle.</p>
        <button>Upgrade Now</button>
      </section>
    </aside>
  );
}

export default LeftSidebar;
