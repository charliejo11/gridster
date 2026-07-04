import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { usePersistedGridsterFlag } from "../../lib/gridsterStorage";
import {
  GRIDSTER_EVENT_TYPES,
  GRIDSTER_EVENT_TYPE_LABELS,
  GRIDSTER_MATURITY_RATINGS,
  GRIDSTER_MATURITY_RATING_LABELS,
  createGridsterEvent,
  deleteGridsterEvent,
  fetchGridsterEvents,
  fetchGridsterPlaces,
} from "../../lib/gridsterPlaces";

const EMPTY_EVENT_FORM = {
  title: "",
  description: "",
  photo_url: "",
  slurl: "",
  region_name: "",
  event_type: "live_dj",
  when_label: "",
  maturity_rating: "general",
  place_id: "",
};

const EVENT_TYPE_TABS = [
  { id: "all", label: "All" },
  ...GRIDSTER_EVENT_TYPES.map((eventType) => ({
    id: eventType,
    label: GRIDSTER_EVENT_TYPE_LABELS[eventType],
  })),
];

function SaveEventButton({ eventId }) {
  const [saved, setSaved] = usePersistedGridsterFlag("savedEvents", eventId);

  return (
    <button
      type="button"
      className={saved ? "is-saved" : ""}
      onClick={() => setSaved((current) => !current)}
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}

function TonightInSL({ onAuthOpen, showToast }) {
  const [activeTab, setActiveTab] = useState("all");
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_EVENT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const refreshEvents = async () => {
    const nextEvents = await fetchGridsterEvents();
    setEvents(nextEvents || []);
    return nextEvents;
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
        const [nextEvents, nextPlaces] = await Promise.all([
          fetchGridsterEvents(),
          fetchGridsterPlaces(),
        ]);

        if (active) {
          setEvents(nextEvents || []);
          setPlaces(nextPlaces || []);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Could not load Tonight in Second Life.");
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

  const visibleEvents = useMemo(() => {
    if (activeTab === "all") {
      return events;
    }

    return events.filter((event) => event.event_type === activeTab);
  }, [events, activeTab]);

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

  const handlePlaceChange = (placeId) => {
    const selectedPlace = places.find((place) => place.id === placeId);

    setForm((current) => ({
      ...current,
      place_id: placeId,
      slurl: selectedPlace ? selectedPlace.slurl : current.slurl,
      region_name: selectedPlace ? selectedPlace.region_name : current.region_name,
    }));
  };

  const handleSubmitEvent = async (event) => {
    event.preventDefault();

    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      await createGridsterEvent(user.id, { ...form, place_id: form.place_id || null });
      await refreshEvents();
      setForm(EMPTY_EVENT_FORM);
      setShowForm(false);
      setMessage("Event posted.");
      showToast?.("Event posted.");
    } catch (submitError) {
      setError(submitError.message || "Could not post this event.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventItem) => {
    setBusyId(eventItem.id);
    setMessage("");
    setError("");

    try {
      await deleteGridsterEvent(eventItem.id, user.id);
      await refreshEvents();
      setMessage("Event removed.");
      showToast?.("Event removed.");
    } catch (deleteError) {
      setError(deleteError.message || "Could not remove this event.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="tonight-page">
      <article className="tonight-hero glass-card">
        <div className="tonight-hero-copy">
          <span>Tonight in Second Life</span>
          <h2>What's happening right now.</h2>
          <p>Live DJs, contests, roleplay events, new releases, and grand openings across the grid.</p>
        </div>
        <button type="button" className="tonight-post-button" onClick={handleOpenForm}>
          + Post an Event
        </button>
      </article>

      {error ? <p className="tonight-message tonight-error" role="alert">{error}</p> : null}
      {message ? <p className="tonight-message tonight-success">{message}</p> : null}

      {showForm ? (
        <form className="event-post-form glass-card" onSubmit={handleSubmitEvent}>
          <label>
            <span>Event Title</span>
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
            <span>Photo URL</span>
            <input
              type="text"
              value={form.photo_url}
              onChange={(event) => updateField("photo_url", event.target.value)}
              placeholder="https://..."
            />
          </label>

          <label>
            <span>When</span>
            <input
              type="text"
              value={form.when_label}
              onChange={(event) => updateField("when_label", event.target.value)}
              placeholder="Tonight 9PM SLT"
              required
            />
          </label>

          <label>
            <span>Event Type</span>
            <select value={form.event_type} onChange={(event) => updateField("event_type", event.target.value)}>
              {GRIDSTER_EVENT_TYPES.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {GRIDSTER_EVENT_TYPE_LABELS[eventType]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Linked Place</span>
            <select value={form.place_id} onChange={(event) => handlePlaceChange(event.target.value)}>
              <option value="">No linked place</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.title}
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

          <div className="event-post-form-actions">
            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Posting..." : "Post Event"}
            </button>
          </div>
        </form>
      ) : null}

      <section className="event-type-tabs">
        {EVENT_TYPE_TABS.map((tab) => (
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

      {loading ? <p className="tonight-message">Loading tonight's events...</p> : null}

      {!loading && visibleEvents.length === 0 ? (
        <p className="tonight-message">No events posted yet. Be the first to share what's happening tonight.</p>
      ) : null}

      <div className="tonight-grid">
        {visibleEvents.map((eventItem) => {
          const busy = busyId === eventItem.id;
          const isOwner = user?.id === eventItem.user_id;
          const linkedPlace = eventItem.gridster_places;

          return (
            <article className="discovery-event-card glass-card" key={eventItem.id}>
              <div className="event-card-photo">
                {eventItem.photo_url ? (
                  <img src={eventItem.photo_url} alt="" />
                ) : (
                  <span className="event-card-photo-fallback">
                    {GRIDSTER_EVENT_TYPE_LABELS[eventItem.event_type]?.charAt(0) ?? "?"}
                  </span>
                )}
              </div>

              <div className="event-card-body">
                <div className="event-card-meta">
                  <span className="event-type-pill">{GRIDSTER_EVENT_TYPE_LABELS[eventItem.event_type]}</span>
                  <span className="event-when">{eventItem.when_label}</span>
                </div>

                <h3>{eventItem.title}</h3>

                {linkedPlace ? (
                  <span className="event-place-link">📍 {linkedPlace.title}</span>
                ) : null}

                {eventItem.region_name ? <p className="event-region">{eventItem.region_name}</p> : null}
                {eventItem.description ? <p className="event-description">{eventItem.description}</p> : null}

                <span className="event-maturity-badge">
                  {GRIDSTER_MATURITY_RATING_LABELS[eventItem.maturity_rating]}
                </span>
              </div>

              <div className="event-card-actions">
                <button type="button" data-destination={eventItem.title} data-slurl={eventItem.slurl}>
                  Teleport
                </button>
                <SaveEventButton eventId={eventItem.id} />
                <button type="button" onClick={() => showToast?.("Sharing is coming soon.")}>Share</button>
                <button type="button" onClick={() => showToast?.("Reminders are coming soon.")}>Remind Me</button>
                {isOwner ? (
                  <button type="button" disabled={busy} onClick={() => handleDeleteEvent(eventItem)}>
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

export default TonightInSL;
