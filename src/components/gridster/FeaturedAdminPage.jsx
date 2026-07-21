import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  GRIDSTER_PLACE_CATEGORY_LABELS,
  checkFeatureEligibility,
  computeDisplayFeatureStatus,
  createFeaturedPlace,
  deleteFeaturedPlace,
  expireFeaturedPlace,
  fetchAllFeaturedPlacesForAdmin,
  fetchIsCurrentUserAdmin,
  fetchNominationsForAdmin,
  getPlaceTypeLabel,
  reviewNomination,
  searchApprovedPlaces,
} from "../../lib/gridsterFeatured";
import { fetchProfilesByUserIds } from "../../lib/gridsterProfiles";
import SectionHeader from "./SectionHeader";

function toDatetimeLocalValue(date) {
  const pad = (value) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultFeatureForm() {
  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    place_id: "",
    place_title: "",
    starts_at: toDatetimeLocalValue(now),
    ends_at: toDatetimeLocalValue(weekOut),
    priority: 0,
    feature_reason: "",
    is_sponsored: false,
    image_url: "",
  };
}

function FeaturedAdminPage({ showToast }) {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [featuredList, setFeaturedList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [nominations, setNominations] = useState([]);
  const [nominatorProfiles, setNominatorProfiles] = useState(new Map());
  const [loadingNominations, setLoadingNominations] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [form, setForm] = useState(defaultFeatureForm());
  const [submitting, setSubmitting] = useState(false);
  const [formWarning, setFormWarning] = useState(null);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let active = true;

    supabase.auth
      .getUser()
      .then(async ({ data }) => {
        const userId = data?.user?.id ?? null;

        if (!active) {
          return;
        }

        setCurrentUserId(userId);

        try {
          const admin = await fetchIsCurrentUserAdmin();

          if (active) {
            setIsAdmin(admin);
          }
        } catch (adminCheckError) {
          console.error("Gridster featured admin: could not verify admin access", adminCheckError);
        } finally {
          if (active) {
            setCheckingAccess(false);
          }
        }
      })
      .catch(() => {
        if (active) {
          setCheckingAccess(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const refreshFeaturedList = () => {
    setLoadingList(true);

    fetchAllFeaturedPlacesForAdmin()
      .then((data) => setFeaturedList(data))
      .catch((loadError) => {
        console.error("Gridster featured admin: could not load featured places", loadError);
        showToast?.(loadError.message || "Could not load featured places.");
      })
      .finally(() => setLoadingList(false));
  };

  const refreshNominations = () => {
    setLoadingNominations(true);

    fetchNominationsForAdmin("pending")
      .then(async (data) => {
        setNominations(data);

        const profileMap = await fetchProfilesByUserIds(data.map((row) => row.nominated_by));
        setNominatorProfiles(profileMap);
      })
      .catch((loadError) => {
        console.error("Gridster featured admin: could not load nominations", loadError);
      })
      .finally(() => setLoadingNominations(false));
  };

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    refreshFeaturedList();
    refreshNominations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }

    let active = true;

    searchApprovedPlaces(searchQuery)
      .then((data) => {
        if (active) {
          setSearchResults(data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [searchQuery, isAdmin]);

  const updateFormField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const selectPlace = (place) => {
    updateFormField("place_id", place.id);
    updateFormField("place_title", place.title);
    setSearchQuery("");
    setSearchResults([]);
    setFormWarning(null);
  };

  const submitFeature = async (event, { override = false } = {}) => {
    event?.preventDefault?.();

    if (!form.place_id) {
      showToast?.("Search and select a place first.");
      return;
    }

    setSubmitting(true);
    setFormWarning(null);

    try {
      await createFeaturedPlace(
        currentUserId,
        {
          place_id: form.place_id,
          starts_at: form.starts_at,
          ends_at: form.ends_at,
          priority: form.priority,
          feature_reason: form.feature_reason,
          is_sponsored: form.is_sponsored,
          image_url: form.image_url,
        },
        { override }
      );

      showToast?.("Place featured.");
      setForm(defaultFeatureForm());
      refreshFeaturedList();
    } catch (submitError) {
      if (submitError.code === "ACTIVE_CONFLICT" || submitError.code === "COOLDOWN_ACTIVE") {
        setFormWarning(submitError.message);
      } else {
        console.error("Gridster featured admin: could not create featured placement", submitError);
        showToast?.(submitError.message || "Could not feature this place.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpire = async (id) => {
    setBusyId(id);

    try {
      await expireFeaturedPlace(id);
      showToast?.("Feature expired.");
      refreshFeaturedList();
    } catch (expireError) {
      console.error("Gridster featured admin: could not expire feature", expireError);
      showToast?.(expireError.message || "Could not expire this feature.");
    } finally {
      setBusyId("");
    }
  };

  const handleDelete = async (id) => {
    setBusyId(id);

    try {
      await deleteFeaturedPlace(id);
      showToast?.("Feature removed.");
      refreshFeaturedList();
    } catch (deleteError) {
      console.error("Gridster featured admin: could not delete feature", deleteError);
      showToast?.(deleteError.message || "Could not remove this feature.");
    } finally {
      setBusyId("");
    }
  };

  const handleReviewNomination = async (id, status) => {
    setBusyId(id);

    try {
      await reviewNomination(id, status, currentUserId);
      showToast?.(status === "approved" ? "Nomination approved." : "Nomination rejected.");
      refreshNominations();
    } catch (reviewError) {
      console.error("Gridster featured admin: could not review nomination", reviewError);
      showToast?.(reviewError.message || "Could not review this nomination.");
    } finally {
      setBusyId("");
    }
  };

  if (checkingAccess) {
    return <p className="groups-directory-message">Checking access...</p>;
  }

  if (!isAdmin) {
    return <p className="groups-directory-message">You don't have access to this page.</p>;
  }

  return (
    <section className="featured-admin-page">
      <article className="featured-admin-card glass-card">
        <SectionHeader eyebrow="Admin" title="Feature a Place" />

        <form className="place-post-form" onSubmit={submitFeature}>
          <label>
            <span>Search Approved Places</span>
            <input
              type="text"
              value={form.place_id ? form.place_title : searchQuery}
              onChange={(event) => {
                updateFormField("place_id", "");
                updateFormField("place_title", "");
                setSearchQuery(event.target.value);
              }}
              placeholder="Search by name..."
            />
          </label>

          {!form.place_id && searchResults.length > 0 ? (
            <ul className="featured-admin-search-results">
              {searchResults.map((place) => (
                <li key={place.id}>
                  <button type="button" onClick={() => selectPlace(place)}>
                    {place.title} <small>({getPlaceTypeLabel(place.category)} • {GRIDSTER_PLACE_CATEGORY_LABELS[place.category] || place.category})</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {form.place_id ? (
            <p className="featured-admin-selected-place">
              Selected: <strong>{form.place_title}</strong>{" "}
              <button type="button" onClick={() => selectPlace({ id: "", title: "" })}>Change</button>
            </p>
          ) : null}

          <label>
            <span>Starts</span>
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={(event) => updateFormField("starts_at", event.target.value)}
            />
          </label>

          <label>
            <span>Ends</span>
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(event) => updateFormField("ends_at", event.target.value)}
            />
          </label>

          <label>
            <span>Priority (higher shows first)</span>
            <input
              type="number"
              value={form.priority}
              onChange={(event) => updateFormField("priority", event.target.value)}
            />
          </label>

          <label>
            <span>Internal Feature Reason (not shown publicly)</span>
            <textarea
              value={form.feature_reason}
              onChange={(event) => updateFormField("feature_reason", event.target.value)}
              placeholder="Why is this place being featured?"
            />
          </label>

          <label>
            <span>Image Override URL (optional - falls back to the place's own photo)</span>
            <input
              type="text"
              value={form.image_url}
              onChange={(event) => updateFormField("image_url", event.target.value)}
              placeholder="https://..."
            />
          </label>

          <label className="place-open-now-field">
            <input
              type="checkbox"
              checked={form.is_sponsored}
              onChange={(event) => updateFormField("is_sponsored", event.target.checked)}
            />
            <span>Sponsored (paid placement - excluded from the editorial sidebar)</span>
          </label>

          {formWarning ? (
            <div className="featured-admin-warning">
              <p>{formWarning}</p>
              <button type="button" onClick={(event) => submitFeature(event, { override: true })} disabled={submitting}>
                Feature Anyway
              </button>
            </div>
          ) : null}

          <div className="place-post-form-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? "Featuring..." : "Feature This Place"}
            </button>
          </div>
        </form>
      </article>

      <article className="featured-admin-card glass-card">
        <SectionHeader eyebrow="Admin" title="Current & Upcoming Featured Places" />

        {loadingList ? <p className="groups-directory-message">Loading...</p> : null}

        {!loadingList && featuredList.length === 0 ? (
          <p className="groups-directory-message">No featured placements yet.</p>
        ) : null}

        <ul className="featured-admin-list">
          {featuredList.map((row) => {
            const place = row.gridster_places;
            const displayStatus = computeDisplayFeatureStatus(row);

            return (
              <li key={row.id} className={`featured-admin-row status-${displayStatus}`}>
                <div>
                  <strong>{place?.title || "(place deleted)"}</strong>
                  {row.is_sponsored ? <span className="featured-sponsored-badge">Sponsored</span> : null}
                  <small>
                    {displayStatus} • priority {row.priority} • {new Date(row.starts_at).toLocaleDateString()} – {new Date(row.ends_at).toLocaleDateString()}
                  </small>
                  {row.feature_reason ? <small className="featured-admin-reason">{row.feature_reason}</small> : null}
                </div>
                <div className="featured-admin-row-actions">
                  {displayStatus !== "expired" ? (
                    <button type="button" disabled={busyId === row.id} onClick={() => handleExpire(row.id)}>
                      Expire
                    </button>
                  ) : null}
                  <button type="button" disabled={busyId === row.id} onClick={() => handleDelete(row.id)}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </article>

      <article className="featured-admin-card glass-card">
        <SectionHeader eyebrow="Admin" title="Pending Nominations" />

        {loadingNominations ? <p className="groups-directory-message">Loading...</p> : null}

        {!loadingNominations && nominations.length === 0 ? (
          <p className="groups-directory-message">No pending nominations.</p>
        ) : null}

        <ul className="featured-admin-list">
          {nominations.map((nomination) => {
            const nominator = nominatorProfiles.get(nomination.nominated_by);

            return (
              <li key={nomination.id} className="featured-admin-row">
                <div>
                  <strong>{nomination.gridster_places?.title || "(place deleted)"}</strong>
                  <small>
                    Nominated by {nominator?.display_name || nominator?.sl_username || "a resident"}
                  </small>
                  {nomination.reason ? <small className="featured-admin-reason">{nomination.reason}</small> : null}
                </div>
                <div className="featured-admin-row-actions">
                  <button type="button" disabled={busyId === nomination.id} onClick={() => handleReviewNomination(nomination.id, "approved")}>
                    Approve
                  </button>
                  <button type="button" disabled={busyId === nomination.id} onClick={() => handleReviewNomination(nomination.id, "rejected")}>
                    Reject
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </article>
    </section>
  );
}

export default FeaturedAdminPage;
