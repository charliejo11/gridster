import { useEffect, useState } from "react";
import {
  GRIDSTER_MATURITY_RATING_LABELS,
  GRIDSTER_MATURITY_RATINGS,
  GRIDSTER_PAGE_TYPES,
  GRIDSTER_PAGE_TYPE_LABELS,
  addPageHighlight,
  createCreatorPage,
  fetchCreatorPage,
  fetchPageHighlights,
  removePageHighlight,
  updateCreatorPage,
} from "../../lib/gridsterCreatorPages";

const EMPTY_FORM = {
  page_type: "store",
  name: "",
  tagline: "",
  bio: "",
  avatar_url: "",
  banner_url: "",
  region_name: "",
  slurl: "",
  website_url: "",
  marketplace_url: "",
  maturity_rating: "general",
};

const EMPTY_HIGHLIGHT_FORM = { title: "", description: "", photo_url: "", link_url: "" };

function CreatorPageEditor({ pageId, userId, onSaved, onCancel, showToast }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [highlights, setHighlights] = useState([]);
  const [highlightForm, setHighlightForm] = useState(EMPTY_HIGHLIGHT_FORM);
  const [loading, setLoading] = useState(Boolean(pageId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    if (!pageId) {
      setForm(EMPTY_FORM);
      setHighlights([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    Promise.all([fetchCreatorPage(pageId), fetchPageHighlights(pageId)])
      .then(([page, nextHighlights]) => {
        if (!active) {
          return;
        }

        if (page) {
          setForm({
            page_type: page.page_type,
            name: page.name || "",
            tagline: page.tagline || "",
            bio: page.bio || "",
            avatar_url: page.avatar_url || "",
            banner_url: page.banner_url || "",
            region_name: page.region_name || "",
            slurl: page.slurl || "",
            website_url: page.website_url || "",
            marketplace_url: page.marketplace_url || "",
            maturity_rating: page.maturity_rating || "general",
          });
        }

        setHighlights(nextHighlights || []);
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message || "Could not load this page.");
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
  }, [pageId]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateHighlightField = (field, value) => {
    setHighlightForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Give your page a name.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const saved = pageId
        ? await updateCreatorPage(pageId, userId, form)
        : await createCreatorPage(userId, form);

      showToast?.(pageId ? "Page updated." : "Page created.");
      onSaved?.(saved.id);
    } catch (saveError) {
      setError(saveError.message || "Could not save this page.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddHighlight = async (event) => {
    event.preventDefault();

    if (!pageId) {
      showToast?.("Save your page before adding highlights.");
      return;
    }

    if (!highlightForm.title.trim()) {
      return;
    }

    try {
      const saved = await addPageHighlight(pageId, highlightForm, highlights.length);
      setHighlights((current) => [...current, saved]);
      setHighlightForm(EMPTY_HIGHLIGHT_FORM);
    } catch (highlightError) {
      showToast?.(highlightError.message || "Could not add this highlight.");
    }
  };

  const handleRemoveHighlight = async (highlightId) => {
    try {
      await removePageHighlight(highlightId);
      setHighlights((current) => current.filter((highlight) => highlight.id !== highlightId));
    } catch (removeError) {
      showToast?.(removeError.message || "Could not remove this highlight.");
    }
  };

  if (loading) {
    return <p className="groups-directory-message">Loading...</p>;
  }

  return (
    <form className="place-post-form glass-card creator-page-editor" onSubmit={handleSave}>
      <div className="profile-setup-heading">
        <span>{pageId ? "Edit Page" : "New Page"}</span>
        <h3>{pageId ? "Update your page" : "Create a page"}</h3>
        <p>A real, ownable page for your store, DJ persona, club, venue, or creator brand.</p>
      </div>

      {error ? <p className="groups-directory-message groups-directory-error" role="alert">{error}</p> : null}

      <label>
        <span>Page Type</span>
        <select value={form.page_type} onChange={(event) => updateField("page_type", event.target.value)}>
          {GRIDSTER_PAGE_TYPES.map((type) => (
            <option key={type} value={type}>{GRIDSTER_PAGE_TYPE_LABELS[type]}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Name</span>
        <input
          type="text"
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="Valentina Boutique"
          required
        />
      </label>

      <label>
        <span>Tagline</span>
        <input
          type="text"
          value={form.tagline}
          onChange={(event) => updateField("tagline", event.target.value)}
          placeholder="Fashion, nightlife looks, and statement pieces."
        />
      </label>

      <label>
        <span>Bio</span>
        <textarea value={form.bio} onChange={(event) => updateField("bio", event.target.value)} />
      </label>

      <label>
        <span>Avatar URL</span>
        <input
          type="text"
          value={form.avatar_url}
          onChange={(event) => updateField("avatar_url", event.target.value)}
          placeholder="https://..."
        />
      </label>

      <label>
        <span>Banner URL</span>
        <input
          type="text"
          value={form.banner_url}
          onChange={(event) => updateField("banner_url", event.target.value)}
          placeholder="https://..."
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
        <span>Teleport SLURL</span>
        <input
          type="text"
          value={form.slurl}
          onChange={(event) => updateField("slurl", event.target.value)}
          placeholder="secondlife://Region/128/128/25"
        />
      </label>

      <label>
        <span>Website</span>
        <input
          type="text"
          value={form.website_url}
          onChange={(event) => updateField("website_url", event.target.value)}
          placeholder="https://..."
        />
      </label>

      <label>
        <span>Marketplace Link</span>
        <input
          type="text"
          value={form.marketplace_url}
          onChange={(event) => updateField("marketplace_url", event.target.value)}
          placeholder="https://marketplace.secondlife.com/stores/..."
        />
      </label>

      <label>
        <span>Maturity Rating</span>
        <select value={form.maturity_rating} onChange={(event) => updateField("maturity_rating", event.target.value)}>
          {GRIDSTER_MATURITY_RATINGS.map((rating) => (
            <option key={rating} value={rating}>{GRIDSTER_MATURITY_RATING_LABELS[rating]}</option>
          ))}
        </select>
      </label>

      <div className="place-post-form-actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : pageId ? "Save Changes" : "Create Page"}
        </button>
      </div>

      {pageId ? (
        <div className="creator-page-highlights-editor">
          <h4>Highlights</h4>

          {highlights.length ? (
            <ul className="creator-page-highlights-editor-list">
              {highlights.map((highlight) => (
                <li key={highlight.id}>
                  <span>{highlight.title}</span>
                  <button type="button" onClick={() => handleRemoveHighlight(highlight.id)}>Remove</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="groups-directory-message">No highlights yet.</p>
          )}

          <div className="creator-page-highlight-add-row">
            <input
              type="text"
              value={highlightForm.title}
              onChange={(event) => updateHighlightField("title", event.target.value)}
              placeholder="Highlight title"
            />
            <input
              type="text"
              value={highlightForm.description}
              onChange={(event) => updateHighlightField("description", event.target.value)}
              placeholder="Short description"
            />
            <input
              type="text"
              value={highlightForm.photo_url}
              onChange={(event) => updateHighlightField("photo_url", event.target.value)}
              placeholder="Photo URL (optional)"
            />
            <input
              type="text"
              value={highlightForm.link_url}
              onChange={(event) => updateHighlightField("link_url", event.target.value)}
              placeholder="Link URL (optional)"
            />
            <button type="button" onClick={handleAddHighlight}>Add Highlight</button>
          </div>
        </div>
      ) : (
        <p className="groups-directory-message">Save your page first, then you can add highlights.</p>
      )}
    </form>
  );
}

export default CreatorPageEditor;
