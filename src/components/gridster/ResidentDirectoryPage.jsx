import { useMemo, useState, useEffect } from "react";
import {
  GRIDSTER_AVAILABLE_FOR_TAGS,
  GRIDSTER_AVAILABLE_FOR_LABELS,
  fetchResidentDirectory,
} from "../../lib/gridsterProfiles";

const TAG_TABS = [
  { id: "all", label: "All" },
  ...GRIDSTER_AVAILABLE_FOR_TAGS.map((tag) => ({ id: tag, label: GRIDSTER_AVAILABLE_FOR_LABELS[tag] })),
];

function getInitials(profile) {
  const source = profile.display_name || profile.sl_username || "Resident";
  const words = source.replace(/[^a-z0-9\s]/gi, " ").trim().split(/\s+/);
  const initials = words.length > 1 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2);
  return initials.toUpperCase();
}

function ResidentDirectoryPage({ onOpenResidentProfile, showToast }) {
  const [activeTag, setActiveTag] = useState("all");
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetchResidentDirectory()
      .then((data) => {
        if (active) {
          setResidents(data || []);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message || "Could not load the Resident Directory.");
          showToast?.(loadError.message || "Could not load the Resident Directory.");
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

  const visibleResidents = useMemo(() => {
    if (activeTag === "all") {
      return residents;
    }

    return residents.filter((resident) => resident.available_for?.includes(activeTag));
  }, [residents, activeTag]);

  return (
    <section className="groups-directory-page">
      <article className="groups-directory-hero glass-card">
        <div className="groups-directory-hero-copy">
          <span>Resident Directory</span>
          <h2>Find residents by what they do.</h2>
          <p>Browse real Gridster profiles by what they're available for — DJs, hosts, bloggers, and more.</p>
        </div>
      </article>

      {error ? <p className="groups-directory-message groups-directory-error" role="alert">{error}</p> : null}

      <section className="groups-category-tabs">
        {TAG_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTag === tab.id ? "active" : ""}
            onClick={() => setActiveTag(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {loading ? <p className="groups-directory-message">Loading residents...</p> : null}

      {!loading && visibleResidents.length === 0 ? (
        <p className="groups-directory-message">No residents match this tag yet.</p>
      ) : null}

      <div className="groups-directory-grid">
        {visibleResidents.map((resident) => (
          <article className="group-directory-card glass-card" key={resident.user_id}>
            <div className="group-directory-photo">
              {resident.avatar_url ? (
                <img src={resident.avatar_url} alt="" />
              ) : (
                <span className="group-directory-photo-fallback">{getInitials(resident)}</span>
              )}
            </div>

            <div className="group-directory-body">
              <button
                type="button"
                className="group-directory-title-button"
                onClick={() => onOpenResidentProfile?.(resident.user_id)}
              >
                {resident.display_name}
              </button>
              <span className="group-category-pill">{resident.creator_type}</span>

              {resident.available_for?.length ? (
                <div className="resident-available-for">
                  {resident.available_for.map((tag) => (
                    <span className="resident-available-for-pill" key={tag}>
                      {GRIDSTER_AVAILABLE_FOR_LABELS[tag] || tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ResidentDirectoryPage;
