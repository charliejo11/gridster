import { useEffect, useMemo, useState } from "react";
import { getEquippedCosmeticsForUser } from "../../lib/blingDepot";
import { getBlingProfileStyles } from "./blingDepotItems";
import BlingBuddyShowcase from "./BlingBuddyShowcase";
import BlingBuddyArt from "./BlingBuddyArt";
import {
  GRIDSTER_AVAILABLE_FOR_LABELS,
  fetchFavoritePlaces,
  fetchResidentProfile,
} from "../../lib/gridsterProfiles";
import TeleportStatusChip from "./TeleportStatusChip";

function getInitials(profile) {
  const source = profile?.display_name || profile?.sl_username || "Resident";
  const words = source.replace(/[^a-z0-9\s]/gi, " ").trim().split(/\s+/);
  const initials = words.length > 1 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2);
  return initials.toUpperCase();
}

function ResidentProfilePage({ userId, showToast }) {
  const [profile, setProfile] = useState(null);
  const [equippedCosmetics, setEquippedCosmetics] = useState([]);
  const [favoritePlaces, setFavoritePlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const nextProfile = await fetchResidentProfile(userId);

        if (!active) {
          return;
        }

        setProfile(nextProfile);

        // Equipped cosmetics and favorite places are separate, best-effort
        // loads - a failure here (e.g. a column/table not existing yet) must
        // not break the core profile view above.
        getEquippedCosmeticsForUser(userId)
          .then((nextEquipped) => {
            if (active) {
              setEquippedCosmetics(nextEquipped || []);
            }
          })
          .catch(() => {});

        fetchFavoritePlaces(userId)
          .then((nextFavorites) => {
            if (active) {
              setFavoritePlaces(nextFavorites || []);
            }
          })
          .catch(() => {});
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Could not load this resident's profile.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (userId) {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [userId]);

  const blingProfile = useMemo(
    () => (profile ? getBlingProfileStyles(profile, equippedCosmetics) : null),
    [profile, equippedCosmetics]
  );

  if (loading) {
    return <p className="groups-directory-message">Loading profile...</p>;
  }

  if (error) {
    return <p className="groups-directory-message groups-directory-error" role="alert">{error}</p>;
  }

  if (!profile) {
    return <p className="groups-directory-message">This resident hasn't set up a Gridster profile yet.</p>;
  }

  const displayClassName = [
    "resident-profile-card",
    "glass-card",
    blingProfile?.classNames?.glow,
  ].filter(Boolean).join(" ");
  const avatarClassName = [
    "resident-profile-avatar",
    blingProfile?.classNames?.frame,
  ].filter(Boolean).join(" ");
  const bannerStyle = blingProfile?.bannerStyle ?? (profile.banner_url
    ? { backgroundImage: `linear-gradient(135deg, rgba(10, 8, 24, 0.24), rgba(5, 6, 13, 0.62)), url("${profile.banner_url}")` }
    : undefined);

  return (
    <section className="resident-profile-page">
      <article className={displayClassName} style={blingProfile?.cardStyle}>
        <div className="resident-profile-banner" style={bannerStyle}></div>

        <div className="resident-profile-body">
          <div className={avatarClassName}>
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{getInitials(profile)}</span>}
          </div>

          <div className="resident-profile-copy">
            <div className="resident-profile-name-row">
              <h2>{profile.display_name}</h2>
              {profile.sl_verified ? <span className="resident-verified-badge">✔ Verified Resident</span> : null}
            </div>
            <strong>{profile.sl_username}</strong>
            <span className="resident-creator-type">{profile.creator_type}</span>
            {profile.current_mood ? <span className="resident-mood-badge">{profile.current_mood}</span> : null}
            {profile.bio ? <p>{profile.bio}</p> : null}
          </div>
        </div>

        {profile.available_for?.length ? (
          <div className="resident-available-for">
            {profile.available_for.map((tag) => (
              <span className="resident-available-for-pill" key={tag}>
                {GRIDSTER_AVAILABLE_FOR_LABELS[tag] || tag}
              </span>
            ))}
          </div>
        ) : null}

        {blingProfile?.equippedBadges?.length ? (
          <div className="profile-equipped-badges" aria-label="Equipped Bling Depot badges">
            {blingProfile.equippedBadges.map((badge) => (
              <span className={`profile-badge ${badge.previewClass || badge.preview_class}`} key={badge.id}>
                {badge.name}
              </span>
            ))}
          </div>
        ) : null}

        {blingProfile?.buddy ? (
          <div
            className={`profile-bling-buddy ${blingProfile.buddy.previewClass || blingProfile.buddy.preview_class || ""}`}
            title={blingProfile.buddy.name}
          >
            <BlingBuddyArt item={blingProfile.buddy} />
          </div>
        ) : null}
      </article>

      <BlingBuddyShowcase buddy={blingProfile?.buddy} showToast={showToast} />

      {profile.featured_photo_urls?.length ? (
        <section className="resident-featured-photos glass-card">
          <h3>Featured Photos</h3>
          <div className="group-photo-grid">
            {profile.featured_photo_urls.map((url) => (
              <div className="group-photo-tile" key={url}>
                <img src={url} alt="" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {favoritePlaces.length ? (
        <section className="resident-favorite-places glass-card">
          <h3>Favorite Places</h3>
          <div className="groups-directory-grid">
            {favoritePlaces.map((favorite) => {
              const place = favorite.gridster_places;

              if (!place) {
                return null;
              }

              return (
                <article className="group-directory-card glass-card" key={favorite.id}>
                  <div className="group-directory-photo">
                    {place.photo_url ? (
                      <img src={place.photo_url} alt="" />
                    ) : (
                      <span className="group-directory-photo-fallback">{place.title.charAt(0)}</span>
                    )}
                  </div>
                  <div className="group-directory-body">
                    <strong>{place.title}</strong>
                    {place.region_name ? <small>{place.region_name}</small> : null}
                  </div>
                  <div className="group-directory-actions">
                    {place.slurl ? (
                      <button type="button" data-destination={place.title} data-slurl={place.slurl}>
                        Teleport
                      </button>
                    ) : null}
                    <TeleportStatusChip slurl={place.slurl} destinationName={place.title} showToast={showToast} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </section>
  );
}

export default ResidentProfilePage;
