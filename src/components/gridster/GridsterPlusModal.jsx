import { useState } from "react";

const GRIDSTER_PLUS_BENEFITS = [
  "Featured posts",
  "Bigger uploads",
  "Boosted events",
  "Profile glow",
  "Premium badges",
  "Monthly Bling Bits bonus",
];

function GridsterPlusModal({ onClose }) {
  const [upgradeMessage, setUpgradeMessage] = useState("");

  return (
    <div className="gridster-plus-modal-overlay" onClick={onClose}>
      <div
        className="gridster-plus-modal glass-card"
        role="dialog"
        aria-modal="true"
        aria-label="Gridster Plus preview"
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

        {upgradeMessage ? <p className="gridster-plus-modal-message">{upgradeMessage}</p> : null}

        <div className="gridster-plus-modal-actions">
          <button
            type="button"
            className="gridster-plus-modal-upgrade"
            onClick={() => setUpgradeMessage("Gridster Plus checkout is coming soon.")}
          >
            Upgrade Now
          </button>
          <button type="button" className="gridster-plus-modal-later" onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

export default GridsterPlusModal;
