import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { fetchBoostPackages, getEventPushEligibility, purchasePostBoost } from "../../lib/gridsterBoosts";
import { getBlingBalanceSummary } from "../../lib/blingDepot";

function formatDuration(pkg) {
  if (pkg.placement_type === "event_push") {
    return "until the linked event begins";
  }

  return `${pkg.duration_hours} hour${pkg.duration_hours === 1 ? "" : "s"}`;
}

// "Boost Post" confirmation dialog. The server (boost_packages table
// + purchase_post_boost RPC) is the only source of truth for price -
// this component only ever displays what it fetched, it never
// invents or edits a cost. An error keeps the dialog open with the
// failure shown; only a real success closes it.
function BoostPostDialog({ post, onClose, onBoosted, showToast }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [linkedEvent, setLinkedEvent] = useState(null);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const [pkgs, summary] = await Promise.all([fetchBoostPackages(), getBlingBalanceSummary()]);

      if (!active) return;

      setPackages(pkgs);
      setBalance(summary.balance);
      setSelectedSlug(pkgs[0]?.slug ?? null);

      if (post?.post_type === "event" && post?.linked_event_id) {
        const { data } = await supabase
          .from("gridster_events")
          .select("id, is_approved, starts_at")
          .eq("id", post.linked_event_id)
          .maybeSingle();

        if (active) {
          setLinkedEvent(data || null);
        }
      }
    }

    load()
      .catch((loadError) => {
        console.error("Gridster boost dialog: could not load packages", loadError);
        if (active) setError(loadError.message || "Could not load boost packages.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [post]);

  const selectedPackage = packages.find((pkg) => pkg.slug === selectedSlug);
  const eventPushEligibility = getEventPushEligibility(post, linkedEvent);

  const isPackageDisabled = (pkg) => pkg.placement_type === "event_push" && !eventPushEligibility.eligible;

  const handleConfirm = async () => {
    if (!selectedPackage || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await purchasePostBoost(post.id, selectedPackage.slug);
      setSuccess(`${selectedPackage.name} activated for this post.`);
      showToast?.(`Boosted with Bling Bits: ${selectedPackage.name}.`);
      onBoosted?.();
      onClose?.();
    } catch (purchaseError) {
      console.error("Gridster boost dialog: purchase failed", purchaseError);
      setError(purchaseError.message || "Could not boost this post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gridster-composer-overlay" onClick={onClose}>
      <div
        className="gridster-composer-modal glass-card boost-post-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Boost Post"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="gridster-composer-header">
          <h3>Boost Post</h3>
          <button type="button" className="gridster-composer-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className="boost-dialog-helper">
          Boosting increases reach but does not guarantee Trending status.
        </p>

        {balance !== null ? (
          <p className="boost-dialog-balance">Your balance: <strong>{balance.toLocaleString()} Bling Bits</strong></p>
        ) : null}

        {loading ? (
          <p className="groups-directory-message">Loading boost packages...</p>
        ) : (
          <div className="boost-package-list">
            {packages.map((pkg) => (
              <label
                key={pkg.slug}
                className={`boost-package-option${selectedSlug === pkg.slug ? " is-selected" : ""}${isPackageDisabled(pkg) ? " is-disabled" : ""}`}
              >
                <input
                  type="radio"
                  name="boost-package"
                  value={pkg.slug}
                  checked={selectedSlug === pkg.slug}
                  disabled={isPackageDisabled(pkg)}
                  onChange={() => setSelectedSlug(pkg.slug)}
                />
                <div>
                  <strong>{pkg.name}</strong>
                  <small>{pkg.bits_cost.toLocaleString()} Bling Bits • {formatDuration(pkg)}</small>
                  <p>{pkg.description}</p>
                  {isPackageDisabled(pkg) ? <p className="boost-package-disabled-reason">{eventPushEligibility.reason}</p> : null}
                </div>
              </label>
            ))}
          </div>
        )}

        {error ? <p className="bling-depot-message bling-depot-error" role="alert">{error}</p> : null}
        {success ? <p className="bling-depot-message bling-depot-success">{success}</p> : null}

        <div className="share-panel-actions boost-dialog-actions">
          <button type="button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            type="button"
            className="share-now-button"
            onClick={handleConfirm}
            disabled={submitting || !selectedPackage || isPackageDisabled(selectedPackage)}
          >
            {submitting
              ? "Boosting..."
              : selectedPackage
                ? `Spend ${selectedPackage.bits_cost.toLocaleString()} Bling Bits to boost this post for ${formatDuration(selectedPackage)}?`
                : "Boost Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BoostPostDialog;
