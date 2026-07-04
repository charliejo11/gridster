import {
  getGridsterDestination,
  gridsterFriendsOnline,
  gridsterSidebarAlerts,
  gridsterSlurlTeleports,
  hasGridsterProfile,
} from "../../data/gridsterMockData";
import { usePersistedGridsterFlag } from "../../lib/gridsterStorage";
import ActionButton from "./ActionButton";
import StatusDot from "./StatusDot";
import TeleportStatusChip from "./TeleportStatusChip";
import Widget from "./Widget";

function buildTeleportUrl(destination) {
  if (!destination) {
    return "";
  }

  if (destination.slurl) {
    return destination.slurl;
  }

  if (destination.region) {
    const x = destination.x ?? 128;
    const y = destination.y ?? 128;
    const z = destination.z ?? 25;

    return `https://maps.secondlife.com/secondlife/${encodeURIComponent(destination.region)}/${x}/${y}/${z}`;
  }

  return "";
}

function getTeleportButtonProps(destinationName) {
  const destination = getGridsterDestination(destinationName);
  const teleportUrl = buildTeleportUrl(destination);

  return {
    "data-destination": destination?.name ?? destinationName,
    "data-slurl": teleportUrl,
    disabled: !teleportUrl,
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
      <Widget title="Trending Events" onAction={() => showToast?.("Full events list coming soon.")}>
        {events.map(([title, time], index) => (
          <MiniEvent key={title} title={title} time={time} index={index} showToast={showToast} />
        ))}
      </Widget>

      <Widget title="Featured Sims / Stores" onAction={() => showToast?.("Full sims and stores list coming soon.")}>
        {places.map(([title, desc], index) => (
          <PlaceCard key={title} title={title} desc={desc} index={index} onOpenProfile={onOpenProfile} showToast={showToast} />
        ))}
      </Widget>

      <Widget title="Popular Groups" onAction={() => showToast?.("Full groups list coming soon.")}>
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

      <Widget title="Suggested Creators" onAction={() => showToast?.("Full creator directory coming soon.")}>
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

      <Widget title="Friends Online" onAction={() => showToast?.("Full friends list coming soon.")}>
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

      <Widget title="Live Now" onAction={() => showToast?.("Full live now list coming soon.")}>
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

      <Widget title="Messages & Alerts" onAction={() => showToast?.("Full alerts list coming soon.")}>
        {gridsterSidebarAlerts.map(([initial, name, note, time]) => (
          <AlertRow key={`${name}-${time}`} initial={initial} name={name} note={note} time={time} />
        ))}
      </Widget>

      <Widget title="SLURL Teleport" onAction={() => showToast?.("Full teleport directory coming soon.")}>
        {gridsterSlurlTeleports.map(([title, desc, index]) => (
          <PlaceCard key={title} title={title} desc={desc} index={index} onOpenProfile={onOpenProfile} showToast={showToast} />
        ))}
      </Widget>
    </aside>
  );
}

function MiniEvent({ title, time, index, showToast }) {
  return (
    <div className="mini-event">
      <div className={`mini-thumb thumb-${index}`}></div>
      <div>
        <strong>{title}</strong>
        <small>{time}</small>
        <ActionButton {...getTeleportButtonProps(title)}>Teleport</ActionButton>
        <TeleportStatusChip
          slurl={buildTeleportUrl(getGridsterDestination(title))}
          destinationName={title}
          showToast={showToast}
        />
      </div>
    </div>
  );
}

function PlaceCard({ title, desc, index, onOpenProfile, showToast }) {
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
      <TeleportStatusChip
        slurl={buildTeleportUrl(getGridsterDestination(title))}
        destinationName={title}
        showToast={showToast}
      />
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

export default RightSidebar;
