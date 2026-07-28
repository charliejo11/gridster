import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { fetchFollowers, fetchFollowing, fetchIsFollowing, followUser, unfollowUser } from "../../lib/gridsterFollows";

function getInitials(profile) {
  const source = profile.display_name || profile.sl_username || "Resident";
  const words = source.replace(/[^a-z0-9\s]/gi, " ").trim().split(/\s+/);
  const initials = words.length > 1 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2);
  return initials.toUpperCase();
}

function FollowListRow({ profile, currentUserId, onOpenResidentProfile, showToast, onChanged }) {
  const [following, setFollowing] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    if (!currentUserId || currentUserId === profile.user_id) {
      setFollowing(false);
      return undefined;
    }

    fetchIsFollowing(currentUserId, profile.user_id)
      .then((value) => {
        if (active) {
          setFollowing(value);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [currentUserId, profile.user_id]);

  const handleToggle = async () => {
    if (!currentUserId) {
      showToast?.("Log in to follow residents.");
      return;
    }

    setBusy(true);

    try {
      if (following) {
        await unfollowUser(currentUserId, profile.user_id);
        setFollowing(false);
      } else {
        await followUser(currentUserId, profile.user_id);
        setFollowing(true);
      }

      onChanged?.();
    } catch (error) {
      showToast?.(error.message || "Could not update follow status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="group-directory-card glass-card">
      <div className="group-directory-photo">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" />
        ) : (
          <span className="group-directory-photo-fallback">{getInitials(profile)}</span>
        )}
      </div>

      <div className="group-directory-body">
        <button
          type="button"
          className="group-directory-title-button"
          onClick={() => onOpenResidentProfile?.(profile.user_id)}
        >
          {profile.display_name || profile.sl_username}
        </button>
        {profile.sl_username ? <span className="group-category-pill">{profile.sl_username}</span> : null}
      </div>

      {currentUserId && currentUserId !== profile.user_id ? (
        <div className="group-directory-actions">
          <button
            type="button"
            className={following ? "follow-toggle-button is-following" : "follow-toggle-button"}
            disabled={busy || following === null}
            onClick={handleToggle}
          >
            <span className="follow-label-default">{busy ? "..." : following ? "Following" : "+ Follow"}</span>
            {following ? <span className="follow-label-hover">Unfollow</span> : null}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function FollowListPage({ userId, mode, onOpenResidentProfile, showToast }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setCurrentUser(data?.user ?? null);
      }
    }).catch(() => {});

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    const loader = mode === "following" ? fetchFollowing : fetchFollowers;

    loader(userId)
      .then((data) => {
        if (active) {
          setProfiles(data || []);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message || "Could not load this list.");
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
  }, [userId, mode, refreshToken]);

  const isFollowingMode = mode === "following";

  return (
    <section className="groups-directory-page">
      <article className="groups-directory-hero glass-card">
        <div className="groups-directory-hero-copy">
          <span>{isFollowingMode ? "Following" : "Followers"}</span>
          <h2>{isFollowingMode ? "Residents this profile follows." : "Residents who follow this profile."}</h2>
        </div>
      </article>

      {error ? <p className="groups-directory-message groups-directory-error" role="alert">{error}</p> : null}
      {loading ? <p className="groups-directory-message">Loading...</p> : null}
      {!loading && !error && !profiles.length ? (
        <p className="groups-directory-message">
          {isFollowingMode ? "Not following anyone yet." : "No followers yet."}
        </p>
      ) : null}

      <div className="groups-directory-grid">
        {profiles.map((profile) => (
          <FollowListRow
            key={profile.user_id}
            profile={profile}
            currentUserId={currentUser?.id}
            onOpenResidentProfile={onOpenResidentProfile}
            showToast={showToast}
            onChanged={() => setRefreshToken((current) => current + 1)}
          />
        ))}
      </div>
    </section>
  );
}

export default FollowListPage;
