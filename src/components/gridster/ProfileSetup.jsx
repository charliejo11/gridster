import { useEffect, useMemo, useState } from "react";
import {
  EMPTY_GRIDSTER_PROFILE,
  GRIDSTER_CREATOR_TYPES,
  GRIDSTER_INTEREST_TAGS,
  fetchGridsterProfile,
  saveGridsterProfile,
} from "../../lib/gridsterProfiles";
import { getEquippedCosmeticsForUser } from "../../lib/blingDepot";
import { getBlingProfileStyles } from "./blingDepotItems";
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

function ProfileSetup({ onAuthOpen, showToast }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [equippedCosmetics, setEquippedCosmetics] = useState([]);
  const [form, setForm] = useState(EMPTY_GRIDSTER_PROFILE);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
        const [savedProfile, savedEquippedCosmetics] = await Promise.all([
          fetchGridsterProfile(nextUser.id),
          getEquippedCosmeticsForUser(nextUser.id),
        ]);

        if (!active) {
          return;
        }

        setProfile(savedProfile);
        setEquippedCosmetics(savedEquippedCosmetics);
        setForm(profileToForm(savedProfile, nextUser));
        setEditing(!savedProfile);
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

function SavedProfileCard({ profile, equippedCosmetics = [], blingProfile: suppliedBlingProfile, initials, onEdit }) {
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

        <button type="button" className="profile-edit-button" onClick={onEdit}>
          Edit Profile
        </button>
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
