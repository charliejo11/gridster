import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const GRIDSTER_PLUS_LIVE_BENEFITS = ["Gold animated profile glow", "Exclusive ♛ Plus badge", "500 Bling Bits every paid month"];

const GRIDSTER_PLUS_COMING_SOON_BENEFITS = [
  "Exclusive profile frames & backgrounds",
  "Plus-only Bling Depot items",
  "Early access to new features",
  "Featured posts",
  "Boosted events",
  "Bigger uploads",
];

const BILLING_PERIODS = [
  { id: "monthly", label: "Monthly", price: "$4.99/mo" },
  { id: "annual", label: "Annual", price: "$49.99/yr", badge: "2 months free" },
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

async function requestApiSession(path, body) {
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
    body: body ? JSON.stringify(body) : undefined,
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
  const [billingPeriod, setBillingPeriod] = useState("monthly");

  const isPlusMember = Boolean(profile?.is_plus);

  const handleUpgrade = async (period = billingPeriod) => {
    if (!currentUser) {
      onClose?.();
      onAuthOpen?.("login");
      return;
    }

    setBusy(true);
    setStatusMessage("");

    try {
      const result = await requestApiSession("/api/create-plus-checkout-session", { billingPeriod: period });

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
          {GRIDSTER_PLUS_LIVE_BENEFITS.map((benefit) => (
            <li key={benefit}>
              <span>✓</span>
              {benefit}
            </li>
          ))}
        </ul>

        <p className="gridster-plus-modal-section-label">Coming soon</p>
        <ul className="gridster-plus-modal-benefits gridster-plus-modal-benefits-soon">
          {GRIDSTER_PLUS_COMING_SOON_BENEFITS.map((benefit) => (
            <li key={benefit}>
              <span>○</span>
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
        ) : (
          <div className="gridster-plus-billing-toggle" role="radiogroup" aria-label="Billing period">
            {BILLING_PERIODS.map((period) => (
              <button
                key={period.id}
                type="button"
                role="radio"
                aria-checked={billingPeriod === period.id}
                className={billingPeriod === period.id ? "active" : ""}
                disabled={busy}
                onClick={() => setBillingPeriod(period.id)}
              >
                <span className="gridster-plus-billing-label">{period.label}</span>
                <span className="gridster-plus-billing-price">{period.price}</span>
                {period.badge ? <span className="gridster-plus-billing-badge">{period.badge}</span> : null}
              </button>
            ))}
          </div>
        )}

        {!isPlusMember ? (
          <button
            type="button"
            className="gridster-plus-founding-banner"
            disabled={busy}
            onClick={() => handleUpgrade("founding")}
          >
            <span className="gridster-plus-founding-title">🎉 Founding Member Launch Offer</span>
            <span className="gridster-plus-founding-copy">Lock in $3.99/mo for life — limited spots</span>
          </button>
        ) : null}

        <div className="gridster-plus-linden-panel">
          <p className="gridster-plus-linden-title">Pay in Second Life — L$1,750 for 30 days</p>
          <p className="gridster-plus-linden-copy">
            Prefer to pay with Linden dollars? Visit the Gridster Plus kiosk in-world and pay L$1,750 to activate 30
            days of Plus, the Plus badge, gold profile glow, and 500 Bling Bits. This can't be paid from the website —
            it's an in-world purchase only.
            {profile?.sl_verified
              ? ""
              : " Verify your Second Life avatar on Gridster first so the kiosk can find your account."}
          </p>
        </div>

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
            <button type="button" className="gridster-plus-modal-upgrade" disabled={busy} onClick={() => handleUpgrade()}>
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
