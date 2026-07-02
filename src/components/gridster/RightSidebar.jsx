import { getGridsterProfile as hasGridsterProfile } from "../../data/gridsterMockData";

function RightSidebar({
  creators,
  events,
  groups,
  liveNow,
  onOpenProfile,
  places,
}) {
  return (
    <aside className="right-panel">
      <Widget title="Trending Events">
        {events.map(([title, time], index) => (
          <MiniEvent key={title} title={title} time={time} index={index} />
        ))}
      </Widget>

      <Widget title="Featured Sims / Stores">
        {places.map(([title, desc], index) => (
          <PlaceCard key={title} title={title} desc={desc} index={index} onOpenProfile={onOpenProfile} />
        ))}
      </Widget>

      <Widget title="Popular Groups">
        {groups.map((group) => (
          <div className="group-row" key={group}>
            <span>✦</span>
            <div>
              <strong>{group}</strong>
              <small>2.4K members</small>
            </div>
            <JoinButton storageKey={group} />
          </div>
        ))}
      </Widget>

      <Widget title="Suggested Creators">
        {creators.map((person) => (
          <div className="creator-row" key={person}>
            <button
              className="creator-profile-button"
              disabled={!hasGridsterProfile(person)}
              onClick={() => onOpenProfile?.(person)}
            >
              <div className="creator-avatar">{person.charAt(0)}</div>
              <div>
                <strong>{person}</strong>
                <small>Blogger • Fashion</small>
              </div>
            </button>
            <FollowButton storageKey={person} />
          </div>
        ))}
      </Widget>

      <Widget title="Live Now">
        {liveNow.map(([name, label]) => (
          <div className="live-now-row" key={name}>
            <div className="live-indicator" />
            <div>
              <strong>{name}</strong>
              <small>{label}</small>
            </div>
            <JoinButton storageKey={name} />
          </div>
        ))}
      </Widget>

      <Widget title="Messages & Alerts">
        <AlertRow initial="R" name="RavenHex" note="commented on your photo" time="2m" />
        <AlertRow initial="S" name="Sanctuary Rocks" note="added a new event" time="14m" />
        <AlertRow initial="N" name="NovaVixen" note="followed you" time="1h" />
        <AlertRow initial="M" name="Moonlit Market" note="posted new releases" time="3h" />
      </Widget>

      <Widget title="SLURL Teleport">
        <PlaceCard title="Sunset Cove" desc="Moderate" index={4} onOpenProfile={onOpenProfile} />
        <PlaceCard title="Crystal Lagoon" desc="Moderate" index={5} onOpenProfile={onOpenProfile} />
      </Widget>
    </aside>
  );
}

function Widget({ title, children }) {
  return (
    <section className="widget glass-card">
      <div className="widget-title">
        <h3>{title}</h3>
        <a>View All</a>
      </div>
      {children}
    </section>
  );
}

function MiniEvent({ title, time, index }) {
  return (
    <div className="mini-event">
      <div className={`mini-thumb thumb-${index}`}></div>
      <div>
        <strong>{title}</strong>
        <small>{time}</small>
        <button>Teleport</button>
      </div>
    </div>
  );
}

function PlaceCard({ title, desc, index, onOpenProfile }) {
  const profileAvailable = hasGridsterProfile(title);

  return (
    <div className="place-card">
      <div className={`place-thumb small thumb-${index}`}></div>
      <div>
        {profileAvailable ? (
          <button className="place-profile-button" onClick={() => onOpenProfile?.(title)}>
            {title}
          </button>
        ) : (
          <strong>{title}</strong>
        )}
        <small>{desc}</small>
      </div>
      <button>Teleport</button>
    </div>
  );
}

function AlertRow({ initial, name, note, time }) {
  return (
    <div className="alert-row">
      <div className="alert-avatar">{initial}</div>
      <div className="alert-content">
        <strong>{name}</strong>
        <small>{note}</small>
      </div>
      <span className="alert-time">{time}</span>
    </div>
  );
}

function FollowButton({ storageKey = "creator" }) {
  return (
    <button className="follow-toggle">
      Follow
    </button>
  );
}

function JoinButton({ storageKey = "group" }) {
  return (
    <button className="join-toggle">
      Join
    </button>
  );
}

export default RightSidebar;