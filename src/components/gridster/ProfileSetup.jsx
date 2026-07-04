import { useEffect, useMemo, useState } from "react";
import {
  EMPTY_GRIDSTER_PROFILE,
  GRIDSTER_AVAILABLE_FOR_LABELS,
  GRIDSTER_AVAILABLE_FOR_TAGS,
  GRIDSTER_CREATOR_TYPES,
  GRIDSTER_INTEREST_TAGS,
  GRIDSTER_MAX_FEATURED_PHOTOS,
  GRIDSTER_MOOD_PRESETS,
  addFavoritePlace,
  fetchFavoritePlaces,
  fetchGridsterProfile,
  removeFavoritePlace,
  saveGridsterProfile,
} from "../../lib/gridsterProfiles";
import { fetchGridsterPlaces } from "../../lib/gridsterPlaces";
import { getEquippedCosmeticsForUser } from "../../lib/blingDepot";
import { getBlingProfileStyles } from "./blingDepotItems";
import BlingBuddyShowcase from "./BlingBuddyShowcase";
import { supabase } from "../../lib/supabaseClient";

const LINK_FIELDS = [
  ["flickr_url", "Flickr URL", "https://flickr.com/photos/yourname"],
  ["primfeed_url", "Primfeed URL", "https://primfeed.com/yourname"],
  ["instagram_url", "Instagram URL", "https://instagram.com/yourname"],
  ["marketplace_url", "Marketplace URL", "https://marketplace.secondlife.com/stores/..."],
];

function profileToForm(profile, user) {
  return {
    ...EMPTY_GRIDSTER_PROFILE,
    display_name: user?.email?.split("@")[0] ?? "",
    ...profile,
    interests: Array.isArray(profile?.interests) ? profile.interests : [],
    available_for: Array.isArray(profile?.available_for) ? profile.available_for : [],
    featured_photo_urls: Array.isArray(profile?.featured_photo_urls) ? profile.featured_photo_urls : [],
    current_mood: profile?.current_mood || "",
  };
}

function getProfileInitials(profile, user) {
  const source = profile?.display_name || profile?.sl_username || user?.email || "Gridster";
  const words = source.replace(/[^a-z0-9\s]/gi, " ").trim().split(/\s+/);
  const initials = words.length > 1
    ? `${words[0][0]}${words[1][0]}`
    : source.slice(0, 2);

  return initials.toUpperCase();
}

function compactUrl(url) {
  return String(url || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function ProfileSetup({ onAuthOpen, onOpenResidentProfile, onOpenBlingDepot, showToast }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [equippedCosmetics, setEquippedCosmetics] = useState([]);
  const [form, setForm] = useState(EMPTY_GRIDSTER_PROFILE);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [allPlaces, setAllPlaces] = useState([]);
  const [favoritePlaceIds, setFavoritePlaceIds] = useState(new Set());
  const [favoriteBusyId, setFavoriteBusyId] = useState("");
  const [moodIsCustom, setMoodIsCustom] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfileForUser(nextUser) {
      if (!active) {
        return;
      }

      setUser(nextUser);
      setError("");
      setMessage("");

      if (!nextUser) {
        setProfile(null);
        setEquippedCosmetics([]);
        setForm(EMPTY_GRIDSTER_PROFILE);
        setEditing(false);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const savedProfile = await fetchGridsterProfile(nextUser.id);

        if (!active) {
          return;
        }

        setProfile(savedProfile);
        setForm(profileToForm(savedProfile, nextUser));
        setEditing(!savedProfile);
        setMoodIsCustom(
          Boolean(savedProfile?.current_mood) && !GRIDSTER_MOOD_PRESETS.includes(savedProfile.current_mood)
        );

        // Equipped cosmetics and places/favorites are separate, best-effort
        // loads - a failure here (e.g. a column/table not existing yet) must
        // not break the core profile editor above.
        getEquippedCosmeticsForUser(nextUser.id)
          .then((savedEquippedCosmetics) => {
            if (active) {
              setEquippedCosmetics(savedEquippedCosmetics || []);
            }
          })
          .catch(() => {});

        Promise.all([fetchGridsterPlaces(), fetchFavoritePlaces(nextUser.id)])
          .then(([places, favorites]) => {
            if (!active) {
              return;
            }

            setAllPlaces(places || []);
            setFavoritePlaceIds(new Set((favorites || []).map((favorite) => favorite.place_id)));
          })
          .catch(() => {});
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError.message || "Could not load your Gridster profile.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    supabase.auth
      .getUser()
      .then(({ data }) => loadProfileForUser(data?.user ?? null))
      .catch((authError) => {
        if (!active) {
          return;
        }

        setError(authError.message || "Could not check your login session.");
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfileForUser(session?.user ?? null);
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const selectedInterests = useMemo(() => new Set(form.interests), [form.interests]);
  const selectedAvailableFor = useMemo(() => new Set(form.available_for), [form.available_for]);
  const hasProfile = Boolean(profile?.id);
  const profileBling = useMemo(
    () => (hasProfile ? getBlingProfileStyles(profile, equippedCosmetics) : null),
    [hasProfile, profile, equippedCosmetics],
  );
  const profileSetupClassName = [
    "gridster-profile-setup",
    hasProfile ? "profile-page" : "",
    profileBling?.classNames?.background,
  ].filter(Boolean).join(" ");

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleInterest = (tag) => {
    setForm((current) => {
      const currentTags = new Set(current.interests);

      if (currentTags.has(tag)) {
        currentTags.delete(tag);
      } else {
        currentTags.add(tag);
      }

      return {
        ...current,
        interests: Array.from(currentTags),
      };
    });
  };

  const toggleAvailableFor = (tag) => {
    setForm((current) => {
      const currentTags = new Set(current.available_for);

      if (currentTags.has(tag)) {
        currentTags.delete(tag);
      } else {
        currentTags.add(tag);
      }

      return {
        ...current,
        available_for: Array.from(currentTags),
      };
    });
  };

  const handleMoodPresetChange = (value) => {
    if (value === "__custom__") {
      setMoodIsCustom(true);
      updateField("current_mood", "");
      return;
    }

    setMoodIsCustom(false);
    updateField("current_mood", value);
  };

  const updateFeaturedPhoto = (index, value) => {
    setForm((current) => {
      const nextPhotos = [...current.featured_photo_urls];
      nextPhotos[index] = value;
      return { ...current, featured_photo_urls: nextPhotos };
    });
  };

  const addFeaturedPhotoField = () => {
    setForm((current) => {
      if (current.featured_photo_urls.length >= GRIDSTER_MAX_FEATURED_PHOTOS) {
        return current;
      }

      return { ...current, featured_photo_urls: [...current.featured_photo_urls, ""] };
    });
  };

  const removeFeaturedPhotoField = (index) => {
    setForm((current) => ({
      ...current,
      featured_photo_urls: current.featured_photo_urls.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const toggleFavoritePlace = async (place) => {
    if (!user) {
      return;
    }

    setFavoriteBusyId(place.id);

    try {
      if (favoritePlaceIds.has(place.id)) {
        await removeFavoritePlace(user.id, place.id);
        setFavoritePlaceIds((current) => {
          const next = new Set(current);
          next.delete(place.id);
          return next;
        });
        showToast?.(`Removed ${place.title} from favorites.`);
      } else {
        await addFavoritePlace(user.id, place.id);
        setFavoritePlaceIds((current) => new Set(current).add(place.id));
        showToast?.(`Added ${place.title} to favorites.`);
      }
    } catch (favoriteError) {
      showToast?.(favoriteError.message || "Could not update your favorite places.");
    } finally {
      setFavoriteBusyId("");
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!user) {
      setError("Log in before saving your Gridster profile.");
      return;
    }

    if (!form.display_name.trim() || !form.sl_username.trim()) {
      setError("Display name and Second Life legacy username are required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const savedProfile = await saveGridsterProfile(user.id, form);
      setProfile(savedProfile);
      setForm(profileToForm(savedProfile, user));
      setEditing(false);
      setMessage("Profile saved.");
      showToast?.("Gridster profile saved.");
    } catch (saveError) {
      setError(saveError.message || "Could not save your Gridster profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="gridster-profile-setup">
        <article className="profile-setup-empty glass-card">
          <span>Gridster Profile</span>
          <h3>Loading your profile...</h3>
          <p>Checking your login session and saved Gridster profile details.</p>
        </article>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="gridster-profile-setup">
        <article className="profile-setup-empty glass-card">
          <span>Gridster Profile</span>
          <h3>Log in to create your profile</h3>
          <p>Your Gridster profile is tied to your account so only you can edit it.</p>
          <button type="button" onClick={onAuthOpen}>Log In or Sign Up</button>
          {error ? <p className="profile-setup-error">{error}</p> : null}
        </article>
      </section>
    );
  }

  return (
    <section className={profileSetupClassName}>
      {hasProfile ? (
        <SavedProfileCard
          profile={profile}
          equippedCosmetics={equippedCosmetics}
          blingProfile={profileBling}
          initials={getProfileInitials(profile, user)}
          onViewPublicProfile={() => onOpenResidentProfile?.(user.id)}
          onEdit={() => {
            setForm(profileToForm(profile, user));
            setEditing(true);
            setError("");
            setMessage("");
          }}
        />
      ) : (
        <article className="profile-setup-empty glass-card">
          <span>Profile Setup</span>
          <h3>Create your Gridster profile</h3>
          <p>Add your Second Life identity, creator type, interests, and public links.</p>
        </article>
      )}

      {hasProfile ? (
        <BlingBuddyShowcase
          buddy={profileBling?.buddy}
          onOpenShop={onOpenBlingDepot}
          showToast={showToast}
        />
      ) : null}

      {editing ? (
        <form className="profile-setup-form glass-card" onSubmit={handleSave}>
          <div className="profile-setup-heading">
            <span>{hasProfile ? "Edit Profile" : "New Profile"}</span>
            <h3>{hasProfile ? "Update your Gridster profile" : "Set up your Gridster profile"}</h3>
            <p>These details shape how residents discover you across Gridster.</p>
          </div>

          <div className="profile-form-grid">
            <label className="profile-field">
              <span>Display name</span>
              <input
                className="profile-setup-input"
                type="text"
                value={form.display_name}
                onChange={(event) => updateField("display_name", event.target.value)}
                placeholder="CharlieJo"
                required
              />
            </label>

            <label className="profile-field">
              <span>Second Life legacy username</span>
              <input
                className="profile-setup-input"
                type="text"
                value={form.sl_username}
                onChange={(event) => updateField("sl_username", event.target.value)}
                placeholder="charliejo11.resident"
                required
              />
            </label>

            <label className="profile-field">
              <span>Creator type</span>
              <select
                className="profile-setup-input"
                value={form.creator_type}
                onChange={(event) => updateField("creator_type", event.target.value)}
              >
                {GRIDSTER_CREATOR_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <label className="profile-field">
              <span>Discord name</span>
              <input
                className="profile-setup-input"
                type="text"
                value={form.discord_name}
                onChange={(event) => updateField("discord_name", event.target.value)}
                placeholder="charliejo"
              />
            </label>

            <label className="profile-field">
              <span>Avatar image URL</span>
              <input
                className="profile-setup-input"
                type="text"
                value={form.avatar_url}
                onChange={(event) => updateField("avatar_url", event.target.value)}
                placeholder="https://..."
              />
            </label>

            <label className="profile-field">
              <span>Banner image URL</span>
              <input
                className="profile-setup-input"
                type="text"
                value={form.banner_url}
                onChange={(event) => updateField("banner_url", event.target.value)}
                placeholder="https://..."
              />
            </label>
          </div>

          <label className="profile-field">
            <span>Bio</span>
            <textarea
              className="profile-setup-input profile-setup-textarea"
              value={form.bio}
              onChange={(event) => updateField("bio", event.target.value)}
              placeholder="Tell residents what you create, host, photograph, sell, or love in Second Life."
              rows={4}
            />
          </label>

          <div className="profile-field">
            <span>Interests and tags</span>
            <div className="profile-tag-picker" role="group" aria-label="Interests and tags">
              {GRIDSTER_INTEREST_TAGS.map((tag) => (
                <button
                  type="button"
                  className={selectedInterests.has(tag) ? "active" : ""}
                  key={tag}
                  onClick={() => toggleInterest(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="profile-field">
            <span>Available for</span>
            <div className="profile-tag-picker" role="group" aria-label="Available for">
              {GRIDSTER_AVAILABLE_FOR_TAGS.map((tag) => (
                <button
                  type="button"
                  className={selectedAvailableFor.has(tag) ? "active" : ""}
                  key={tag}
                  onClick={() => toggleAvailableFor(tag)}
                >
                  {GRIDSTER_AVAILABLE_FOR_LABELS[tag]}
                </button>
              ))}
            </div>
          </div>

          <label className="profile-field">
            <span>Current mood</span>
            <select
              className="profile-setup-input"
              value={moodIsCustom ? "__custom__" : form.current_mood}
              onChange={(event) => handleMoodPresetChange(event.target.value)}
            >
              <option value="">No status set</option>
              {GRIDSTER_MOOD_PRESETS.map((preset) => (
                <option key={preset} value={preset}>{preset}</option>
              ))}
              <option value="__custom__">Custom...</option>
            </select>
          </label>

          {moodIsCustom ? (
            <label className="profile-field">
              <span>Custom mood</span>
              <input
                className="profile-setup-input"
                type="text"
                value={form.current_mood}
                onChange={(event) => updateField("current_mood", event.target.value)}
                placeholder="Hunting for the perfect skybox"
              />
            </label>
          ) : null}

          <div className="profile-field">
            <span>Featured photos</span>
            <div className="profile-photo-field-list">
              {form.featured_photo_urls.map((url, index) => (
                <div className="profile-photo-field-row" key={index}>
                  <input
                    className="profile-setup-input"
                    type="text"
                    value={url}
                    onChange={(event) => updateFeaturedPhoto(index, event.target.value)}
                    placeholder="https://..."
                  />
                  <button type="button" onClick={() => removeFeaturedPhotoField(index)}>Remove</button>
                </div>
              ))}
              {form.featured_photo_urls.length < GRIDSTER_MAX_FEATURED_PHOTOS ? (
                <button type="button" onClick={addFeaturedPhotoField}>+ Add Photo</button>
              ) : null}
            </div>
          </div>

          <div className="profile-field">
            <span>Favorite places</span>
            <div className="profile-favorite-place-list">
              {allPlaces.length === 0 ? <p>No places to favorite yet — visit the Places directory first.</p> : null}
              {allPlaces.map((place) => (
                <label className="profile-favorite-place-row" key={place.id}>
                  <input
                    type="checkbox"
                    checked={favoritePlaceIds.has(place.id)}
                    disabled={favoriteBusyId === place.id}
                    onChange={() => toggleFavoritePlace(place)}
                  />
                  <span>{place.title}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="profile-link-grid">
            {LINK_FIELDS.map(([field, label, placeholder]) => (
              <label className="profile-field" key={field}>
                <span>{label}</span>
                <input
                  className="profile-setup-input"
                  type="text"
                  value={form[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                  placeholder={placeholder}
                />
              </label>
            ))}
          </div>

          <div className="profile-setup-actions">
            <button type="submit" className="profile-save-button" disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
            {hasProfile ? (
              <button
                type="button"
                className="profile-cancel-button"
                disabled={saving}
                onClick={() => {
                  setForm(profileToForm(profile, user));
                  setEditing(false);
                  setError("");
                  setMessage("");
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>

          {error ? <p className="profile-setup-error" role="alert">{error}</p> : null}
          {message ? <p className="profile-setup-message">{message}</p> : null}
        </form>
      ) : null}
    </section>
  );
}

function SavedProfileCard({ profile, equippedCosmetics = [], blingProfile: suppliedBlingProfile, initials, onEdit, onViewPublicProfile }) {
  const blingProfile = suppliedBlingProfile ?? getBlingProfileStyles(profile, equippedCosmetics);
  const displayClassName = [
    "profile-setup-display",
    "glass-card",
    blingProfile.classNames?.glow,
  ].filter(Boolean).join(" ");
  const avatarClassName = [
    "profile-setup-avatar",
    "profile-avatar-wrap",
    blingProfile.classNames?.frame,
  ].filter(Boolean).join(" ");
  const bannerStyle = blingProfile.bannerStyle ?? (profile.banner_url
    ? { backgroundImage: `linear-gradient(135deg, rgba(10, 8, 24, 0.24), rgba(5, 6, 13, 0.62)), url("${profile.banner_url}")` }
    : undefined);
  const socialLinks = [
    ["Flickr", profile.flickr_url],
    ["Primfeed", profile.primfeed_url],
    ["Instagram", profile.instagram_url],
    ["Marketplace", profile.marketplace_url],
  ].filter(([, url]) => Boolean(url));

  return (
    <article className={displayClassName} style={blingProfile.cardStyle}>
      <div className="profile-setup-banner" style={bannerStyle}></div>
      <div className="profile-setup-display-body">
        <div className={avatarClassName}>
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{initials}</span>}
        </div>

        <div className="profile-setup-copy">
          <span>{profile.creator_type}</span>
          <h3>{profile.display_name}</h3>
          <strong>{profile.sl_username}</strong>
          {profile.bio ? <p>{profile.bio}</p> : <p>Add a bio so residents know what you do across the grid.</p>}
        </div>

        <div className="profile-card-header-actions">
          <button type="button" className="profile-edit-button" onClick={onEdit}>
            Edit Profile
          </button>
          <button type="button" className="profile-view-public-button" onClick={onViewPublicProfile}>
            View My Public Profile
          </button>
        </div>
      </div>

      <div className="profile-setup-tags">
        {(profile.interests?.length ? profile.interests : ["Resident"]).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>

      {blingProfile.equippedBadges.length ? (
        <div className="profile-equipped-badges" aria-label="Equipped Bling Depot badges">
          {blingProfile.equippedBadges.map((badge) => (
            <span className={`profile-badge ${badge.previewClass || badge.preview_class}`} key={badge.id}>
              {badge.name}
            </span>
          ))}
        </div>
      ) : null}

      {blingProfile.buddy ? (
        <div
          className={`profile-bling-buddy ${blingProfile.buddy.previewClass || blingProfile.buddy.preview_class || ""}`}
          title={blingProfile.buddy.name}
          aria-label={`Equipped Bling Buddy: ${blingProfile.buddy.name}`}
        >
          {blingProfile.buddy.imageUrl ? (
            <img src={blingProfile.buddy.imageUrl} alt="" />
          ) : (
            <span>{blingProfile.buddy.icon}</span>
          )}
        </div>
      ) : null}

      <div className="profile-setup-links">
        {socialLinks.map(([label, url]) => (
          <a href={url} target="_blank" rel="noreferrer" key={label}>
            <span>{label}</span>
            {compactUrl(url)}
          </a>
        ))}
        {profile.discord_name ? (
          <div>
            <span>Discord</span>
            {profile.discord_name}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default ProfileSetup;
