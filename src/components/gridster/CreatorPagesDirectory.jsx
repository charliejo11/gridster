import { useEffect, useMemo, useState } from "react";
import {
  GRIDSTER_PAGE_TYPES,
  GRIDSTER_PAGE_TYPE_LABELS,
  fetchCreatorPagesDirectory,
} from "../../lib/gridsterCreatorPages";

const TYPE_TABS = [
  { id: "all", label: "All" },
  ...GRIDSTER_PAGE_TYPES.map((type) => ({ id: type, label: GRIDSTER_PAGE_TYPE_LABELS[type] })),
];

function getInitials(page) {
  const source = page.name || "Page";
  const words = source.replace(/[^a-z0-9\s]/gi, " ").trim().split(/\s+/);
  const initials = words.length > 1 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2);
  return initials.toUpperCase();
}

function CreatorPagesDirectory({ onOpenCreatorPage, showToast }) {
  const [activeType, setActiveType] = useState("all");
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetchCreatorPagesDirectory()
      .then((data) => {
        if (active) {
          setPages(data || []);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message || "Could not load Creator Pages.");
          showToast?.(loadError.message || "Could not load Creator Pages.");
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
  }, [showToast]);

  const visiblePages = useMemo(() => {
    if (activeType === "all") {
      return pages;
    }

    return pages.filter((page) => page.page_type === activeType);
  }, [pages, activeType]);

  return (
    <section className="groups-directory-page">
      <article className="groups-directory-hero glass-card">
        <div className="groups-directory-hero-copy">
          <span>Creator Pages</span>
          <h2>Browse real stores, DJs, bloggers, clubs, and venues.</h2>
          <p>Real branded pages owned by residents — not communities, just their own page to show off what they do.</p>
        </div>
      </article>

      {error ? <p className="groups-directory-message groups-directory-error" role="alert">{error}</p> : null}

      <section className="groups-category-tabs">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeType === tab.id ? "active" : ""}
            onClick={() => setActiveType(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {loading ? <p className="groups-directory-message">Loading pages...</p> : null}

      {!loading && visiblePages.length === 0 ? (
        <p className="groups-directory-message">No pages here yet.</p>
      ) : null}

      <div className="groups-directory-grid">
        {visiblePages.map((page) => (
          <article className="group-directory-card glass-card" key={page.id}>
            <div className="group-directory-photo">
              {page.avatar_url ? (
                <img src={page.avatar_url} alt="" />
              ) : (
                <span className="group-directory-photo-fallback">{getInitials(page)}</span>
              )}
            </div>

            <div className="group-directory-body">
              <button
                type="button"
                className="group-directory-title-button"
                onClick={() => onOpenCreatorPage?.(page.id)}
              >
                {page.name}
              </button>
              <span className="group-category-pill">{GRIDSTER_PAGE_TYPE_LABELS[page.page_type] || page.page_type}</span>
              {page.tagline ? <p>{page.tagline}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default CreatorPagesDirectory;
