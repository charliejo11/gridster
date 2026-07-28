import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  clearAllNotifications,
  deleteNotification,
  fetchNotificationsPage,
  formatNotificationTime,
  getNotificationCopy,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../lib/gridsterNotifications";
import { respondToFriendRequest } from "../../lib/gridsterFriends";
import { respondToGroupInvite } from "../../lib/gridsterGroups";
import { respondToEventInvite } from "../../lib/gridsterPlaces";

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

function NotificationsPage({ onOpenResidentProfile, onOpenGroup, onOpenMessages, setActivePage, showToast }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [respondingId, setRespondingId] = useState("");

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setCurrentUser(data?.user ?? null);
      }
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    fetchNotificationsPage(currentUser.id, { limit: 20 })
      .then((rows) => {
        if (active) {
          setNotifications(rows);
          setHasMore(rows.length === 20);
        }
      })
      .catch(() => {
        if (active) {
          showToast?.("Could not load notifications.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const handleLoadMore = () => {
    if (!currentUser || !notifications.length) {
      return;
    }

    setLoadingMore(true);
    const before = notifications[notifications.length - 1].created_at;

    fetchNotificationsPage(currentUser.id, { limit: 20, before })
      .then((rows) => {
        setNotifications((current) => [...current, ...rows]);
        setHasMore(rows.length === 20);
      })
      .catch(() => showToast?.("Could not load more notifications."))
      .finally(() => setLoadingMore(false));
  };

  const handleMarkAllRead = () => {
    if (!currentUser) {
      return;
    }

    markAllNotificationsRead(currentUser.id)
      .then(() => setNotifications((current) => current.map((item) => ({ ...item, is_read: true }))))
      .catch(() => showToast?.("Could not mark all as read."));
  };

  const handleClearAll = () => {
    if (!currentUser) {
      return;
    }

    if (!window.confirm("Clear all notifications? This cannot be undone.")) {
      return;
    }

    clearAllNotifications(currentUser.id)
      .then(() => setNotifications([]))
      .catch(() => showToast?.("Could not clear notifications."));
  };

  const handleToggleRead = (notification) => {
    const nextRead = !notification.is_read;

    markNotificationRead(notification.id, nextRead)
      .then(() => {
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, is_read: nextRead } : item))
        );
      })
      .catch(() => showToast?.("Could not update that notification."));
  };

  const handleRemove = (notification) => {
    deleteNotification(notification.id)
      .then(() => setNotifications((current) => current.filter((item) => item.id !== notification.id)))
      .catch(() => showToast?.("Could not remove that notification."));
  };

  const handleRespondToFriendRequest = (notification, accept) => {
    setRespondingId(notification.id);

    respondToFriendRequest(notification.related_request_id, accept)
      .then(() => {
        showToast?.(accept ? "Friend request accepted." : "Friend request declined.");
        setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)));
      })
      .catch((error) => showToast?.(error.message || "Could not update that friend request."))
      .finally(() => setRespondingId(""));
  };

  const handleRespondToGroupInvite = (notification, accept) => {
    setRespondingId(notification.id);

    respondToGroupInvite(notification.related_request_id, accept, currentUser?.user_metadata?.display_name)
      .then(() => {
        showToast?.(accept ? "Joined the group." : "Invite declined.");
        setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)));
      })
      .catch((error) => showToast?.(error.message || "Could not update that group invite."))
      .finally(() => setRespondingId(""));
  };

  const handleRespondToEventInvite = (notification, accept) => {
    setRespondingId(notification.id);

    respondToEventInvite(notification.related_request_id, accept)
      .then(() => {
        showToast?.(accept ? "You're going!" : "Invite declined.");
        setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)));
      })
      .catch((error) => showToast?.(error.message || "Could not update that event invite."))
      .finally(() => setRespondingId(""));
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markNotificationRead(notification.id, true).catch(() => {});
      setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)));
    }

    switch (notification.notification_type) {
      case "post_liked":
      case "post_commented":
      case "mention":
        setActivePage?.("Home");
        break;
      case "new_message":
        onOpenMessages?.(notification.related_user_id);
        break;
      case "friend_request_received":
      case "friend_request_accepted":
      case "follow_received":
        onOpenResidentProfile?.(notification.actor_user_id);
        break;
      case "group_invite":
      case "group_activity":
        onOpenGroup?.(notification.related_group_id);
        break;
      case "event_invite":
      case "event_reminder":
        setActivePage?.("Events");
        break;
      case "bling_bits_bonus":
      case "bling_bits_purchase":
        setActivePage?.("BlingBoost");
        break;
      default:
        break;
    }
  };

  return (
    <section className="notifications-page">
      <div className="notifications-page-toolbar">
        <button type="button" onClick={handleMarkAllRead} disabled={!notifications.length}>
          Mark all read
        </button>
        <button type="button" onClick={handleClearAll} disabled={!notifications.length}>
          Clear all
        </button>
      </div>

      {loading ? <p className="groups-directory-message">Loading notifications...</p> : null}

      {!loading && !notifications.length ? (
        <p className="groups-directory-message">No notifications yet.</p>
      ) : null}

      <div className="notifications-page-list">
        {notifications.map((notification) => (
          <article
            className={notification.is_read ? "notifications-page-row" : "notifications-page-row is-unread"}
            key={notification.id}
          >
            <button
              type="button"
              className="notification-preview-icon notifications-page-avatar"
              onClick={() => notification.actor_user_id && onOpenResidentProfile?.(notification.actor_user_id)}
              aria-label={notification.actorName || "Gridster"}
            >
              {notification.actorAvatarUrl ? (
                <img src={notification.actorAvatarUrl} alt="" />
              ) : (
                initialsFromName(notification.actorName || "Gridster")
              )}
            </button>

            <div className="notifications-page-body" onClick={() => handleNotificationClick(notification)}>
              <p>{getNotificationCopy(notification)}</p>
              <small>{formatNotificationTime(notification.created_at)}</small>

              {notification.notification_type === "friend_request_received" ? (
                <div className="notification-inline-actions">
                  <button
                    type="button"
                    disabled={respondingId === notification.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRespondToFriendRequest(notification, true);
                    }}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={respondingId === notification.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRespondToFriendRequest(notification, false);
                    }}
                  >
                    Decline
                  </button>
                </div>
              ) : null}

              {notification.notification_type === "group_invite" ? (
                <div className="notification-inline-actions">
                  <button
                    type="button"
                    disabled={respondingId === notification.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRespondToGroupInvite(notification, true);
                    }}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={respondingId === notification.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRespondToGroupInvite(notification, false);
                    }}
                  >
                    Decline
                  </button>
                </div>
              ) : null}

              {notification.notification_type === "event_invite" ? (
                <div className="notification-inline-actions">
                  <button
                    type="button"
                    disabled={respondingId === notification.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRespondToEventInvite(notification, true);
                    }}
                  >
                    I'm going
                  </button>
                  <button
                    type="button"
                    disabled={respondingId === notification.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRespondToEventInvite(notification, false);
                    }}
                  >
                    Decline
                  </button>
                </div>
              ) : null}
            </div>

            <div className="notifications-page-row-actions">
              <button
                type="button"
                className="notification-toggle-button"
                onClick={() => handleToggleRead(notification)}
              >
                {notification.is_read ? "Mark unread" : "Mark read"}
              </button>
              <button
                type="button"
                className="notification-remove-button"
                onClick={() => handleRemove(notification)}
                aria-label="Remove notification"
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>

      {hasMore && notifications.length ? (
        <div className="notifications-page-load-more">
          <button type="button" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default NotificationsPage;
