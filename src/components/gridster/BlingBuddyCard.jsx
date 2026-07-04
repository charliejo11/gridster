function rarityClassName(rarity) {
  return `rarity-${(rarity || "").toLowerCase().replace(/\s+/g, "-")}`;
}

function formatBits(value) {
  return Number(value || 0).toLocaleString();
}

function BlingBuddyCard({ item, owned, equipped, busy, loading, canBuy, onBuy, onEquip }) {
  const auraClassName = ["bling-buddy-card-aura", rarityClassName(item.rarity)].join(" ");

  return (
    <article className="bling-buddy-collectible-card glass-card">
      <div className="bling-buddy-card-art-shell">
        <div className={auraClassName}></div>

        <div className="bling-buddy-card-sparkles" aria-hidden="true">
          <span>✦</span>
          <span>✧</span>
          <span>✦</span>
          <span>✧</span>
        </div>

        <div className={`bling-buddy-card-art bling-depot-preview-fill ${item.previewClass || ""}`}>
          {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>{item.icon}</span>}
        </div>

        {item.rarity ? (
          <b className={`bling-buddy-card-rarity bling-rarity ${rarityClassName(item.rarity)}`}>
            {item.rarity}
          </b>
        ) : null}
      </div>

      <div className="bling-buddy-card-copy">
        <h3>{item.name}</h3>
        <p className="bling-buddy-card-subtitle">
          {[item.rarity, item.mood].filter(Boolean).join(" • ")}
        </p>

        {item.accessories?.length ? (
          <p className="bling-buddy-card-accessories">{item.accessories.join(" • ")}</p>
        ) : null}

        {item.animation ? (
          <p className="bling-buddy-card-animation">Animation: {item.animation}</p>
        ) : null}
      </div>

      <div className="bling-buddy-card-footer">
        <span className="bling-price-pill">{formatBits(item.price)} Bling Bits</span>
        {owned ? <span className="bling-owned-pill">Owned</span> : null}
      </div>

      <div className="bling-buddy-card-actions">
        {!owned ? (
          <button type="button" disabled={busy || loading || !canBuy} onClick={() => onBuy(item)}>
            {busy ? "Buying..." : "Buy with Bling Bits"}
          </button>
        ) : null}

        {owned && !equipped ? (
          <button type="button" disabled={busy} onClick={() => onEquip(item)}>
            {busy ? "Equipping..." : "Equip"}
          </button>
        ) : null}

        {owned && equipped ? (
          <button type="button" disabled className="is-equipped">
            Equipped
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default BlingBuddyCard;
