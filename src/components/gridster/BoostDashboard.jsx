import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { BOOST_STATUS_LABELS, fetchBoostPerformance, fetchMyBoosts } from "../../lib/gridsterBoosts";

function BoostRow({ boost }) {
  const [performance, setPerformance] = useState(null);
  const post = boost.gridster_posts;
  const isActive = boost.status === "active" && new Date(boost.ends_at) > new Date();

  useEffect(() => {
    let active = true;

    fetchBoostPerformance(boost.id)
      .then((data) => {
        if (active) setPerformance(data);
      })
      .catch((performanceError) => {
        console.error("Gridster boost dashboard: could not load performance", performanceError);
      });

    return () => {
      active = false;
    };
  }, [boost.id]);

  return (
    <div className="boost-dashboard-row">
      <div className="boost-dashboard-row-header">
        <strong>{post?.content?.slice(0, 60) || "Untitled post"}</strong>
        <span className={`boost-status-pill boost-status-${boost.status}`}>
          {BOOST_STATUS_LABELS[boost.status] || boost.status}
        </span>
      </div>
      <p className="boost-dashboard-meta">
        {boost.package_type.replace(/_/g, " ")} • {boost.bits_spent.toLocaleString()} Bling Bits
      </p>
      <p className="boost-dashboard-meta">
        {isActive ? "Ends" : "Ended"} {new Date(boost.ends_at).toLocaleString()}
      </p>
      {performance ? (
        <div className="boost-dashboard-stats">
          <span>{performance.impression} impressions</span>
          <span>{performance.click} clicks</span>
          <span>{performance.profile_click} profile clicks</span>
          <span>{performance.teleport_click} teleport clicks</span>
        </div>
      ) : null}
    </div>
  );
}

// Creator-facing "my boosts" view: active status, start/end,
// impressions/interactions, and completed history. Never shows
// another user's boosts (fetchMyBoosts is scoped server-side by the
// post_boosts owner-read RLS policy).
function BoostDashboard({ userId: userIdProp }) {
  const [userId, setUserId] = useState(userIdProp ?? null);
  const [authChecked, setAuthChecked] = useState(Boolean(userIdProp));
  const [boosts, setBoosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userIdProp) {
      return undefined;
    }

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUserId(data?.user?.id ?? null);
        setAuthChecked(true);
      }
    });

    return () => {
      active = false;
    };
  }, [userIdProp]);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    let active = true;

    fetchMyBoosts(userId)
      .then((data) => {
        if (active) setBoosts(data);
      })
      .catch((loadError) => {
        console.error("Gridster boost dashboard: could not load boosts", loadError);
        if (active) setError(loadError.message || "Could not load your boosts.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  if (!authChecked) {
    return <p className="groups-directory-message">Checking access...</p>;
  }

  if (!userId) {
    return <p className="groups-directory-message">Log in to see your boosts.</p>;
  }

  if (loading) {
    return <p className="groups-directory-message">Loading your boosts...</p>;
  }

  if (error) {
    return <p className="bling-depot-message bling-depot-error" role="alert">{error}</p>;
  }

  if (!boosts.length) {
    return <p className="groups-directory-message">You haven't boosted any posts yet.</p>;
  }

  return (
    <div className="boost-dashboard">
      {boosts.map((boost) => (
        <BoostRow key={boost.id} boost={boost} />
      ))}
    </div>
  );
}

export default BoostDashboard;
