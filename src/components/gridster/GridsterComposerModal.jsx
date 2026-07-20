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
import { uploadGridsterPostPhoto, validateGridsterPostPhoto } from "../../lib/gridsterMediaUploads";

const TABS = [
  { id: "general", label: "Post" },
  { id: "photo", label: "Photo" },
  { id: "event", label: "Event" },
  { id: "blog", label: "Blog" },
  { id: "store", label: "Store" },
  { id: "slurl", label: "SLURL" },
];

const EMPTY_POST_FORM = {
  content: "",
  photo_url: "",
  link_url: "",
  region_name: "",
  slurl: "",
  tags: "",
  maturity_rating: "general",
};
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

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

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const updatePostField = (field, value) => setPostForm((current) => ({ ...current, [field]: value }));
  const updateEventField = (field, value) => setEventForm((current) => ({ ...current, [field]: value }));
  const updatePlaceField = (field, value) => setPlaceForm((current) => ({ ...current, [field]: value }));

  const handlePhotoFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !user) {
      return;
    }

    setUploadingPhoto(true);
    setError("");

    try {
      const publicUrl = await uploadGridsterPostPhoto(user.id, file);

      if (activeTab === "event") {
        updateEventField("photo_url", publicUrl);
      } else if (activeTab === "slurl") {
        updatePlaceField("photo_url", publicUrl);
      } else {
        updatePostField("photo_url", publicUrl);
      }
    } catch (uploadError) {
      console.error("Gridster composer: photo upload failed", uploadError);
      setError(uploadError.message || "Could not upload that image.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const clearSelectedPhoto = () => {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    setPhotoFile(null);
    setPhotoPreviewUrl("");
  };

  const handleSelectPhotoFile = (file) => {
    if (!file) {
      return;
    }

    try {
      validateGridsterPostPhoto(file);
    } catch (validationError) {
      setError(validationError.message || "Please choose a valid image.");
      return;
    }

    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    setError("");
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const handlePhotoInputChange = (event) => {
    handleSelectPhotoFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handlePhotoDragOver = (event) => {
    event.preventDefault();
    setIsDraggingPhoto(true);
  };

  const handlePhotoDragLeave = (event) => {
    event.preventDefault();
    setIsDraggingPhoto(false);
  };

  const handlePhotoDrop = (event) => {
    event.preventDefault();
    setIsDraggingPhoto(false);
    handleSelectPhotoFile(event.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    if (activeTab === "photo" && !photoFile) {
      setError("Please choose a photo to upload.");
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
      } else if (activeTab === "photo") {
        const photoUrl = await uploadGridsterPostPhoto(user.id, photoFile);
        await createGridsterPost(user.id, { ...postForm, photo_url: photoUrl, post_type: activeTab, author_name: displayName });
        showToast?.("Posted.");
      } else {
        await createGridsterPost(user.id, { ...postForm, post_type: activeTab, author_name: displayName });
        showToast?.("Posted.");
      }

      clearSelectedPhoto();
      onPosted?.();
      onClose?.();
    } catch (submitError) {
      console.error("Gridster composer: post submission failed", submitError);
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

              {activeTab === "photo" ? (
                <div className="gridster-photo-dropzone-field">
                  <span>Photo</span>
                  <div
                    className={[
                      "gridster-photo-dropzone",
                      isDraggingPhoto ? "dragging" : "",
                      photoPreviewUrl ? "has-preview" : "",
                    ].filter(Boolean).join(" ")}
                    onDragOver={handlePhotoDragOver}
                    onDragEnter={handlePhotoDragOver}
                    onDragLeave={handlePhotoDragLeave}
                    onDrop={handlePhotoDrop}
                  >
                    {photoPreviewUrl ? (
                      <div className="gridster-photo-preview">
                        <img src={photoPreviewUrl} alt="Selected preview" />
                        <button type="button" className="gridster-photo-remove" onClick={clearSelectedPhoto}>
                          Remove Photo
                        </button>
                      </div>
                    ) : (
                      <label className="gridster-photo-dropzone-label">
                        <span className="gridster-photo-dropzone-icon" aria-hidden="true">📷</span>
                        <span className="gridster-photo-dropzone-text">
                          Drag and drop a photo here, or click to browse
                        </span>
                        <span className="gridster-photo-dropzone-hint">PNG, JPEG, WEBP, or GIF. Max 8MB.</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          hidden
                          onChange={handlePhotoInputChange}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <div className="profile-field">
                  <label>
                    <span>Photo URL (optional)</span>
                    <input
                      type="text"
                      value={postForm.photo_url}
                      onChange={(event) => updatePostField("photo_url", event.target.value)}
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
              )}

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

              <label>
                <span>Maturity Rating</span>
                <select
                  value={postForm.maturity_rating}
                  onChange={(event) => updatePostField("maturity_rating", event.target.value)}
                >
                  {GRIDSTER_MATURITY_RATINGS.map((rating) => (
                    <option key={rating} value={rating}>{GRIDSTER_MATURITY_RATING_LABELS[rating]}</option>
                  ))}
                </select>
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

              <div className="profile-field">
                <label>
                  <span>Photo URL</span>
                  <input
                    type="text"
                    value={eventForm.photo_url}
                    onChange={(event) => updateEventField("photo_url", event.target.value)}
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

              <div className="profile-field">
                <label>
                  <span>Photo URL</span>
                  <input
                    type="text"
                    value={placeForm.photo_url}
                    onChange={(event) => updatePlaceField("photo_url", event.target.value)}
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
            <button type="submit" disabled={submitting || uploadingPhoto}>
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GridsterComposerModal;
