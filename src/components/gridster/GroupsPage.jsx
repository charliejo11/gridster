import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { fetchGridsterProfile } from "../../lib/gridsterProfiles";
import {
  GRIDSTER_GROUP_CATEGORIES,
  GRIDSTER_GROUP_CATEGORY_LABELS,
  GRIDSTER_MATURITY_RATINGS,
  GRIDSTER_MATURITY_RATING_LABELS,
  createGroup,
  fetchGroupMembership,
  fetchGroups,
  joinGroup,
  leaveGroup,
} from "../../lib/gridsterGroups";
import TeleportStatusChip from "./TeleportStatusChip";

const EMPTY_GROUP_FORM = {
  name: "",
  description: "",
  category: "clubs",
  region_name: "",
  slurl: "",
  photo_url: "",
  maturity_rating: "general",
};

const CATEGORY_TABS = [
  { id: "all", label: "All" },
  ...GRIDSTER_GROUP_CATEGORIES.map((category) => ({
    id: category,
    label: GRIDSTER_GROUP_CATEGORY_LABELS[category],
  })),
];

function GroupsPage({ onOpenGroup, onAuthOpen, showToast }) {
  const [activeTab, setActiveTab] = useState("all");
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_GROUP_FORM);
  const [submitting, setSubmitting] = useState(false);

  const refreshGroups = async () => {
    const nextGroups = await fetchGroups();
    setGroups(nextGroups || []);
    return nextGroups;
  };

  const refreshMemberships = async (nextUser, groupList) => {
    if (!nextUser) {
      setMemberships(new Set());
      return;
    }

    const checks = await Promise.all(
      (groupList || []).map((group) =>
        fetchGroupMembership(group.id, nextUser.id).then((isMember) => [group.id, isMember])
      )
    );

    setMemberships(new Set(checks.filter(([, isMember]) => isMember).map(([groupId]) => groupId)));
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
        const nextGroups = await refreshGroups();

        if (active) {
          await refreshMemberships(nextUser, nextGroups);
        }

        if (nextUser && active) {
          const profile = await fetchGridsterProfile(nextUser.id);
          if (active) {
            setDisplayName(profile?.display_name || profile?.sl_username || "");
          }
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Could not load Groups.");
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

  const visibleGroups = useMemo(() => {
    if (activeTab === "all") {
      return groups;
    }

    return groups.filter((group) => group.category === activeTab);
  }, [groups, activeTab]);

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

  const handleSubmitGroup = async (event) => {
    event.preventDefault();

    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const newGroup = await createGroup(user.id, form);
      const nextGroups = await refreshGroups();
      await refreshMemberships(user, nextGroups);
      setForm(EMPTY_GROUP_FORM);
      setShowForm(false);
      setMessage("Group created.");
      showToast?.("Group created.");
      return newGroup;
    } catch (submitError) {
      setError(submitError.message || "Could not create this group.");
    } finally {
      setSubmitting(false);
    }

    return undefined;
  };

  const handleToggleMembership = async (group) => {
    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    setBusyId(group.id);

    try {
      if (memberships.has(group.id)) {
        await leaveGroup(group.id, user.id);
        showToast?.(`Left ${group.name}.`);
      } else {
        await joinGroup(group.id, user.id, displayName);
        showToast?.(`Joined ${group.name}.`);
      }

      const nextGroups = await refreshGroups();
      await refreshMemberships(user, nextGroups);
    } catch (toggleError) {
      showToast?.(toggleError.message || "Could not update your membership.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="groups-directory-page">
      <article className="groups-directory-hero glass-card">
        <div className="groups-directory-hero-copy">
          <span>Gridster Groups</span>
          <h2>Find your people.</h2>
          <p>Clubs, stores, RP sims, fandoms, and creator crews — communities built by residents, for residents.</p>
        </div>
        <button type="button" className="groups-directory-create-button" onClick={handleOpenForm}>
          + Create Group
        </button>
      </article>

      {error ? <p className="groups-directory-message groups-directory-error" role="alert">{error}</p> : null}
      {message ? <p className="groups-directory-message groups-directory-success">{message}</p> : null}

      {showForm ? (
        <form className="place-post-form glass-card" onSubmit={handleSubmitGroup}>
          <label>
            <span>Group Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
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
            <span>Category</span>
            <select value={form.category} onChange={(event) => updateField("category", event.target.value)}>
              {GRIDSTER_GROUP_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {GRIDSTER_GROUP_CATEGORY_LABELS[category]}
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
            <span>Banner Photo URL (optional)</span>
            <input
              type="text"
              value={form.photo_url}
              onChange={(event) => updateField("photo_url", event.target.value)}
              placeholder="https://..."
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

          <div className="place-post-form-actions">
            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      ) : null}

      <section className="groups-category-tabs">
        {CATEGORY_TABS.map((tab) => (
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

      {loading ? <p className="groups-directory-message">Loading groups...</p> : null}

      {!loading && visibleGroups.length === 0 ? (
        <p className="groups-directory-message">No groups yet in this category. Be the first to start one.</p>
      ) : null}

      <div className="groups-directory-grid">
        {visibleGroups.map((group) => {
          const busy = busyId === group.id;
          const isMember = memberships.has(group.id);

          return (
            <article className="group-directory-card glass-card" key={group.id}>
              <div className="group-directory-photo">
                {group.photo_url ? (
                  <img src={group.photo_url} alt="" />
                ) : (
                  <span className="group-directory-photo-fallback">{group.name.charAt(0)}</span>
                )}
              </div>

              <div className="group-directory-body">
                <div className="group-directory-meta">
                  <span className="group-category-pill">{GRIDSTER_GROUP_CATEGORY_LABELS[group.category]}</span>
                  <span className="group-maturity-badge">{GRIDSTER_MATURITY_RATING_LABELS[group.maturity_rating]}</span>
                </div>

                <button type="button" className="group-directory-title-button" onClick={() => onOpenGroup?.(group.id)}>
                  {group.name}
                </button>

                {group.description ? <p className="group-directory-description">{group.description}</p> : null}
                <small className="group-directory-member-count">{group.member_count} members</small>
              </div>

              <div className="group-directory-actions">
                <button type="button" disabled={busy} onClick={() => handleToggleMembership(group)}>
                  {isMember ? "Joined" : "Join"}
                </button>
                {group.slurl ? (
                  <button type="button" data-destination={group.name} data-slurl={group.slurl}>
                    Teleport
                  </button>
                ) : null}
                <TeleportStatusChip slurl={group.slurl} destinationName={group.name} showToast={showToast} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default GroupsPage;
