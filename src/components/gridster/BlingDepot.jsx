import { useEffect, useMemo, useState } from "react";
import {
  BLING_DEPOT_ITEMS,
  getBlingDepotItemPresentation,
  parseBlingPreviewStyle,
} from "./blingDepotItems";
import {
  buyBlingItem,
  equipBlingItem,
  getBlingShopData,
} from "../../lib/blingDepot";
import { supabase } from "../../lib/supabaseClient";
import MessengerThemePreviewModal from "./MessengerThemePreviewModal";

const STARTING_BLING_BITS = 1250;
const BLING_DEPOT_ARTWORK = "/images/bling%20card.png.png";

function formatBits(value) {
  return Number(value || 0).toLocaleString();
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

function normalizeShopData(data) {
  return {
    balance: data?.balance ?? null,
    items: (data?.items || []).map((item) => getBlingDepotItemPresentation(item)).filter(Boolean),
    purchases: data?.purchases || [],
    equipped: data?.equipped || [],
  };
}

function BlingDepot({ onAuthOpen, showToast }) {
  const [activeTab, setActiveTab] = useState("all");
  const [user, setUser] = useState(null);
  const [shopData, setShopData] = useState({
    balance: null,
    items: [],
    purchases: [],
    equipped: [],
  });
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewTheme, setPreviewTheme] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadDepotForUser(nextUser) {
      if (!active) {
        return;
      }

      setUser(nextUser);
      setMessage("");
      setError("");

      if (!nextUser) {
        setShopData({
          balance: null,
          items: [],
          purchases: [],
          equipped: [],
        });
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const nextShopData = await getBlingShopData();

        if (active) {
          setShopData(normalizeShopData(nextShopData));
        }
      } catch (loadError) {
        if (active) {
          setShopData({
            balance: null,
            items: [],
            purchases: [],
            equipped: [],
          });
          setError(loadError.message || "Could not load Bling Depot.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    supabase.auth
      .getUser()
      .then(({ data }) => loadDepotForUser(data?.user ?? null))
      .catch((authError) => {
        if (!active) {
          return;
        }

        setError(authError.message || "Could not check your login session.");
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadDepotForUser(session?.user ?? null);
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const shopItems = user ? shopData.items : BLING_DEPOT_ITEMS;

  const visibleItems = useMemo(() => {
    if (activeTab === "all") {
      return shopItems;
    }

    if (activeTab === "seasonal") {
      return shopItems.filter((item) => item.limited);
    }

    const categoryMap = {
      background: "Profile Backgrounds",
      frame: "Profile Frames",
      glow: "Glow Effects",
      badge: "Badges",
      sticker_pack: "Chat Stickers",
      boost: "Event Boosts",
      bling_buddy: "Bling Buddies",
      messenger_theme: "Messenger Themes",
    };

    return shopItems.filter((item) => item.category === categoryMap[activeTab]);
  }, [shopItems, activeTab]);

  const featuredSeasonalItems = useMemo(() => {
    return shopItems.filter((item) => item.limited).slice(0, 4);
  }, [shopItems]);
  const ownedItemIds = useMemo(
    () => new Set(shopData.purchases.map((purchase) => purchase.item_id)),
    [shopData.purchases]
  );
  const equippedItemIds = useMemo(
    () => new Set(shopData.equipped.map((cosmetic) => cosmetic.item_id)),
    [shopData.equipped]
  );
  const equippedByType = useMemo(
    () =>
      shopData.equipped.reduce(
        (map, cosmetic) => ({ ...map, [cosmetic.item_type]: cosmetic.item_id }),
        {}
      ),
    [shopData.equipped]
  );
  const balance = shopData.balance?.balance ?? STARTING_BLING_BITS;

  const refreshShopData = async () => {
    const nextShopData = await getBlingShopData();
    const normalized = normalizeShopData(nextShopData);
    setShopData(normalized);
    return normalized;
  };

  const handleBuy = async (item) => {
    if (!user) {
      setError("Log in before buying Bling Depot items.");
      onAuthOpen?.("login");
      return;
    }

    if (ownedItemIds.has(item.id)) {
      setMessage(`${item.name} is already in your inventory.`);
      return;
    }

    if (balance < item.price) {
      setError(`Not enough Bling Bits for ${item.name}.`);
      return;
    }

    setBusyItemId(item.id);
    setMessage("");
    setError("");

    try {
      const result = await buyBlingItem(item.id);
      await refreshShopData();
      setMessage(result?.already_owned ? `${item.name} is already in your inventory.` : `${item.name} added to your inventory.`);
      showToast?.(`${item.name} purchased with Bling Bits.`);
    } catch (purchaseError) {
      setError(purchaseError.message || "Could not buy this Bling Depot item.");
    } finally {
      setBusyItemId("");
    }
  };

  const handleEquip = async (item) => {
    if (!user) {
      setError("Log in before equipping Bling Depot items.");
      onAuthOpen?.("login");
      return;
    }

    if (!item.equipSlot) {
      setMessage(`${item.name} is owned, but it does not equip to your profile yet.`);
      return;
    }

    if (!ownedItemIds.has(item.id)) {
      setError(`Buy ${item.name} before equipping it.`);
      return;
    }

    setBusyItemId(item.id);
    setMessage("");
    setError("");

    try {
      await equipBlingItem(item.id);
      await refreshShopData();
      setMessage(`${item.name} equipped on your profile.`);
      showToast?.(`${item.name} equipped.`);
    } catch (equipError) {
      setError(equipError.message || "Could not equip this Bling Depot item.");
    } finally {
      setBusyItemId("");
    }
  };

  return (
    <section className="bling-depot-page">
      <article className="bling-depot-hero glass-card">
        <div className="bling-depot-copy">
          <span>Bling Depot</span>
          <h2>For when your profile needs to be extra.</h2>
          <p>Spend Bling Bits on profile glowies, backgrounds, stickers, badges, and boosts.</p>
          <div className="bling-depot-tags">
            <span>Profile glowies</span>
            <span>Backgrounds</span>
            <span>Badges</span>
            <span>Boosts</span>
          </div>
        </div>
        <div className="bling-depot-art-shell">
          <img src={BLING_DEPOT_ARTWORK} alt="Bling Depot neon profile card artwork" />
        </div>
      </article>

      <article className="bling-depot-toolbar glass-card">
        <div>
          <span>Bling Bits Balance</span>
          <strong>{loading ? "Loading..." : `${formatBits(balance)} Bling Bits`}</strong>
        </div>
        {!user ? (
          <button type="button" onClick={() => onAuthOpen?.("login")}>Log In to Buy</button>
        ) : null}
      </article>

      {error ? <p className="bling-depot-message bling-depot-error" role="alert">{error}</p> : null}
      {message ? <p className="bling-depot-message bling-depot-success">{message}</p> : null}

      <section className="bling-category-tabs">
        {[
          { id: "all", label: "All" },
          { id: "seasonal", label: "Seasonal" },
          { id: "background", label: "Backgrounds" },
          { id: "frame", label: "Frames" },
          { id: "glow", label: "Glowies" },
          { id: "badge", label: "Badges" },
          { id: "sticker_pack", label: "Stickers" },
          { id: "boost", label: "Boosts" },
          { id: "bling_buddy", label: "Bling Buddies" },
          { id: "messenger_theme", label: "Messenger Themes" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {featuredSeasonalItems.length > 0 && (
        <section className="bling-seasonal-drop">
          <div className="bling-seasonal-header">
            <p className="bling-kicker">Limited Seasonal Drop</p>
            <h2>Seasonal Bling</h2>
            <span>Grab it before it gets vaulted.</span>
          </div>

          <div className="bling-grid">
            {featuredSeasonalItems.map((item) => {
              const owned = ownedItemIds.has(item.id);
              const equipped = equippedByType[item.itemType] === item.id;
              const busy = busyItemId === item.id;

              return (
                <article className="bling-card bling-limited-card" key={item.id}>
                  <div className={`bling-preview ${item.previewClass || item.preview_class || ""}`}>
                    {item.itemType === "badge" && (
                      <span className="bling-preview-badge">{item.name}</span>
                    )}
                  </div>

                  <div className="bling-card-body">
                    <div className="bling-season-pill">
                      {item.season}
                    </div>

                    <h3>{item.name}</h3>
                    <p>{item.description}</p>

                    <div className="bling-card-footer">
                      <span className="bling-price">
                        {Number(item.price || 0).toLocaleString()} Bits
                      </span>

                      {!owned && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleBuy(item)}
                        >
                          {busy ? "Buying..." : "Buy This Bling"}
                        </button>
                      )}

                      {owned && !equipped && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleEquip(item)}
                        >
                          {busy ? "Equipping..." : "Wear It"}
                        </button>
                      )}

                      {owned && equipped && (
                        <button type="button" disabled className="is-equipped">
                          Wearing It
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div className="bling-depot-grid">
        {visibleItems.map((item) => {
          const owned = ownedItemIds.has(item.id);
          const equipped = equippedItemIds.has(item.id);
          const busy = busyItemId === item.id;
          const previewClassName = ["bling-depot-preview-fill", item.previewClass].filter(Boolean).join(" ");
          const previewStyle = item.previewClass ? undefined : getItemPreviewStyle(item);

          return (
            <article className="bling-depot-item-card glass-card" key={item.id}>
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
                  <b className={`bling-rarity rarity-${item.rarity.toLowerCase()}`}>{item.rarity}</b>
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
                {item.itemType === "messenger_theme" ? (
                  <button type="button" onClick={() => setPreviewTheme(item)}>
                    Preview
                  </button>
                ) : null}

                {item.itemType !== "messenger_theme" && !owned ? (
                  <button type="button" disabled={busy || loading || (user && !shopData.items.length)} onClick={() => handleBuy(item)}>
                    {busy ? "Buying..." : "Buy with Bling Bits"}
                  </button>
                ) : null}

                {item.itemType !== "messenger_theme" && owned && item.equipSlot ? (
                  <button
                    type="button"
                    className={equipped ? "is-equipped" : ""}
                    disabled={busy || equipped}
                    onClick={() => handleEquip(item)}
                  >
                    {equipped ? "Equipped" : busy ? "Equipping..." : "Equip"}
                  </button>
                ) : null}

                {item.itemType !== "messenger_theme" && owned && !item.equipSlot ? (
                  <button type="button" disabled>
                    Owned
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {previewTheme ? (
        <MessengerThemePreviewModal theme={previewTheme} onClose={() => setPreviewTheme(null)} />
      ) : null}
    </section>
  );
}

export default BlingDepot;
