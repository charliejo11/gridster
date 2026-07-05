import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { fetchGridsterProfile } from "../../lib/gridsterProfiles";
import {
  GRIDSTER_EVENT_TYPES,
  GRIDSTER_EVENT_TYPE_LABELS,
  GRIDSTER_MATURITY_RATINGS,
  GRIDSTER_MATURITY_RATING_LABELS,
  GRIDSTER_PLACE_CATEGORIES,
  GRIDSTER_PLACE_CATEGORY_LABELS,
  createGridsterEvent,
  createGridsterPlace,
} from "../../lib/gridsterPlaces";
import { createGridsterPost } from "../../lib/gridsterPosts";

const TABS = [
  { id: "general", label: "Post" },
  { id: "photo", label: "Photo" },
  { id: "event", label: "Event" },
  { id: "blog", label: "Blog" },
  { id: "store", label: "Store" },
  { id: "slurl", label: "SLURL" },
];

const EMPTY_POST_FORM = { content: "", photo_url: "", link_url: "", region_name: "", slurl: "", tags: "" };
const EMPTY_EVENT_FORM = {
  title: "",
  description: "",
  photo_url: "",
  slurl: "",
  region_name: "",
  event_type: "live_dj",
  when_label: "",
  maturity_rating: "general",
};
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

function GridsterComposerModal({ initialTab = "general", initialContent = "", onAuthOpen, onClose, onPosted, showToast }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [postForm, setPostForm] = useState({ ...EMPTY_POST_FORM, content: initialContent });
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [placeForm, setPlaceForm] = useState(EMPTY_PLACE_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) {
          return;
        }

        const nextUser = data?.user ?? null;
        setUser(nextUser);

        if (nextUser) {
          fetchGridsterProfile(nextUser.id)
            .then((profile) => {
              if (active) {
                setDisplayName(profile?.display_name || profile?.sl_username || "");
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const updatePostField = (field, value) => setPostForm((current) => ({ ...current, [field]: value }));
  const updateEventField = (field, value) => setEventForm((current) => ({ ...current, [field]: value }));
  const updatePlaceField = (field, value) => setPlaceForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (activeTab === "event") {
        await createGridsterEvent(user.id, eventForm);
        showToast?.("Event posted.");
      } else if (activeTab === "slurl") {
        await createGridsterPlace(user.id, placeForm);
        showToast?.("Place posted.");
      } else {
        await createGridsterPost(user.id, { ...postForm, post_type: activeTab, author_name: displayName });
        showToast?.("Posted.");
      }

      onPosted?.();
      onClose?.();
    } catch (submitError) {
      setError(submitError.message || "Could not post this.");
    } finally {
      setSubmitting(false);
    }
  };

  const isPostFamily = activeTab === "general" || activeTab === "photo" || activeTab === "blog" || activeTab === "store";

  return (
    <div className="gridster-composer-overlay" onClick={onClose}>
      <div
        className="gridster-composer-modal glass-card"
        role="dialog"
        aria-modal="true"
        aria-label="Create on Gridster"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="gridster-composer-header">
          <h3>Create</h3>
          <button type="button" className="gridster-composer-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="gridster-composer-tabs place-category-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error ? <p className="gridster-composer-error" role="alert">{error}</p> : null}

        <form className="gridster-composer-form place-post-form" onSubmit={handleSubmit}>
          {isPostFamily ? (
            <>
              <label>
                <span>{activeTab === "photo" ? "Caption" : "What's happening?"}</span>
                <textarea
                  value={postForm.content}
                  onChange={(event) => updatePostField("content", event.target.value)}
                  required={activeTab !== "photo"}
                />
              </label>

              <label>
                <span>Photo URL{activeTab === "photo" ? "" : " (optional)"}</span>
                <input
                  type="text"
                  value={postForm.photo_url}
                  onChange={(event) => updatePostField("photo_url", event.target.value)}
                  placeholder="https://..."
                  required={activeTab === "photo"}
                />
              </label>

              {activeTab === "blog" || activeTab === "store" ? (
                <label>
                  <span>Link URL (optional)</span>
                  <input
                    type="text"
                    value={postForm.link_url}
                    onChange={(event) => updatePostField("link_url", event.target.value)}
                    placeholder={activeTab === "store" ? "https://marketplace.secondlife.com/..." : "https://..."}
                  />
                </label>
              ) : null}

              {activeTab === "store" ? (
                <>
                  <label>
                    <span>Region Name</span>
                    <input
                      type="text"
                      value={postForm.region_name}
                      onChange={(event) => updatePostField("region_name", event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Teleport SLURL</span>
                    <input
                      type="text"
                      value={postForm.slurl}
                      onChange={(event) => updatePostField("slurl", event.target.value)}
                      placeholder="secondlife://Region/128/128/25"
                    />
                  </label>
                </>
              ) : null}

              <label>
                <span>Tags (optional)</span>
                <input
                  type="text"
                  value={postForm.tags}
                  onChange={(event) => updatePostField("tags", event.target.value)}
                  placeholder="Fashion, Nightlife, Photos"
                />
              </label>
            </>
          ) : null}

          {activeTab === "event" ? (
            <>
              <label>
                <span>Title</span>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(event) => updateEventField("title", event.target.value)}
                  required
                />
              </label>

              <label>
                <span>Description</span>
                <textarea
                  value={eventForm.description}
                  onChange={(event) => updateEventField("description", event.target.value)}
                />
              </label>

              <label>
                <span>Photo URL</span>
                <input
                  type="text"
                  value={eventForm.photo_url}
                  onChange={(event) => updateEventField("photo_url", event.target.value)}
                  placeholder="https://..."
                />
              </label>

              <label>
                <span>Teleport SLURL</span>
                <input
                  type="text"
                  value={eventForm.slurl}
                  onChange={(event) => updateEventField("slurl", event.target.value)}
                  placeholder="secondlife://Region/128/128/25"
                />
              </label>

              <label>
                <span>Region Name</span>
                <input
                  type="text"
                  value={eventForm.region_name}
                  onChange={(event) => updateEventField("region_name", event.target.value)}
                />
              </label>

              <label>
                <span>Event Type</span>
                <select value={eventForm.event_type} onChange={(event) => updateEventField("event_type", event.target.value)}>
                  {GRIDSTER_EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>{GRIDSTER_EVENT_TYPE_LABELS[type]}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>When</span>
                <input
                  type="text"
                  value={eventForm.when_label}
                  onChange={(event) => updateEventField("when_label", event.target.value)}
                  placeholder="Tonight 9PM SLT"
                />
              </label>

              <label>
                <span>Maturity Rating</span>
                <select
                  value={eventForm.maturity_rating}
                  onChange={(event) => updateEventField("maturity_rating", event.target.value)}
                >
                  {GRIDSTER_MATURITY_RATINGS.map((rating) => (
                    <option key={rating} value={rating}>{GRIDSTER_MATURITY_RATING_LABELS[rating]}</option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {activeTab === "slurl" ? (
            <>
              <label>
                <span>Title</span>
                <input
                  type="text"
                  value={placeForm.title}
                  onChange={(event) => updatePlaceField("title", event.target.value)}
                  required
                />
              </label>

              <label>
                <span>Description</span>
                <textarea
                  value={placeForm.description}
                  onChange={(event) => updatePlaceField("description", event.target.value)}
                />
              </label>

              <label>
                <span>Photo URL</span>
                <input
                  type="text"
                  value={placeForm.photo_url}
                  onChange={(event) => updatePlaceField("photo_url", event.target.value)}
                  placeholder="https://..."
                />
              </label>

              <label>
                <span>Teleport SLURL</span>
                <input
                  type="text"
                  value={placeForm.slurl}
                  onChange={(event) => updatePlaceField("slurl", event.target.value)}
                  placeholder="secondlife://Region/128/128/25"
                  required
                />
              </label>

              <label>
                <span>Region Name</span>
                <input
                  type="text"
                  value={placeForm.region_name}
                  onChange={(event) => updatePlaceField("region_name", event.target.value)}
                />
              </label>

              <label>
                <span>Category</span>
                <select value={placeForm.category} onChange={(event) => updatePlaceField("category", event.target.value)}>
                  {GRIDSTER_PLACE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{GRIDSTER_PLACE_CATEGORY_LABELS[category]}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Vibe Tags</span>
                <input
                  type="text"
                  value={placeForm.vibe_tags}
                  onChange={(event) => updatePlaceField("vibe_tags", event.target.value)}
                  placeholder="Gothic, Photos, Landmark"
                />
              </label>

              <label>
                <span>Maturity Rating</span>
                <select
                  value={placeForm.maturity_rating}
                  onChange={(event) => updatePlaceField("maturity_rating", event.target.value)}
                >
                  {GRIDSTER_MATURITY_RATINGS.map((rating) => (
                    <option key={rating} value={rating}>{GRIDSTER_MATURITY_RATING_LABELS[rating]}</option>
                  ))}
                </select>
              </label>

              <label className="place-open-now-field">
                <input
                  type="checkbox"
                  checked={placeForm.is_open_now}
                  onChange={(event) => updatePlaceField("is_open_now", event.target.checked)}
                />
                <span>Open right now</span>
              </label>
            </>
          ) : null}

          <div className="gridster-composer-actions place-post-form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GridsterComposerModal;
