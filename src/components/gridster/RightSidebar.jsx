import { hasGridsterProfile } from "../../data/gridsterMockData";

function RightSidebar({
  creators,
  events,
  groups,
  liveNow,
  onOpenProfile,
  places,
  showToast,
}) {
  const friends = [
    { name: "RavenHex", status: "Online" },
    { name: "NovaVixen", status: "Online" },
    { name: "DJ Starfall", status: "Busy" },
    { name: "EchoMoon", status: "Away" },
    { name: "Pixel Pixie", status: "Offline" },
    { name: "LunaVale", status: "Online" },
  ];

  const friendInitials = (name) =>
    name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const statusClass = (status) => {
    if (status === "Online") return "friend-status-online";
    if (status === "Busy") return "friend-status-busy";
    if (status === "Away") return "friend-status-away";
    return "friend-status-offline";
  };

  const handleViewFriend = (name) => {
    if (onOpenProfile && hasGridsterProfile(name)) {
      onOpenProfile(name);
      return;
    }

    showToast?.(`Opening ${name} profile.`);
  };

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
            <JoinButton />
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
            <FollowButton />
          </div>
        ))}
      </Widget>

      <Widget title="Friends Online">
        {friends.map(({ name, status }) => (
          <div className="friend-online-row" key={name}>
            <div className="friend-online-person">
              <div className="friend-online-avatar">{friendInitials(name)}</div>
              <div className="friend-online-copy">
                <strong>{name}</strong>
                <small>
                  <span className={`friend-status-dot ${statusClass(status)}`}></span>
                  {status}
                </small>
              </div>
            </div>
            <div className="friend-online-actions">
              <button type="button" onClick={() => showToast?.(`Message opened with ${name}.`)}>
                Message
              </button>
              <button type="button" onClick={() => handleViewFriend(name)}>
                View
              </button>
            </div>
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
            <JoinButton />
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

function FollowButton() {
  return (
    <button className="follow-toggle">
      Follow
    </button>
  );
}

function JoinButton() {
  return (
    <button className="join-toggle">
      Join
    </button>
  );
}

export default RightSidebar;
