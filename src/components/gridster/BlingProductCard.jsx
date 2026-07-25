import { formatBits, parseBlingPreviewStyle } from "./blingDepotItems";

function rarityClassName(rarity) {
  return `rarity-${(rarity || "").toLowerCase().replace(/\s+/g, "-")}`;
}

function getItemPreviewStyle(item) {
  if (item.itemType === "background") {
    return { background: item.previewStyle };
  }

  if (item.itemType === "frame" || item.itemType === "glow") {
    return parseBlingPreviewStyle(item.previewStyle);
  }

  return {};
}

// Categories that can be temporarily applied to the live preview panel
// (see BlingLivePreview.jsx) without buying/equipping. Messenger themes and
// emoji packs preview a mock chat window instead (their own modals, opened
// separately below) since they aren't profile cosmetics.
const PROFILE_PREVIEWABLE_TYPES = new Set(["background", "frame", "glow", "badge"]);

function BlingProductCard({ item, owned, equipped, busy, loading, canBuy, onBuy, onEquip, onPreview }) {
  const previewClassName = ["bling-depot-preview-fill", item.previewClass].filter(Boolean).join(" ");
  const previewStyle = item.previewClass ? undefined : getItemPreviewStyle(item);
  const hasChatPreview = item.itemType === "messenger_theme" || item.itemType === "emoji_pack";
  const hasProfilePreview = PROFILE_PREVIEWABLE_TYPES.has(item.itemType);
  const isPreviewOnly = item.itemType === "emoji_pack";

  return (
    <article className="bling-depot-item-card glass-card">
      <div className={`bling-depot-item-preview item-type-${item.itemType}`}>
        <div className={previewClassName} style={previewStyle}>
          {item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}
          {!item.imageUrl && item.itemType === "badge" ? (
            <span className="bling-preview-badge">{item.name}</span>
          ) : null}
          {!item.imageUrl && item.itemType !== "badge" ? <span>{item.icon}</span> : null}
        </div>
      </div>

      <div className="bling-depot-item-copy">
        <div className="bling-depot-item-meta">
          <span>{item.category}</span>
          <b className={`bling-rarity ${rarityClassName(item.rarity)}`}>{item.rarity}</b>
          {item.limited ? <b className="bling-limited-pill">{item.season || "Limited"}</b> : null}
        </div>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
      </div>

      <div className="bling-depot-item-footer">
        <span className="bling-price-pill">{formatBits(item.price)} Bling Bits</span>
        {owned ? <span className="bling-owned-pill">Owned</span> : null}
      </div>

      <div className="bling-depot-item-actions">
        {hasChatPreview || hasProfilePreview ? (
          <button type="button" onClick={() => onPreview(item)}>
            Preview
          </button>
        ) : null}

        {!isPreviewOnly && !owned ? (
          <button type="button" disabled={busy || loading || !canBuy} onClick={() => onBuy(item)}>
            {busy ? "Buying..." : `Buy for ${formatBits(item.price)} Bits`}
          </button>
        ) : null}

        {!isPreviewOnly && owned && item.equipSlot ? (
          <button
            type="button"
            className={equipped ? "is-equipped" : ""}
            disabled={busy || equipped}
            onClick={() => onEquip(item)}
          >
            {equipped ? "Equipped" : busy ? "Equipping..." : "Equip"}
          </button>
        ) : null}

        {!isPreviewOnly && owned && !item.equipSlot ? (
          <button type="button" disabled>
            Owned
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default BlingProductCard;
