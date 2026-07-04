import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { fetchGridsterProfile } from "../../lib/gridsterProfiles";
import {
  GRIDSTER_BOOKING_EXPERIENCE_LEVELS,
  GRIDSTER_BOOKING_EXPERIENCE_LEVEL_LABELS,
  GRIDSTER_BOOKING_GENRES,
  GRIDSTER_BOOKING_GENRE_LABELS,
  GRIDSTER_BOOKING_PAY_TYPES,
  GRIDSTER_BOOKING_PAY_TYPE_LABELS,
  GRIDSTER_BOOKING_POST_TYPES,
  GRIDSTER_BOOKING_POST_TYPE_LABELS,
  GRIDSTER_BOOKING_ROLE_TYPES,
  GRIDSTER_BOOKING_ROLE_TYPE_LABELS,
  GRIDSTER_BOOKING_TIMEZONES,
  GRIDSTER_BOOKING_TIMEZONE_LABELS,
  GRIDSTER_MATURITY_RATING_LABELS,
  GRIDSTER_MATURITY_RATINGS,
  createGridsterBookingListing,
  deleteGridsterBookingListing,
  fetchGridsterBookingListings,
  updateGridsterBookingListing,
} from "../../lib/gridsterBookings";

const EMPTY_LISTING_FORM = {
  post_type: "venue_seeking",
  role_type: "dj",
  title: "",
  description: "",
  genre: "mixed_variety",
  region_name: "",
  slurl: "",
  timezone: "slt_pacific",
  pay_type: "negotiable",
  pay_details: "",
  voice_required: false,
  maturity_rating: "general",
  experience_level: "any",
  contact_name: "",
  contact_note: "",
};

const DEFAULT_FILTERS = {
  genre: "all",
  timezone: "all",
  pay_type: "all",
  voice_required: "all",
  maturity_rating: "all",
  experience_level: "all",
  status: "open",
};

const POST_TYPE_TABS = [
  { id: "all", label: "All" },
  ...GRIDSTER_BOOKING_POST_TYPES.map((postType) => ({
    id: postType,
    label: GRIDSTER_BOOKING_POST_TYPE_LABELS[postType],
  })),
];

const ROLE_TYPE_TABS = [
  { id: "all", label: "All Roles" },
  ...GRIDSTER_BOOKING_ROLE_TYPES.map((roleType) => ({
    id: roleType,
    label: GRIDSTER_BOOKING_ROLE_TYPE_LABELS[roleType],
  })),
];

function formatPayLine(listing) {
  const payLabel = GRIDSTER_BOOKING_PAY_TYPE_LABELS[listing.pay_type];
  return listing.pay_details ? `${payLabel} · ${listing.pay_details}` : payLabel;
}

function BookingBoard({ onAuthOpen, showToast }) {
  const [activePostType, setActivePostType] = useState("all");
  const [activeRoleType, setActiveRoleType] = useState("all");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_LISTING_FORM);
  const [submitting, setSubmitting] = useState(false);

  const refreshListings = async () => {
    const nextListings = await fetchGridsterBookingListings();
    setListings(nextListings || []);
    return nextListings;
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
        const nextListings = await fetchGridsterBookingListings();

        if (active) {
          setListings(nextListings || []);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Could not load the Booking Board.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }

      if (nextUser) {
        fetchGridsterProfile(nextUser.id)
          .then((profile) => {
            if (active && profile) {
              setForm((current) => ({
                ...current,
                contact_name: current.contact_name || profile.display_name || profile.sl_username || "",
              }));
            }
          })
          .catch(() => {});
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

  const visibleListings = useMemo(() => {
    return listings.filter((listing) => {
      if (activePostType !== "all" && listing.post_type !== activePostType) return false;
      if (activeRoleType !== "all" && listing.role_type !== activeRoleType) return false;
      if (filters.genre !== "all" && listing.genre !== filters.genre) return false;
      if (filters.timezone !== "all" && listing.timezone !== filters.timezone) return false;
      if (filters.pay_type !== "all" && listing.pay_type !== filters.pay_type) return false;
      if (filters.voice_required === "required" && !listing.voice_required) return false;
      if (filters.voice_required === "not_required" && listing.voice_required) return false;
      if (filters.maturity_rating !== "all" && listing.maturity_rating !== filters.maturity_rating) return false;
      if (filters.experience_level !== "all" && listing.experience_level !== filters.experience_level) return false;
      if (filters.status !== "all" && listing.status !== filters.status) return false;
      return true;
    });
  }, [listings, activePostType, activeRoleType, filters]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

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

  const handleSubmitListing = async (event) => {
    event.preventDefault();

    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      await createGridsterBookingListing(user.id, form);
      await refreshListings();
      setForm((current) => ({ ...EMPTY_LISTING_FORM, contact_name: current.contact_name }));
      setShowForm(false);
      setMessage("Listing posted.");
      showToast?.("Listing posted.");
    } catch (submitError) {
      setError(submitError.message || "Could not post this listing.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (listing) => {
    setBusyId(listing.id);
    setMessage("");
    setError("");

    try {
      const nextStatus = listing.status === "open" ? "filled" : "open";
      await updateGridsterBookingListing(listing.id, user.id, { status: nextStatus });
      await refreshListings();
      showToast?.(nextStatus === "filled" ? "Listing marked as filled." : "Listing reopened.");
    } catch (toggleError) {
      setError(toggleError.message || "Could not update this listing.");
    } finally {
      setBusyId("");
    }
  };

  const handleDeleteListing = async (listing) => {
    setBusyId(listing.id);
    setMessage("");
    setError("");

    try {
      await deleteGridsterBookingListing(listing.id, user.id);
      await refreshListings();
      showToast?.("Listing removed.");
    } catch (deleteError) {
      setError(deleteError.message || "Could not remove this listing.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="booking-page">
      <article className="booking-hero glass-card">
        <div className="booking-hero-copy">
          <span>Booking Board</span>
          <h2>Get hired. Get booked.</h2>
          <p>Clubs looking to hire DJs, hosts, dancers, and managers — and talent ready to work tonight.</p>
        </div>
        <button type="button" className="booking-post-button" onClick={handleOpenForm}>
          + Post a Listing
        </button>
      </article>

      {error ? <p className="booking-message booking-error" role="alert">{error}</p> : null}
      {message ? <p className="booking-message booking-success">{message}</p> : null}

      {showForm ? (
        <form className="booking-post-form glass-card" onSubmit={handleSubmitListing}>
          <label>
            <span>Post Type</span>
            <select value={form.post_type} onChange={(event) => updateField("post_type", event.target.value)}>
              {GRIDSTER_BOOKING_POST_TYPES.map((postType) => (
                <option key={postType} value={postType}>
                  {GRIDSTER_BOOKING_POST_TYPE_LABELS[postType]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Role</span>
            <select value={form.role_type} onChange={(event) => updateField("role_type", event.target.value)}>
              {GRIDSTER_BOOKING_ROLE_TYPES.map((roleType) => (
                <option key={roleType} value={roleType}>
                  {GRIDSTER_BOOKING_ROLE_TYPE_LABELS[roleType]}
                </option>
              ))}
            </select>
          </label>

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

          <label>
            <span>Genre</span>
            <select value={form.genre} onChange={(event) => updateField("genre", event.target.value)}>
              {GRIDSTER_BOOKING_GENRES.map((genre) => (
                <option key={genre} value={genre}>
                  {GRIDSTER_BOOKING_GENRE_LABELS[genre]}
                </option>
              ))}
            </select>
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
            <span>Teleport SLURL (optional)</span>
            <input
              type="text"
              value={form.slurl}
              onChange={(event) => updateField("slurl", event.target.value)}
              placeholder="secondlife://Region/128/128/25"
            />
          </label>

          <label>
            <span>Timezone</span>
            <select value={form.timezone} onChange={(event) => updateField("timezone", event.target.value)}>
              {GRIDSTER_BOOKING_TIMEZONES.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {GRIDSTER_BOOKING_TIMEZONE_LABELS[timezone]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Pay Type</span>
            <select value={form.pay_type} onChange={(event) => updateField("pay_type", event.target.value)}>
              {GRIDSTER_BOOKING_PAY_TYPES.map((payType) => (
                <option key={payType} value={payType}>
                  {GRIDSTER_BOOKING_PAY_TYPE_LABELS[payType]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Pay Details (optional)</span>
            <input
              type="text"
              value={form.pay_details}
              onChange={(event) => updateField("pay_details", event.target.value)}
              placeholder="L$500/set + tips"
            />
          </label>

          <label className="booking-voice-field">
            <input
              type="checkbox"
              checked={form.voice_required}
              onChange={(event) => updateField("voice_required", event.target.checked)}
            />
            <span>Voice required</span>
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

          <label>
            <span>Experience Level</span>
            <select
              value={form.experience_level}
              onChange={(event) => updateField("experience_level", event.target.value)}
            >
              {GRIDSTER_BOOKING_EXPERIENCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {GRIDSTER_BOOKING_EXPERIENCE_LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Contact Name</span>
            <input
              type="text"
              value={form.contact_name}
              onChange={(event) => updateField("contact_name", event.target.value)}
              placeholder="Your SL name"
            />
          </label>

          <label>
            <span>Contact Note</span>
            <input
              type="text"
              value={form.contact_note}
              onChange={(event) => updateField("contact_note", event.target.value)}
              placeholder="IM me in-world or Discord @handle"
            />
          </label>

          <div className="booking-post-form-actions">
            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Posting..." : "Post Listing"}
            </button>
          </div>
        </form>
      ) : null}

      <section className="booking-post-type-tabs">
        {POST_TYPE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activePostType === tab.id ? "active" : ""}
            onClick={() => setActivePostType(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      <section className="booking-role-type-tabs">
        {ROLE_TYPE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeRoleType === tab.id ? "active" : ""}
            onClick={() => setActiveRoleType(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      <section className="booking-filter-bar">
        <label>
          <span>Genre</span>
          <select value={filters.genre} onChange={(event) => updateFilter("genre", event.target.value)}>
            <option value="all">Any</option>
            {GRIDSTER_BOOKING_GENRES.map((genre) => (
              <option key={genre} value={genre}>{GRIDSTER_BOOKING_GENRE_LABELS[genre]}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Timezone</span>
          <select value={filters.timezone} onChange={(event) => updateFilter("timezone", event.target.value)}>
            <option value="all">Any</option>
            {GRIDSTER_BOOKING_TIMEZONES.map((timezone) => (
              <option key={timezone} value={timezone}>{GRIDSTER_BOOKING_TIMEZONE_LABELS[timezone]}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Pay</span>
          <select value={filters.pay_type} onChange={(event) => updateFilter("pay_type", event.target.value)}>
            <option value="all">Any</option>
            {GRIDSTER_BOOKING_PAY_TYPES.map((payType) => (
              <option key={payType} value={payType}>{GRIDSTER_BOOKING_PAY_TYPE_LABELS[payType]}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Voice</span>
          <select value={filters.voice_required} onChange={(event) => updateFilter("voice_required", event.target.value)}>
            <option value="all">Any</option>
            <option value="required">Required</option>
            <option value="not_required">Not Required</option>
          </select>
        </label>

        <label>
          <span>Maturity</span>
          <select value={filters.maturity_rating} onChange={(event) => updateFilter("maturity_rating", event.target.value)}>
            <option value="all">Any</option>
            {GRIDSTER_MATURITY_RATINGS.map((rating) => (
              <option key={rating} value={rating}>{GRIDSTER_MATURITY_RATING_LABELS[rating]}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Experience</span>
          <select value={filters.experience_level} onChange={(event) => updateFilter("experience_level", event.target.value)}>
            <option value="all">Any</option>
            {GRIDSTER_BOOKING_EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>{GRIDSTER_BOOKING_EXPERIENCE_LEVEL_LABELS[level]}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Status</span>
          <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="filled">Filled</option>
          </select>
        </label>

        <button type="button" className="booking-filter-reset" onClick={resetFilters}>
          Reset Filters
        </button>
      </section>

      {loading ? <p className="booking-message">Loading listings...</p> : null}

      {!loading && visibleListings.length === 0 ? (
        <p className="booking-message">No listings match these filters yet.</p>
      ) : null}

      <div className="booking-grid">
        {visibleListings.map((listing) => {
          const busy = busyId === listing.id;
          const isOwner = user?.id === listing.user_id;

          return (
            <article
              className={listing.status === "filled" ? "booking-card glass-card booking-card-filled" : "booking-card glass-card"}
              key={listing.id}
            >
              <div className="booking-card-headline">
                <span className="booking-post-type-pill">{GRIDSTER_BOOKING_POST_TYPE_LABELS[listing.post_type]}</span>
                <span className="booking-role-type-pill">{GRIDSTER_BOOKING_ROLE_TYPE_LABELS[listing.role_type]}</span>
              </div>

              <h3>{listing.title}</h3>

              <div className="booking-tag-row">
                <span className="booking-tag-pill">{GRIDSTER_BOOKING_GENRE_LABELS[listing.genre]}</span>
                <span className="booking-tag-pill">{GRIDSTER_BOOKING_TIMEZONE_LABELS[listing.timezone]}</span>
                <span className="booking-tag-pill">{GRIDSTER_BOOKING_EXPERIENCE_LEVEL_LABELS[listing.experience_level]}</span>
              </div>

              {listing.description ? <p className="booking-description">{listing.description}</p> : null}

              <div className="booking-fine-print">
                <span>{formatPayLine(listing)}</span>
                <span className="booking-maturity-badge">{GRIDSTER_MATURITY_RATING_LABELS[listing.maturity_rating]}</span>
              </div>

              {listing.voice_required ? <span className="booking-voice-badge">🎙 Voice Required</span> : null}

              {listing.contact_name ? (
                <div className="booking-contact">
                  <strong>{listing.contact_name}</strong>
                  {listing.contact_note ? <span>{listing.contact_note}</span> : null}
                </div>
              ) : null}

              <div className="booking-card-actions">
                {listing.slurl ? (
                  <button type="button" data-destination={listing.title} data-slurl={listing.slurl}>
                    Teleport
                  </button>
                ) : null}
                {isOwner ? (
                  <button type="button" disabled={busy} onClick={() => handleToggleStatus(listing)}>
                    {listing.status === "open" ? "Mark Filled" : "Reopen"}
                  </button>
                ) : null}
                {isOwner ? (
                  <button type="button" disabled={busy} onClick={() => handleDeleteListing(listing)}>
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

export default BookingBoard;
