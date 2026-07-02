function LeftSidebar({
  activePage,
  setActivePage,
  children,
}) {
  return (
    <aside className="left-panel">
      <section className="profile-card glass-card">
        <div className="profile-cover"></div>
        <div className="profile-avatar">CJ</div>

        <h2>CharlieJo</h2>
        <p className="profile-role">Second Life Blogger • Photographer • Creator</p>
        <p className="profile-bio">
          Capturing fashion, nightlife, events, and beautiful chaos across the grid.
        </p>

        <div className="profile-stats">
          <div>
            <strong>2.4K</strong>
            <span>Followers</span>
          </div>
          <div>
            <strong>320</strong>
            <span>Following</span>
          </div>
          <div>
            <strong>1.8K</strong>
            <span>Posts</span>
          </div>
        </div>

        <div className="profile-strength">
          <div className="strength-label">
            <span>Profile Strength</span>
            <span className="strength-percent">82%</span>
          </div>
          <div className="strength-bar">
            <div className="strength-fill" style={{ width: "82%" }}></div>
          </div>
        </div>

        <div className="creator-tools">
          <span className="tools-label">Creator Tools</span>
          <div className="tools-buttons">
            <button>New Blog</button>
            <button>Upload Photo</button>
            <button>Add Event</button>
            <button>Save SLURL</button>
          </div>
        </div>
      </section>

      {children}

      <section className="sidebar-menu glass-card">
        {[
          ["✦", "Home", "Home"],
          ["✧", "Groups", "Groups"],
          ["◇", "Grid Nights", "GridNights"],
          ["⌖", "Saved Landmarks & Posts", "SavedItems"],
          ["▣", "Photo Challenge", "PhotoChallenge"],
          ["♢", "Marketplace Finds", "Marketplace"],
          ["✎", "Spotlight Awards", "SpotlightAwards"],
          ["♫", "DJ Sets", "DJSets"],
        ].map(([icon, label, page]) => (
          <button
            key={page}
            className={activePage === page ? "active" : ""}
            onClick={() => setActivePage(page)}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}

        <button
          className={activePage === "CreateEvent" ? "create-post-button active" : "create-post-button"}
          onClick={() => setActivePage("CreateEvent")}
        >
          Create Event <b>+</b>
        </button>
        <button
          className={activePage === "CreateStorePost" ? "add-slurl-button active" : "add-slurl-button"}
          onClick={() => setActivePage("CreateStorePost")}
        >
          Create Store Post
        </button>
        <button
          className={activePage === "CreateBloggerPost" ? "add-slurl-button active" : "add-slurl-button"}
          onClick={() => setActivePage("CreateBloggerPost")}
        >
          Create Blogger Post
        </button>
        <button
          className={activePage === "CreateCommunityHub" ? "add-slurl-button active" : "add-slurl-button"}
          onClick={() => setActivePage("CreateCommunityHub")}
        >
          Create Community Hub
        </button>
        <button
          className={activePage === "BlingBoost" ? "add-slurl-button active" : "add-slurl-button"}
          onClick={() => setActivePage("BlingBoost")}
        >
          Bling Boost
        </button>
        <button
          className={activePage === "FeedPreferences" ? "add-slurl-button active" : "add-slurl-button"}
          onClick={() => setActivePage("FeedPreferences")}
        >
          Feed Preferences
        </button>
        <button
          className={activePage === "VerificationCenter" ? "add-slurl-button active" : "add-slurl-button"}
          onClick={() => setActivePage("VerificationCenter")}
        >
          Verification
        </button>
        <button
          className={activePage === "AddSLURL" ? "add-slurl-button active" : "add-slurl-button"}
          onClick={() => setActivePage("AddSLURL")}
        >
          Add SLURL
        </button>
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
