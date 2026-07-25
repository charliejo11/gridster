import BlingBuddyArt from "./BlingBuddyArt";
import { formatBits } from "./blingDepotItems";

function getInitials(profile) {
  const source = profile?.display_name || profile?.sl_username || "Resident";
  const words = source.replace(/[^a-z0-9\s]/gi, " ").trim().split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2);
  return initials.toUpperCase() || "R";
}

// Renders through the exact same getBlingProfileStyles() output/class names
// ResidentProfilePage.jsx uses (.resident-profile-card / -banner / -avatar /
// .profile-equipped-badges / .profile-bling-buddy) so a preview looks
// identical to a real profile. blingProfile is computed by the parent from
// the user's real equipped items with the previewed item's category swapped
// in locally - nothing here ever calls Supabase.
function BlingLivePreview({
  profile,
  blingProfile,
  previewItem,
  owned,
  equipped,
  busy,
  onClearPreview,
  onBuy,
  onEquip,
}) {
  const displayClassName = [
    "resident-profile-card",
    "bling-live-preview-card",
    "glass-card",
    blingProfile?.classNames?.glow,
  ].filter(Boolean).join(" ");
  const avatarClassName = [
    "resident-profile-avatar",
    blingProfile?.classNames?.frame,
  ].filter(Boolean).join(" ");
  const bannerStyle = blingProfile?.bannerStyle;

  const scrollIntoView = () => {
    document.getElementById("bling-live-preview")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section className="bling-live-preview glass-card" id="bling-live-preview">
      <div className="bling-live-preview-header">
        <h2>Live Preview</h2>
        <p>See how a look would appear on your profile - nothing is bought or equipped until you choose to.</p>
      </div>

      <article className={displayClassName} style={blingProfile?.cardStyle}>
        <div className="resident-profile-banner" style={bannerStyle}></div>

        <div className="resident-profile-body">
          <div className={avatarClassName}>
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{getInitials(profile)}</span>}
          </div>

          <div className="resident-profile-copy">
            <h2>{profile?.display_name || "Your Profile"}</h2>
            {profile?.sl_username ? <strong>{profile.sl_username}</strong> : null}
          </div>
        </div>

        {blingProfile?.equippedBadges?.length ? (
          <div className="profile-equipped-badges" aria-label="Equipped Bling Depot badges">
            {blingProfile.equippedBadges.map((badge) => (
              <span className={`profile-badge ${badge.previewClass || ""}`} key={badge.id}>
                {badge.name}
              </span>
            ))}
          </div>
        ) : null}

        {blingProfile?.buddy ? (
          <div
            className={`profile-bling-buddy ${blingProfile.buddy.previewClass || ""}`}
            title={blingProfile.buddy.name}
          >
            <BlingBuddyArt item={blingProfile.buddy} />
          </div>
        ) : null}
      </article>

      <div className="bling-live-preview-actions">
        {previewItem ? (
          <>
            <span className="bling-live-preview-active-item">Previewing: {previewItem.name}</span>
            <button type="button" onClick={scrollIntoView}>
              Apply Preview
            </button>
            <button type="button" onClick={onClearPreview}>
              Clear Preview
            </button>
            {!owned ? (
              <button type="button" disabled={busy} onClick={() => onBuy(previewItem)}>
                {busy ? "Buying..." : `Buy for ${formatBits(previewItem.price)} Bits`}
              </button>
            ) : null}
            {owned && previewItem.equipSlot && !equipped ? (
              <button type="button" disabled={busy} onClick={() => onEquip(previewItem)}>
                {busy ? "Equipping..." : "Equip Item"}
              </button>
            ) : null}
            {owned && equipped ? <span className="bling-owned-pill">Equipped</span> : null}
          </>
        ) : (
          <span className="bling-live-preview-hint">
            This is your current equipped look. Click Preview on any item below to try it here first.
          </span>
        )}
      </div>
    </section>
  );
}

export default BlingLivePreview;
