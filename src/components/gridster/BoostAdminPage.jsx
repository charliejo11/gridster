import { useEffect, useState } from "react";
import { fetchIsCurrentUserAdmin } from "../../lib/gridsterFeatured";
import { BOOST_STATUS_LABELS, adminCancelBoost, adminRefundBoost, fetchAllBoostsForAdmin } from "../../lib/gridsterBoosts";
import SectionHeader from "./SectionHeader";

// Admin-only boost review: refund or cancel a boost. Refunds credit
// Bling Bits back to the creator and are meant for platform-error /
// incorrect-moderation cases; cancels stop a boost with no refund,
// matching the "no automatic refund unless policy says otherwise" rule.
function BoostAdminPage({ showToast }) {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [boosts, setBoosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let active = true;

    fetchIsCurrentUserAdmin()
      .then((admin) => {
        if (active) setIsAdmin(admin);
      })
      .finally(() => {
        if (active) setCheckingAccess(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const fetchBoosts = () => {
    return fetchAllBoostsForAdmin()
      .then((data) => setBoosts(data))
      .catch((loadError) => {
        console.error("Gridster boost admin: could not load boosts", loadError);
        showToast?.(loadError.message || "Could not load boosts.");
      })
      .finally(() => setLoading(false));
  };

  const loadBoosts = () => {
    setLoading(true);
    fetchBoosts();
  };

  useEffect(() => {
    if (isAdmin) {
      fetchBoosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (checkingAccess) {
    return <p className="groups-directory-message">Checking access...</p>;
  }

  if (!isAdmin) {
    return <p className="groups-directory-message">This page is only available to Gridster admins.</p>;
  }

  const handleRefund = async (boost) => {
    if (!window.confirm(`Refund ${boost.bits_spent.toLocaleString()} Bling Bits for this boost?`)) {
      return;
    }

    setBusyId(boost.id);

    try {
      await adminRefundBoost(boost.id, "Admin refund");
      showToast?.("Boost refunded.");
      loadBoosts();
    } catch (refundError) {
      console.error("Gridster boost admin: refund failed", refundError);
      showToast?.(refundError.message || "Could not refund this boost.");
    } finally {
      setBusyId("");
    }
  };

  const handleCancel = async (boost) => {
    if (!window.confirm("Cancel this boost? No Bling Bits will be refunded.")) {
      return;
    }

    setBusyId(boost.id);

    try {
      await adminCancelBoost(boost.id, "Admin cancelled");
      showToast?.("Boost cancelled.");
      loadBoosts();
    } catch (cancelError) {
      console.error("Gridster boost admin: cancel failed", cancelError);
      showToast?.(cancelError.message || "Could not cancel this boost.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="boost-admin-page">
      <SectionHeader eyebrow="Admin" title="Boost Review" />

      {loading ? (
        <p className="groups-directory-message">Loading boosts...</p>
      ) : (
        <div className="boost-admin-list">
          {boosts.map((boost) => (
            <div className="boost-admin-row" key={boost.id}>
              <div>
                <strong>{boost.gridster_posts?.content?.slice(0, 60) || "Untitled post"}</strong>
                <p className="boost-dashboard-meta">
                  {boost.package_type.replace(/_/g, " ")} • {boost.bits_spent.toLocaleString()} Bling Bits •{" "}
                  <span className={`boost-status-pill boost-status-${boost.status}`}>
                    {BOOST_STATUS_LABELS[boost.status] || boost.status}
                  </span>
                </p>
              </div>
              <div className="boost-admin-actions">
                <button
                  type="button"
                  disabled={busyId === boost.id || boost.status === "refunded"}
                  onClick={() => handleCancel(boost)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busyId === boost.id || boost.status === "refunded"}
                  onClick={() => handleRefund(boost)}
                >
                  Refund
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BoostAdminPage;
