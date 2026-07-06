import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { BLING_BALANCE_EVENT, getBlingBalanceSummary, notifyBlingBalanceChanged } from "../../lib/blingDepot";
import { claimDailyLoginBonus, claimProfileCompleteBonus, claimSlVerifiedBonus } from "../../lib/gridsterBonuses";
import { GRIDSTER_PROFILE_UPDATED_EVENT, fetchGridsterProfile } from "../../lib/gridsterProfiles";

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
  themeOptions,
  activeThemeLabel,
  notifications,
}) {
  const [blingSummary, setBlingSummary] = useState({ balance: null, isAdmin: false });
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);

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
        claimEligibleBonuses(data?.user ?? null);
      }
    }).catch(() => {});

    refreshBalance();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      refreshProfile(session?.user ?? null);
      refreshBalance();
      claimEligibleBonuses(session?.user ?? null);
    });

    const handleProfileUpdated = () => {
      supabase.auth.getUser().then(({ data }) => refreshProfile(data?.user ?? null)).catch(() => {});
    };

    window.addEventListener(BLING_BALANCE_EVENT, refreshBalance);
    window.addEventListener(GRIDSTER_PROFILE_UPDATED_EVENT, handleProfileUpdated);

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
      window.removeEventListener(BLING_BALANCE_EVENT, refreshBalance);
      window.removeEventListener(GRIDSTER_PROFILE_UPDATED_EVENT, handleProfileUpdated);
    };
  }, []);

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
    showToast?.("All notifications marked as read.");
    setShowNotifications(false);
  };

  const handleViewAlerts = () => {
    setActivePage("Messages");
    setShowNotifications(false);
  };

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
            <span className="notification-count">5</span>
          </button>

          {showNotifications ? (
            <div className="notification-dropdown glass-card">
              <div className="notification-dropdown-header">
                <h3>Notifications</h3>
                <span>5 new</span>
              </div>

              <div className="notification-list-preview">
                {notifications.map(([initial, text, time], index) => (
                  <article className="notification-preview-row" key={text}>
                    <span className={`notification-preview-icon notice-${index}`}>{initial}</span>
                    <div>
                      <strong>{text}</strong>
                      <small>{time}</small>
                    </div>
                    <em aria-label="Unread notification"></em>
                  </article>
                ))}
              </div>

              <div className="notification-dropdown-actions">
                <button onClick={handleMarkAllRead}>
                  Mark all read
                </button>
                <button onClick={handleViewAlerts}>
                  View alerts
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
