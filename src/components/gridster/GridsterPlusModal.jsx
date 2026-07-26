import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const GRIDSTER_PLUS_BENEFITS = [
  "Profile glow",
  "Premium crown badge",
  "Monthly Bling Bits bonus",
  "Featured posts (coming soon)",
  "Boosted events (coming soon)",
  "Bigger uploads (coming soon)",
];

function formatRenewalDate(isoString) {
  if (!isoString) {
    return "";
  }

  try {
    return new Date(isoString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

async function requestApiSession(path) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error("Log in to Gridster first.");
  }

  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Something went wrong. Try again in a moment.");
  }

  return result;
}

function GridsterPlusModal({ onClose, currentUser, profile, onAuthOpen }) {
  const [statusMessage, setStatusMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const isPlusMember = Boolean(profile?.is_plus);

  const handleUpgrade = async () => {
    if (!currentUser) {
      onClose?.();
      onAuthOpen?.("login");
      return;
    }

    setBusy(true);
    setStatusMessage("");

    try {
      const result = await requestApiSession("/api/create-plus-checkout-session");

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      throw new Error("Could not start checkout.");
    } catch (error) {
      setStatusMessage(error.message || "Could not start checkout. Try again in a moment.");
      setBusy(false);
    }
  };

  const handleManageSubscription = async () => {
    setBusy(true);
    setStatusMessage("");

    try {
      const result = await requestApiSession("/api/create-plus-portal-session");

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      throw new Error("Could not open billing management.");
    } catch (error) {
      setStatusMessage(error.message || "Could not open billing management. Try again in a moment.");
      setBusy(false);
    }
  };

  return (
    <div className="gridster-plus-modal-overlay" onClick={onClose}>
      <div
        className="gridster-plus-modal glass-card"
        role="dialog"
        aria-modal="true"
        aria-label="Gridster Plus"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="crown">♛</span>
        <h3>Gridster Plus</h3>
        <p>Extra sparkle for creators, venues, stores, and residents who want more reach across the grid.</p>

        <ul className="gridster-plus-modal-benefits">
          {GRIDSTER_PLUS_BENEFITS.map((benefit) => (
            <li key={benefit}>
              <span>✓</span>
              {benefit}
            </li>
          ))}
        </ul>

        {isPlusMember ? (
          <p className="gridster-plus-modal-message gridster-plus-modal-active">
            You're a Gridster Plus member{profile?.plus_current_period_end
              ? ` — renews ${formatRenewalDate(profile.plus_current_period_end)}`
              : ""}.
          </p>
        ) : null}

        {statusMessage ? <p className="gridster-plus-modal-message">{statusMessage}</p> : null}

        <div className="gridster-plus-modal-actions">
          {isPlusMember ? (
            <button
              type="button"
              className="gridster-plus-modal-upgrade"
              disabled={busy}
              onClick={handleManageSubscription}
            >
              {busy ? "Opening..." : "Manage Subscription"}
            </button>
          ) : (
            <button type="button" className="gridster-plus-modal-upgrade" disabled={busy} onClick={handleUpgrade}>
              {busy ? "Starting checkout..." : "Upgrade Now"}
            </button>
          )}
          <button type="button" className="gridster-plus-modal-later" onClick={onClose} disabled={busy}>
            {isPlusMember ? "Close" : "Maybe Later"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GridsterPlusModal;
