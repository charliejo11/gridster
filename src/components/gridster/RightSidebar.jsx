import { useEffect, useState } from "react";
import {
  getGridsterDestination,
  gridsterSlurlTeleports,
  hasGridsterProfile,
} from "../../data/gridsterMockData";
import { usePersistedGridsterFlag } from "../../lib/gridsterStorage";
import { supabase } from "../../lib/supabaseClient";
import {
  GRIDSTER_FRIEND_REQUEST_UPDATED_EVENT,
  fetchFriendNotifications,
  fetchFriends,
  formatFriendNotificationTime,
} from "../../lib/gridsterFriends";
import ActionButton from "./ActionButton";
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

function friendInitials(profile) {
  const source = profile?.display_name || profile?.sl_username || "?";

  return source
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function RightSidebar({
  creators,
  events,
  groups,
  liveNow,
  onOpenProfile,
  onOpenResidentProfile,
  onOpenMessages,
  places,
  showToast,
}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let active = true;

    const refresh = (nextUser) => {
      if (!nextUser) {
        setFriends([]);
        setNotifications([]);
        return;
      }

      fetchFriends(nextUser.id).then((data) => { if (active) setFriends(data); }).catch(() => {});
      fetchFriendNotifications(nextUser.id).then((data) => { if (active) setNotifications(data); }).catch(() => {});
    };

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setCurrentUser(data?.user ?? null);
        refresh(data?.user ?? null);
      }
    }).catch(() => {});

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      refresh(session?.user ?? null);
    });

    const handleFriendRequestUpdated = () => {
      supabase.auth.getUser().then(({ data }) => refresh(data?.user ?? null)).catch(() => {});
    };

    window.addEventListener(GRIDSTER_FRIEND_REQUEST_UPDATED_EVENT, handleFriendRequestUpdated);

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
      window.removeEventListener(GRIDSTER_FRIEND_REQUEST_UPDATED_EVENT, handleFriendRequestUpdated);
    };
  }, []);

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

      <Widget title="Friends" onAction={() => showToast?.("Full friends list coming soon.")}>
        {!currentUser ? (
          <p className="sidebar-widget-empty">Log in to add and see friends.</p>
        ) : friends.length === 0 ? (
          <p className="sidebar-widget-empty">No friends yet — visit a resident's profile to add one.</p>
        ) : (
          friends.map((friend) => (
            <div className="friend-online-row" key={friend.user_id}>
              <div className="friend-online-person">
                <div className="friend-online-avatar">
                  {friend.avatar_url ? <img src={friend.avatar_url} alt="" /> : friendInitials(friend)}
                </div>
                <div className="friend-online-copy">
                  <strong>{friend.display_name || friend.sl_username}</strong>
                </div>
              </div>
              <div className="friend-online-actions">
                <ActionButton onClick={() => onOpenMessages?.(friend.user_id)}>
                  Message
                </ActionButton>
                <ActionButton onClick={() => onOpenResidentProfile?.(friend.user_id)}>
                  View
                </ActionButton>
              </div>
            </div>
          ))
        )}
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

      <Widget title="Friend Alerts" onAction={() => showToast?.("Full alerts list coming soon.")}>
        {!currentUser ? (
          <p className="sidebar-widget-empty">Log in to see friend request alerts.</p>
        ) : notifications.length === 0 ? (
          <p className="sidebar-widget-empty">No alerts yet.</p>
        ) : (
          notifications.map((notification) => (
            <AlertRow
              key={notification.id}
              initial={friendInitials(notification.person)}
              name={notification.person?.display_name || notification.person?.sl_username || "A resident"}
              note={notification.type === "friend_request_received" ? "sent you a friend request" : "accepted your friend request"}
              time={formatFriendNotificationTime(notification.time)}
              unread={notification.unread}
            />
          ))
        )}
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

function AlertRow({ initial, name, note, time, unread }) {
  return (
    <div className={unread ? "alert-row is-unread" : "alert-row"}>
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
