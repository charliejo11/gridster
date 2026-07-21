import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  GRIDSTER_MATURITY_RATINGS,
  GRIDSTER_MATURITY_RATING_LABELS,
  GRIDSTER_PLACE_CATEGORIES,
  GRIDSTER_PLACE_CATEGORY_LABELS,
  GRIDSTER_TELEPORT_STATUS_LABELS,
  createGridsterPlace,
  deleteGridsterPlace,
  fetchGridsterPlaces,
  reportBrokenTeleport,
} from "../../lib/gridsterPlaces";
import { uploadGridsterPostPhoto, validateGridsterPostPhoto } from "../../lib/gridsterMediaUploads";

const EMPTY_PLACE_FORM = {
  title: "",
  description: "",
  photo_url: "",
  slurl: "",
  region_name: "",
  category: "hangouts",
  vibe_tags: "",
  maturity_rating: "general",
  is_open_now: false,
};

const CATEGORY_TABS = [
  { id: "all", label: "All" },
  ...GRIDSTER_PLACE_CATEGORIES.map((category) => ({
    id: category,
    label: GRIDSTER_PLACE_CATEGORY_LABELS[category],
  })),
];

function TeleportDiscoveryFeed({ initialCategory, onAuthOpen, showToast }) {
  const [activeTab, setActiveTab] = useState(initialCategory || "all");
  const [user, setUser] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PLACE_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const refreshPlaces = async () => {
    const nextPlaces = await fetchGridsterPlaces();
    setPlaces(nextPlaces || []);
    return nextPlaces;
  };

  useEffect(() => {
    let active = true;

    async function load(nextUser) {
      if (!active) {
        return;
      }

      setUser(nextUser);
      setLoading(true);

      try {
        const nextPlaces = await fetchGridsterPlaces();

        if (active) {
          setPlaces(nextPlaces || []);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Could not load the Teleport Discovery Feed.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    supabase.auth
      .getUser()
      .then(({ data }) => load(data?.user ?? null))
      .catch((authError) => {
        if (!active) {
          return;
        }

        setError(authError.message || "Could not check your login session.");
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user ?? null);
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const visiblePlaces = useMemo(() => {
    if (activeTab === "all") {
      return places;
    }

    return places.filter((place) => place.category === activeTab);
  }, [places, activeTab]);

  const handleOpenForm = () => {
    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    setShowForm(true);
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePhotoFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !user) {
      return;
    }

    try {
      validateGridsterPostPhoto(file);
    } catch (validationError) {
      setError(validationError.message || "Please choose a valid image.");
      return;
    }

    setUploadingPhoto(true);
    setError("");

    try {
      const publicUrl = await uploadGridsterPostPhoto(user.id, file);
      updateField("photo_url", publicUrl);
    } catch (uploadError) {
      console.error("Gridster places: photo upload failed", uploadError);
      setError(uploadError.message || "Could not upload that image.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmitPlace = async (event) => {
    event.preventDefault();

    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      await createGridsterPlace(user.id, form);
      await refreshPlaces();
      setForm(EMPTY_PLACE_FORM);
      setShowForm(false);
      setMessage("Place posted.");
      showToast?.("Place posted.");
    } catch (submitError) {
      setError(submitError.message || "Could not post this place.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportBroken = async (place) => {
    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    setBusyId(place.id);
    setMessage("");
    setError("");

    try {
      await reportBrokenTeleport(place.id);
      await refreshPlaces();
      setMessage("Thanks — this place is now marked as reported broken.");
      showToast?.("Teleport reported as broken.");
    } catch (reportError) {
      setError(reportError.message || "Could not report this teleport.");
    } finally {
      setBusyId("");
    }
  };

  const handleDeletePlace = async (place) => {
    setBusyId(place.id);
    setMessage("");
    setError("");

    try {
      await deleteGridsterPlace(place.id, user.id);
      await refreshPlaces();
      setMessage("Place removed.");
      showToast?.("Place removed.");
    } catch (deleteError) {
      setError(deleteError.message || "Could not remove this place.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="places-page">
      <article className="places-hero glass-card">
        <div className="places-hero-copy">
          <span>Teleport Discovery Feed</span>
          <h2>Come hang out here.</h2>
          <p>Real Second Life places worth a teleport — clubs, beaches, RP sims, stores, and more, verified by the community.</p>
        </div>
        <button type="button" className="places-post-button" onClick={handleOpenForm}>
          + Post a Place
        </button>
      </article>

      {error ? <p className="places-message places-error" role="alert">{error}</p> : null}
      {message ? <p className="places-message places-success">{message}</p> : null}

      {showForm ? (
        <form className="place-post-form glass-card" onSubmit={handleSubmitPlace}>
          <label>
            <span>Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              required
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
            />
          </label>

          <div className="profile-field">
            <label>
              <span>Photo URL</span>
              <input
                type="text"
                value={form.photo_url}
                onChange={(event) => updateField("photo_url", event.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="profile-upload-button">
              {uploadingPhoto ? "Uploading..." : "Upload from Computer"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                disabled={uploadingPhoto}
                onChange={handlePhotoFileChange}
              />
            </label>
            <p className="profile-upload-hint">PNG, JPEG, WEBP, or GIF. Max 8MB.</p>
          </div>

          <label>
            <span>Teleport SLURL</span>
            <input
              type="text"
              value={form.slurl}
              onChange={(event) => updateField("slurl", event.target.value)}
              placeholder="secondlife://Region/128/128/25"
              required
            />
          </label>

          <label>
            <span>Region Name</span>
            <input
              type="text"
              value={form.region_name}
              onChange={(event) => updateField("region_name", event.target.value)}
            />
          </label>

          <label>
            <span>Category</span>
            <select value={form.category} onChange={(event) => updateField("category", event.target.value)}>
              {GRIDSTER_PLACE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {GRIDSTER_PLACE_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Vibe Tags</span>
            <input
              type="text"
              value={form.vibe_tags}
              onChange={(event) => updateField("vibe_tags", event.target.value)}
              placeholder="Gothic, Photos, Landmark"
            />
          </label>

          <label>
            <span>Maturity Rating</span>
            <select
              value={form.maturity_rating}
              onChange={(event) => updateField("maturity_rating", event.target.value)}
            >
              {GRIDSTER_MATURITY_RATINGS.map((rating) => (
                <option key={rating} value={rating}>
                  {GRIDSTER_MATURITY_RATING_LABELS[rating]}
                </option>
              ))}
            </select>
          </label>

          <label className="place-open-now-field">
            <input
              type="checkbox"
              checked={form.is_open_now}
              onChange={(event) => updateField("is_open_now", event.target.checked)}
            />
            <span>Open right now</span>
          </label>

          <div className="place-post-form-actions">
            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" disabled={submitting || uploadingPhoto}>
              {submitting ? "Posting..." : "Post Place"}
            </button>
          </div>
        </form>
      ) : null}

      <section className="place-category-tabs">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {loading ? <p className="places-message">Loading places...</p> : null}

      {!loading && visiblePlaces.length === 0 ? (
        <p className="places-message">
          No places posted yet.{" "}
          <button type="button" className="places-post-button" onClick={handleOpenForm}>
            + Post a Place
          </button>
        </p>
      ) : null}

      <div className="places-grid">
        {visiblePlaces.map((place) => {
          const busy = busyId === place.id;
          const isOwner = user?.id === place.user_id;

          return (
            <article className="discovery-place-card glass-card" key={place.id}>
              <div className="place-card-photo">
                {place.photo_url ? (
                  <img src={place.photo_url} alt="" />
                ) : (
                  <span className="place-card-photo-fallback">
                    {GRIDSTER_PLACE_CATEGORY_LABELS[place.category]?.charAt(0) ?? "?"}
                  </span>
                )}
                {place.is_open_now ? <span className="place-open-badge">Open Now</span> : null}
              </div>

              <div className="place-card-body">
                <div className="place-card-meta">
                  <span className="place-category-pill">{GRIDSTER_PLACE_CATEGORY_LABELS[place.category]}</span>
                  <span className={`place-status-pill status-${place.teleport_status}`}>
                    {GRIDSTER_TELEPORT_STATUS_LABELS[place.teleport_status]}
                  </span>
                </div>

                <h3>{place.title}</h3>
                {place.region_name ? <p className="place-region">{place.region_name}</p> : null}
                {place.description ? <p className="place-description">{place.description}</p> : null}

                {place.vibe_tags?.length ? (
                  <div className="place-tag-list">
                    {place.vibe_tags.map((tag) => (
                      <span className="place-tag" key={tag}>{tag}</span>
                    ))}
                  </div>
                ) : null}

                <span className="place-maturity-badge">{GRIDSTER_MATURITY_RATING_LABELS[place.maturity_rating]}</span>
              </div>

              <div className="place-card-actions">
                <button type="button" data-destination={place.title} data-slurl={place.slurl}>
                  Teleport
                </button>
                <button type="button" disabled={busy} onClick={() => handleReportBroken(place)}>
                  Report Broken
                </button>
                {isOwner ? (
                  <button type="button" disabled={busy} onClick={() => handleDeletePlace(place)}>
                    Delete
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default TeleportDiscoveryFeed;
