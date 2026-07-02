import {
  getGridsterDestination,
  gridsterFriendsOnline,
  gridsterSidebarAlerts,
  gridsterSlurlTeleports,
  hasGridsterProfile,
} from "../../data/gridsterMockData";
import ActionButton from "./ActionButton";
import StatusDot from "./StatusDot";
import Widget from "./Widget";

function getTeleportButtonProps(destinationName) {
  const destination = getGridsterDestination(destinationName);

  return {
    "data-destination": destination?.name ?? destinationName,
    "data-slurl": destination?.slurl ?? "",
  };
}

function RightSidebar({
  creators,
  events,
  groups,
  liveNow,
  onOpenProfile,
  places,
  showToast,
}) {
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
        {gridsterFriendsOnline.map(({ name, status }) => (
          <div className="friend-online-row" key={name}>
            <div className="friend-online-person">
              <div className="friend-online-avatar">{friendInitials(name)}</div>
              <div className="friend-online-copy">
                <strong>{name}</strong>
                <small>
                  <StatusDot className={`friend-status-dot ${statusClass(status)}`} />
                  {status}
                </small>
              </div>
            </div>
            <div className="friend-online-actions">
              <ActionButton onClick={() => showToast?.(`Message opened with ${name}.`)}>
                Message
              </ActionButton>
              <ActionButton onClick={() => handleViewFriend(name)}>
                View
              </ActionButton>
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
        {gridsterSidebarAlerts.map(([initial, name, note, time]) => (
          <AlertRow key={`${name}-${time}`} initial={initial} name={name} note={note} time={time} />
        ))}
      </Widget>

      <Widget title="SLURL Teleport">
        {gridsterSlurlTeleports.map(([title, desc, index]) => (
          <PlaceCard key={title} title={title} desc={desc} index={index} onOpenProfile={onOpenProfile} />
        ))}
      </Widget>
    </aside>
  );
}

function MiniEvent({ title, time, index }) {
  return (
    <div className="mini-event">
      <div className={`mini-thumb thumb-${index}`}></div>
      <div>
        <strong>{title}</strong>
        <small>{time}</small>
        <ActionButton {...getTeleportButtonProps(title)}>Teleport</ActionButton>
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
      <ActionButton {...getTeleportButtonProps(title)}>Teleport</ActionButton>
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
    <ActionButton className="follow-toggle">
      Follow
    </ActionButton>
  );
}

function JoinButton() {
  return (
    <ActionButton className="join-toggle">
      Join
    </ActionButton>
  );
}

export default RightSidebar;
