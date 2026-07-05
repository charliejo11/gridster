import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { GRIDSTER_PAGE_TYPE_LABELS, fetchMyCreatorPages } from "../../lib/gridsterCreatorPages";
import CreatorPageEditor from "./CreatorPageEditor";

function MyCreatorPagesPage({ initialEditPageId, onOpenCreatorPage, onAuthOpen, showToast }) {
  const [user, setUser] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(initialEditPageId ? "edit" : "list");
  const [editingPageId, setEditingPageId] = useState(initialEditPageId || null);

  const loadPages = (userId) => {
    if (!userId) {
      setPages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetchMyCreatorPages(userId)
      .then((data) => setPages(data || []))
      .catch((loadError) => showToast?.(loadError.message || "Could not load your pages."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) {
        return;
      }

      const nextUser = data?.user ?? null;
      setUser(nextUser);
      loadPages(nextUser?.id);
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaved = (pageId) => {
    setMode("list");
    setEditingPageId(null);
    loadPages(user?.id);
    onOpenCreatorPage?.(pageId);
  };

  if (!user) {
    return (
      <article className="profile-setup-empty glass-card">
        <span>Creator Pages</span>
        <h3>Log in to create your page</h3>
        <p>Your Creator Page is tied to your account so only you can edit it.</p>
        <button type="button" onClick={onAuthOpen}>Log In or Sign Up</button>
      </article>
    );
  }

  if (mode === "create") {
    return (
      <CreatorPageEditor
        userId={user.id}
        onSaved={handleSaved}
        onCancel={() => setMode("list")}
        showToast={showToast}
      />
    );
  }

  if (mode === "edit") {
    return (
      <CreatorPageEditor
        pageId={editingPageId}
        userId={user.id}
        onSaved={handleSaved}
        onCancel={() => setMode("list")}
        showToast={showToast}
      />
    );
  }

  return (
    <section className="my-creator-pages">
      <article className="groups-directory-hero glass-card">
        <div className="groups-directory-hero-copy">
          <span>My Pages</span>
          <h2>Your stores, DJ pages, clubs, and venues.</h2>
          <p>Real pages tied to your account. Create one for every side of what you do on the grid.</p>
        </div>
        <button type="button" className="groups-directory-create-button" onClick={() => setMode("create")}>
          + Create a Page
        </button>
      </article>

      {loading ? <p className="groups-directory-message">Loading your pages...</p> : null}

      {!loading && pages.length === 0 ? (
        <p className="groups-directory-message">You haven't created a page yet.</p>
      ) : null}

      <div className="groups-directory-grid">
        {pages.map((page) => (
          <article className="group-directory-card glass-card" key={page.id}>
            <div className="group-directory-photo">
              {page.avatar_url ? <img src={page.avatar_url} alt="" /> : <span className="group-directory-photo-fallback">{page.name.charAt(0)}</span>}
            </div>

            <div className="group-directory-body">
              <strong>{page.name}</strong>
              <span className="group-category-pill">{GRIDSTER_PAGE_TYPE_LABELS[page.page_type] || page.page_type}</span>
            </div>

            <div className="group-directory-actions">
              <button type="button" onClick={() => onOpenCreatorPage?.(page.id)}>View</button>
              <button
                type="button"
                onClick={() => {
                  setEditingPageId(page.id);
                  setMode("edit");
                }}
              >
                Edit
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default MyCreatorPagesPage;
