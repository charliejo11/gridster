import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  GRIDSTER_PAGE_TYPE_LABELS,
  fetchCreatorPage,
  fetchPageHighlights,
} from "../../lib/gridsterCreatorPages";
import TeleportStatusChip from "./TeleportStatusChip";

function getInitials(page) {
  const source = page?.name || "Page";
  const words = source.replace(/[^a-z0-9\s]/gi, " ").trim().split(/\s+/);
  const initials = words.length > 1 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2);
  return initials.toUpperCase();
}

function compactUrl(url) {
  return String(url || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function CreatorPageDetail({ pageId, onEditPage, showToast }) {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const nextPage = await fetchCreatorPage(pageId);

        if (!active) {
          return;
        }

        setPage(nextPage);

        fetchPageHighlights(pageId)
          .then((nextHighlights) => {
            if (active) {
              setHighlights(nextHighlights || []);
            }
          })
          .catch(() => {});
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Could not load this page.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data?.user ?? null);
      }
    }).catch(() => {});

    if (pageId) {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [pageId]);

  if (loading) {
    return <p className="groups-directory-message">Loading page...</p>;
  }

  if (error) {
    return <p className="groups-directory-message groups-directory-error" role="alert">{error}</p>;
  }

  if (!page) {
    return <p className="groups-directory-message">This page doesn't exist.</p>;
  }

  const isOwner = user?.id === page.owner_user_id;
  const links = [
    ["Website", page.website_url],
    ["Marketplace", page.marketplace_url],
  ].filter(([, url]) => Boolean(url));
  const bannerStyle = page.banner_url
    ? { backgroundImage: `linear-gradient(135deg, rgba(10, 8, 24, 0.24), rgba(5, 6, 13, 0.62)), url("${page.banner_url}")` }
    : undefined;

  return (
    <section className="creator-page-detail">
      <article className="resident-profile-card glass-card">
        <div className="resident-profile-banner" style={bannerStyle}></div>

        <div className="resident-profile-body">
          <div className="resident-profile-avatar">
            {page.avatar_url ? <img src={page.avatar_url} alt="" /> : <span>{getInitials(page)}</span>}
          </div>

          <div className="resident-profile-copy">
            <div className="resident-profile-name-row">
              <h2>{page.name}</h2>
              {isOwner ? (
                <button type="button" className="profile-edit-button" onClick={() => onEditPage?.(page.id)}>
                  Edit Page
                </button>
              ) : null}
            </div>
            <strong>{GRIDSTER_PAGE_TYPE_LABELS[page.page_type] || page.page_type}</strong>
            {page.tagline ? <span className="creator-page-tagline">{page.tagline}</span> : null}
            {page.bio ? <p>{page.bio}</p> : null}
          </div>
        </div>

        <div className="creator-page-actions">
          {page.slurl ? (
            <button type="button" data-destination={page.name} data-slurl={page.slurl}>
              Teleport
            </button>
          ) : null}
          <TeleportStatusChip slurl={page.slurl} destinationName={page.name} showToast={showToast} />
        </div>

        {links.length ? (
          <div className="profile-setup-links">
            {links.map(([label, url]) => (
              <a href={url} target="_blank" rel="noreferrer" key={label}>
                <span>{label}</span>
                {compactUrl(url)}
              </a>
            ))}
          </div>
        ) : null}
      </article>

      {highlights.length ? (
        <section className="creator-page-highlights glass-card">
          <h3>Highlights</h3>
          <div className="creator-page-highlights-grid">
            {highlights.map((highlight) => (
              <article className="creator-page-highlight-card" key={highlight.id}>
                {highlight.photo_url ? (
                  <div className="creator-page-highlight-photo">
                    <img src={highlight.photo_url} alt="" />
                  </div>
                ) : null}
                <div className="creator-page-highlight-body">
                  <strong>{highlight.title}</strong>
                  {highlight.description ? <p>{highlight.description}</p> : null}
                  {highlight.link_url ? (
                    <a href={highlight.link_url} target="_blank" rel="noreferrer">
                      View
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

export default CreatorPageDetail;
