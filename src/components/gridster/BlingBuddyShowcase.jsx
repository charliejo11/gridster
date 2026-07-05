import { useState } from "react";
import { BLING_BUDDY_REACTION_EMOJI } from "./blingDepotItems";
import { usePersistedGridsterValue } from "../../lib/gridsterStorage";
import BlingBuddyArt from "./BlingBuddyArt";

function slugifyAnimation(animation) {
  return (animation || "").toLowerCase().replace(/\s+/g, "-");
}

function rarityClassName(rarity) {
  return `rarity-${(rarity || "").toLowerCase().replace(/\s+/g, "-")}`;
}

function InfoRow({ icon, label, value, valueClassName }) {
  if (!value) {
    return null;
  }

  return (
    <div className="bling-buddy-info-row">
      <span className="bling-buddy-info-icon" aria-hidden="true">{icon}</span>
      <span className="bling-buddy-info-text">
        <span className="bling-buddy-info-label">{label}</span>
        <span className={["bling-buddy-info-value", valueClassName].filter(Boolean).join(" ")}>{value}</span>
      </span>
    </div>
  );
}

function BlingBuddyShowcase({ buddy, onOpenShop, showToast }) {
  const [reactionCounts, setReactionCounts] = usePersistedGridsterValue("buddyReactions", {});
  const [justReacted, setJustReacted] = useState("");

  if (!buddy) {
    return (
      <section className="bling-buddy-showcase bling-buddy-showcase-empty glass-card">
        <h3>My Bling Buddy</h3>
        <p>No Bling Buddy equipped yet. Visit the Bling Depot to adopt one.</p>
        {onOpenShop ? (
          <button type="button" onClick={onOpenShop}>
            Browse Bling Buddies
          </button>
        ) : null}
      </section>
    );
  }

  const counts = reactionCounts[buddy.id] || {};
  const reactionOptions = buddy.reactions?.length
    ? buddy.reactions
    : Object.keys(BLING_BUDDY_REACTION_EMOJI);

  const handleReact = (reaction) => {
    setReactionCounts((current) => {
      const buddyCounts = current[buddy.id] || {};

      return {
        ...current,
        [buddy.id]: {
          ...buddyCounts,
          [reaction]: (buddyCounts[reaction] || 0) + 1,
        },
      };
    });

    setJustReacted(reaction);
    window.setTimeout(() => setJustReacted(""), 350);
    showToast?.(`${BLING_BUDDY_REACTION_EMOJI[reaction] || ""} ${reaction} for ${buddy.name}!`);
  };

  const auraClassName = ["bling-buddy-showcase-aura", rarityClassName(buddy.rarity)].join(" ");

  return (
    <section className="bling-buddy-showcase glass-card">
      <h3><span aria-hidden="true">✧</span> My Bling Buddy <span aria-hidden="true">✧</span></h3>

      <div className="bling-buddy-showcase-body">
        <div className="bling-buddy-showcase-art-shell">
          <div className={auraClassName}></div>
          <div className={`bling-buddy-showcase-ring ${rarityClassName(buddy.rarity)}`}></div>

          <div className="bling-buddy-showcase-sparkles" aria-hidden="true">
            <span>✦</span>
            <span>✧</span>
            <span>✦</span>
            <span>✧</span>
            <span>✦</span>
          </div>

          <div
            className={`bling-buddy-showcase-avatar bling-depot-preview-fill ${buddy.previewClass || ""} bling-buddy-anim-${slugifyAnimation(buddy.animation)}`}
          >
            <BlingBuddyArt item={buddy} />
          </div>

          {buddy.vibe ? <p className="bling-buddy-vibe">{buddy.vibe}</p> : null}
        </div>

        <div className="bling-buddy-showcase-copy">
          <div className="bling-buddy-info-rows">
            <InfoRow icon="🐾" label="Buddy Name" value={buddy.name} />
            <InfoRow icon="💎" label="Rarity" value={buddy.rarity} valueClassName="bling-buddy-info-value-rarity" />
            <InfoRow icon="🙂" label="Mood" value={buddy.mood} valueClassName="bling-buddy-info-value-mood" />
            <InfoRow icon="🎽" label="Accessories" value={buddy.accessories?.join(", ")} />
            <InfoRow icon="✨" label="Animation" value={buddy.animation} valueClassName="bling-buddy-info-value-animation" />
          </div>

          {buddy.rarity ? (
            <b className={`bling-buddy-showcase-rarity-pill bling-rarity ${rarityClassName(buddy.rarity)}`}>
              ◆ {buddy.rarity}
            </b>
          ) : null}
        </div>
      </div>

      <div className="bling-buddy-reactions-section">
        <span className="bling-buddy-reactions-heading">
          <span aria-hidden="true">✧</span> Tap to React <span aria-hidden="true">✧</span>
        </span>
        <div className="bling-buddy-reactions">
          {reactionOptions.map((reaction) => (
            <button
              key={reaction}
              type="button"
              className={justReacted === reaction ? "just-reacted" : ""}
              onClick={() => handleReact(reaction)}
            >
              <span className="bling-buddy-reaction-emoji">{BLING_BUDDY_REACTION_EMOJI[reaction] || "✦"}</span>
              <span className="bling-buddy-reaction-label">{reaction}</span>
              {counts[reaction] ? <b>{counts[reaction]}</b> : null}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default BlingBuddyShowcase;
