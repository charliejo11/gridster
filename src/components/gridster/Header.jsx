import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { BLING_BALANCE_EVENT, getBlingBalanceSummary, notifyBlingBalanceChanged } from "../../lib/blingDepot";
import { claimDailyLoginBonus, claimProfileCompleteBonus, claimSlVerifiedBonus } from "../../lib/gridsterBonuses";
import { GRIDSTER_PROFILE_UPDATED_EVENT, fetchGridsterProfile } from "../../lib/gridsterProfiles";
import { GRIDSTER_FRIEND_REQUEST_UPDATED_EVENT, respondToFriendRequest } from "../../lib/gridsterFriends";
import { respondToGroupInvite } from "../../lib/gridsterGroups";
import { respondToEventInvite } from "../../lib/gridsterPlaces";
import {
  GRIDSTER_NOTIFICATIONS_EVENT,
  fetchRecentNotifications,
  fetchUnreadNotificationCount,
  formatNotificationTime,
  getNotificationCopy,
  markAllNotificationsRead,
  markNotificationRead,
  clearAllNotifications,
  deleteNotification,
  subscribeToNotifications,
} from "../../lib/gridsterNotifications";

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

const BONUS_TOAST_MESSAGES = {
  daily_login: "+50 Bling Bits — daily login bonus!",
  profile_complete: "+200 Bling Bits — profile completed!",
  sl_verified: "+250 Bling Bits — SL avatar verified!",
};

function Header({
  activePage,
  setActivePage,
  setShowLanding,
  theme,
  setTheme,
  showToast,
  showNotifications,
  setShowNotifications,
  showThemeMenu,
  setShowThemeMenu,
  onAuthOpen,
  onOpenResidentProfile,
  onOpenGroup,
  onOpenMessages,
  themeOptions,
  activeThemeLabel,
}) {
  const [blingSummary, setBlingSummary] = useState({ balance: null, isAdmin: false });
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [respondingRequestId, setRespondingRequestId] = useState("");

  useEffect(() => {
    let active = true;

    const refreshBalance = () => {
      getBlingBalanceSummary()
        .then((summary) => {
          if (active) {
            setBlingSummary(summary);
          }
        })
        .catch(() => {});
    };

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

    const refreshNotifications = (nextUser) => {
      if (!nextUser) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      fetchRecentNotifications(nextUser.id)
        .then((nextNotifications) => {
          if (active) {
            setNotifications(nextNotifications);
          }
        })
        .catch(() => {});

      fetchUnreadNotificationCount(nextUser.id)
        .then((count) => {
          if (active) {
            setUnreadCount(count);
          }
        })
        .catch(() => {});
    };

    const claimEligibleBonuses = (nextUser) => {
      if (!nextUser) {
        return;
      }

      Promise.allSettled([
        claimDailyLoginBonus(),
        claimProfileCompleteBonus(),
        claimSlVerifiedBonus(),
      ]).then((results) => {
        if (!active) {
          return;
        }

        let anyGranted = false;

        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value?.granted) {
            anyGranted = true;
            showToast?.(BONUS_TOAST_MESSAGES[result.value.bonus_type] || "Bling Bits bonus earned!");
          }
        });

        if (anyGranted) {
          notifyBlingBalanceChanged();
        }
      });
    };

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setCurrentUser(data?.user ?? null);
        refreshProfile(data?.user ?? null);
        refreshNotifications(data?.user ?? null);
        claimEligibleBonuses(data?.user ?? null);
      }
    }).catch(() => {});

    refreshBalance();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      refreshProfile(session?.user ?? null);
      refreshNotifications(session?.user ?? null);
      refreshBalance();
      claimEligibleBonuses(session?.user ?? null);
    });

    const handleProfileUpdated = () => {
      supabase.auth.getUser().then(({ data }) => refreshProfile(data?.user ?? null)).catch(() => {});
    };

    const handleNotificationsChanged = () => {
      supabase.auth.getUser().then(({ data }) => refreshNotifications(data?.user ?? null)).catch(() => {});
    };

    window.addEventListener(BLING_BALANCE_EVENT, refreshBalance);
    window.addEventListener(GRIDSTER_PROFILE_UPDATED_EVENT, handleProfileUpdated);
    window.addEventListener(GRIDSTER_FRIEND_REQUEST_UPDATED_EVENT, handleNotificationsChanged);
    window.addEventListener(GRIDSTER_NOTIFICATIONS_EVENT, handleNotificationsChanged);

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
      window.removeEventListener(BLING_BALANCE_EVENT, refreshBalance);
      window.removeEventListener(GRIDSTER_FRIEND_REQUEST_UPDATED_EVENT, handleNotificationsChanged);
      window.removeEventListener(GRIDSTER_NOTIFICATIONS_EVENT, handleNotificationsChanged);
      window.removeEventListener(GRIDSTER_PROFILE_UPDATED_EVENT, handleProfileUpdated);
    };
  }, []);

  // Realtime: separate effect because it needs currentUser, which the auth
  // effect above sets asynchronously - can't subscribe before it exists.
  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    const channel = subscribeToNotifications(currentUser.id, {
      onInsert: () => {
        fetchRecentNotifications(currentUser.id).then(setNotifications).catch(() => {});
        fetchUnreadNotificationCount(currentUser.id).then(setUnreadCount).catch(() => {});
      },
      onUpdate: () => {
        fetchUnreadNotificationCount(currentUser.id).then(setUnreadCount).catch(() => {});
      },
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser?.id]);

  const handleAuthButtonClick = () => {
    if (currentUser) {
      supabase.auth.signOut().then(() => {
        showToast?.("Logged out.");
      });
      return;
    }

    onAuthOpen?.();
  };

  const handleNavClick = (event, item) => {
    event.preventDefault();
    setActivePage(item);
    setShowNotifications(false);
    setShowThemeMenu(false);
  };

  const handleThemeToggle = () => {
    setShowThemeMenu((isOpen) => !isOpen);
    setShowNotifications(false);
  };

  const handleNotificationToggle = () => {
    setShowNotifications((isOpen) => !isOpen);
    setShowThemeMenu(false);
  };

  const handleThemeSelect = (themeClass) => {
    setTheme(themeClass);
    setShowThemeMenu(false);
    showToast?.("Theme updated.");
  };

  const handleBackToLanding = () => {
    setShowNotifications(false);
    setShowThemeMenu(false);
    setShowLanding(true);
  };

  const handleMarkAllRead = () => {
    if (currentUser) {
      markAllNotificationsRead(currentUser.id)
        .then(() => {
          setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
          setUnreadCount(0);
        })
        .catch(() => {});
    }

    showToast?.("All notifications marked as read.");
  };

  const handleClearAll = () => {
    if (!currentUser) {
      return;
    }

    if (!window.confirm("Clear all notifications? This cannot be undone.")) {
      return;
    }

    clearAllNotifications(currentUser.id)
      .then(() => {
        setNotifications([]);
        setUnreadCount(0);
      })
      .catch(() => showToast?.("Could not clear notifications."));
  };

  const handleToggleRead = (notification, event) => {
    event.stopPropagation();
    const nextRead = !notification.is_read;

    markNotificationRead(notification.id, nextRead)
      .then(() => {
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, is_read: nextRead } : item))
        );
        setUnreadCount((current) => Math.max(0, current + (nextRead ? -1 : 1)));
      })
      .catch(() => showToast?.("Could not update that notification."));
  };

  const handleRemove = (notification, event) => {
    event.stopPropagation();

    deleteNotification(notification.id)
      .then(() => {
        setNotifications((current) => current.filter((item) => item.id !== notification.id));
        if (!notification.is_read) {
          setUnreadCount((current) => Math.max(0, current - 1));
        }
      })
      .catch(() => showToast?.("Could not remove that notification."));
  };

  const handleViewAllNotifications = () => {
    setActivePage("Notifications");
    setShowNotifications(false);
  };

  const handleRespondToRequest = (requestId, accept, event) => {
    event?.stopPropagation();
    setRespondingRequestId(requestId);

    respondToFriendRequest(requestId, accept)
      .then(() => {
        showToast?.(accept ? "Friend request accepted." : "Friend request declined.");

        if (currentUser) {
          fetchRecentNotifications(currentUser.id).then(setNotifications).catch(() => {});
        }
      })
      .catch((error) => showToast?.(error.message || "Could not update that friend request."))
      .finally(() => setRespondingRequestId(""));
  };

  const handleRespondToGroupInvite = (notification, accept, event) => {
    event.stopPropagation();
    setRespondingRequestId(notification.id);

    respondToGroupInvite(notification.related_request_id, accept, profile?.display_name)
      .then(() => {
        showToast?.(accept ? "Joined the group." : "Invite declined.");

        if (currentUser) {
          fetchRecentNotifications(currentUser.id).then(setNotifications).catch(() => {});
        }
      })
      .catch((error) => showToast?.(error.message || "Could not update that group invite."))
      .finally(() => setRespondingRequestId(""));
  };

  const handleRespondToEventInvite = (notification, accept, event) => {
    event.stopPropagation();
    setRespondingRequestId(notification.id);

    respondToEventInvite(notification.related_request_id, accept)
      .then(() => {
        showToast?.(accept ? "You're going!" : "Invite declined.");

        if (currentUser) {
          fetchRecentNotifications(currentUser.id).then(setNotifications).catch(() => {});
        }
      })
      .catch((error) => showToast?.(error.message || "Could not update that event invite."))
      .finally(() => setRespondingRequestId(""));
  };

  const handleNotificationClick = (notification) => {
    setShowNotifications(false);

    if (!notification.is_read) {
      markNotificationRead(notification.id, true).catch(() => {});
      setUnreadCount((current) => Math.max(0, current - 1));
    }

    switch (notification.notification_type) {
      case "post_liked":
      case "post_commented":
      case "mention":
        setActivePage("Home");
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
        setActivePage("Events");
        break;
      case "bling_bits_bonus":
      case "bling_bits_purchase":
        setActivePage("BlingBoost");
        break;
      default:
        break;
    }
  };

  const unreadNotificationCount = unreadCount;

  return (
    <header className="topbar">
      <div className="brand">
        <img className="brand-logo" src="/gridster-logo.png" alt="Gridster logo" />
        <div>
          <h1>Gridster</h1>
          <p>Post • Discover • Teleport</p>
        </div>
      </div>

      <div className="topbar-center">
        <nav className="topnav">
          {[
            "Home",
            "Search",
            "Explore",
            "Events",
            "Groups",
            "Messages",
            "Profile",
            "Settings",
          ].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className={item === activePage ? "active" : ""}
              aria-current={item === activePage ? "page" : undefined}
              onClick={(event) => handleNavClick(event, item)}
            >
              {item}
            </a>
          ))}
        </nav>

        <label className="search-box">
          <span>⌕</span>
          <input placeholder="Search people, groups, events, sims..." />
        </label>
      </div>

      <div className="top-actions">
        <button
          className="landing-back-button"
          onClick={handleBackToLanding}
        >
          Back to Landing
        </button>
        <button
          className="header-auth-button"
          onClick={handleAuthButtonClick}
        >
          {currentUser ? "Log Out" : "Log In"}
        </button>
        <div className="theme-menu">
          <button
            className={showThemeMenu ? "theme-button active" : "theme-button"}
            onClick={handleThemeToggle}
            aria-label="Choose Gridster theme"
            aria-expanded={showThemeMenu}
          >
            <span>Theme</span>
            <strong>{activeThemeLabel}</strong>
          </button>

          {showThemeMenu ? (
            <div className="theme-dropdown glass-card">
              <div className="theme-dropdown-header">
                <h3>Appearance</h3>
                <span>Preview</span>
              </div>

              <div className="theme-option-list">
                {themeOptions.map(([label, themeClass]) => (
                  <button
                    className={theme === themeClass ? "active" : ""}
                    key={themeClass}
                    onClick={() => handleThemeSelect(themeClass)}
                  >
                    <span className={`theme-swatch ${themeClass}`}></span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="notification-menu">
          <button
            className={showNotifications ? "notification-button active" : "notification-button"}
            onClick={handleNotificationToggle}
            aria-label="Toggle notifications"
            aria-expanded={showNotifications}
          >
            <span className="notification-bell">🔔</span>
            {unreadNotificationCount > 0 ? (
              <span className="notification-count">{unreadNotificationCount}</span>
            ) : null}
          </button>

          {showNotifications ? (
            <div className="notification-dropdown glass-card">
              <div className="notification-dropdown-header">
                <h3>Notifications</h3>
                <span>{unreadNotificationCount > 0 ? `${unreadNotificationCount} new` : "All caught up"}</span>
              </div>

              <div className="notification-list-preview">
                {notifications.length === 0 ? (
                  <p className="sidebar-widget-empty">No notifications yet.</p>
                ) : (
                  notifications.map((notification, index) => (
                    <article
                      className={notification.is_read ? "notification-preview-row" : "notification-preview-row is-unread"}
                      key={notification.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNotificationClick(notification)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleNotificationClick(notification);
                        }
                      }}
                    >
                      <button
                        type="button"
                        className={`notification-preview-icon notice-${index % 5}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (notification.actor_user_id) {
                            setShowNotifications(false);
                            onOpenResidentProfile?.(notification.actor_user_id);
                          }
                        }}
                        aria-label={notification.actorName || "Gridster"}
                      >
                        {notification.actorAvatarUrl ? (
                          <img src={notification.actorAvatarUrl} alt="" />
                        ) : (
                          initialsFromName(notification.actorName || "Gridster")
                        )}
                      </button>
                      <div>
                        <strong>{getNotificationCopy(notification)}</strong>
                        <small>{formatNotificationTime(notification.created_at)}</small>

                        {notification.notification_type === "friend_request_received" ? (
                          <div className="notification-inline-actions">
                            <button
                              type="button"
                              disabled={respondingRequestId === notification.related_request_id}
                              onClick={(event) => handleRespondToRequest(notification.related_request_id, true, event)}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={respondingRequestId === notification.related_request_id}
                              onClick={(event) => handleRespondToRequest(notification.related_request_id, false, event)}
                            >
                              Decline
                            </button>
                          </div>
                        ) : null}

                        {notification.notification_type === "group_invite" ? (
                          <div className="notification-inline-actions">
                            <button
                              type="button"
                              disabled={respondingRequestId === notification.id}
                              onClick={(event) => handleRespondToGroupInvite(notification, true, event)}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={respondingRequestId === notification.id}
                              onClick={(event) => handleRespondToGroupInvite(notification, false, event)}
                            >
                              Decline
                            </button>
                          </div>
                        ) : null}

                        {notification.notification_type === "event_invite" ? (
                          <div className="notification-inline-actions">
                            <button
                              type="button"
                              disabled={respondingRequestId === notification.id}
                              onClick={(event) => handleRespondToEventInvite(notification, true, event)}
                            >
                              I&apos;m going
                            </button>
                            <button
                              type="button"
                              disabled={respondingRequestId === notification.id}
                              onClick={(event) => handleRespondToEventInvite(notification, false, event)}
                            >
                              Decline
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="notification-preview-row-actions">
                        <button
                          type="button"
                          className="notification-toggle-button"
                          onClick={(event) => handleToggleRead(notification, event)}
                          aria-label={notification.is_read ? "Mark as unread" : "Mark as read"}
                        >
                          {notification.is_read ? "○" : "●"}
                        </button>
                        <button
                          type="button"
                          className="notification-remove-button"
                          onClick={(event) => handleRemove(notification, event)}
                          aria-label="Remove notification"
                        >
                          ×
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="notification-dropdown-actions">
                <button onClick={handleMarkAllRead}>
                  Mark all read
                </button>
                <button onClick={handleClearAll}>
                  Clear all
                </button>
                <button onClick={handleViewAllNotifications}>
                  View all notifications
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <button
          className="gem-button"
          onClick={() => showToast?.("Bling Bits can be used for boosts, flair, and featured visibility.")}
        >
          💎{" "}
          {blingSummary.isAdmin
            ? "∞ Bling Bits"
            : blingSummary.balance === null
              ? "1,250 Bling Bits"
              : `${blingSummary.balance.toLocaleString()} Bling Bits`}
        </button>
        <div className="mini-profile">
          <div className="mini-pic">
            {currentUser && profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" />
            ) : (
              currentUser ? initialsFromName(profile?.display_name || profile?.sl_username) : "?"
            )}
          </div>
          <div>
            <strong>{currentUser ? profile?.display_name || profile?.sl_username || "Set up your profile" : "Guest"}</strong>
            <span>{currentUser ? "Online" : "Not logged in"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
