import { useEffect, useMemo, useState } from "react";
import {
  BLING_DEPOT_ITEMS,
  formatBits,
  getBlingDepotItemPresentation,
  getBlingProfileStyles,
  getBlingRarityRank,
  isHighRarityItem,
} from "./blingDepotItems";
import BlingBuddyFilters, { BLING_BUDDY_FILTER_ALL, filterBlingBuddies } from "./BlingBuddyFilters";
import BlingBuddyCard from "./BlingBuddyCard";
import BlingBuddyShowcase from "./BlingBuddyShowcase";
import BlingProductCard from "./BlingProductCard";
import BlingLivePreview from "./BlingLivePreview";
import {
  buyBlingItem,
  equipBlingItem,
  getBlingShopData,
  notifyBlingBalanceChanged,
} from "../../lib/blingDepot";
import { fetchResidentProfile } from "../../lib/gridsterProfiles";
import { supabase } from "../../lib/supabaseClient";
import MessengerThemePreviewModal from "./MessengerThemePreviewModal";
import EmojiPackPreviewModal from "./EmojiPackPreviewModal";

const STARTING_BLING_BITS = 1250;
const BLING_DEPOT_ARTWORK = "/images/bling%20card.png.png";

// Category tabs are derived from whichever item types actually have
// products right now (see availableCategoryTabs below) - a category with
// zero products (e.g. no Fonts exist anywhere in this data yet) simply
// never appears, instead of showing an empty tab.
const CATEGORY_TAB_DEFINITIONS = [
  { id: "background", label: "Backgrounds", match: (item) => item.itemType === "background" },
  { id: "frame", label: "Frames", match: (item) => item.itemType === "frame" },
  { id: "glow", label: "Glows", match: (item) => item.itemType === "glow" },
  { id: "badge", label: "Badges", match: (item) => item.itemType === "badge" },
  {
    id: "chat_themes",
    label: "Chat Themes",
    match: (item) => ["messenger_theme", "emoji_pack", "sticker_pack", "emote"].includes(item.itemType),
  },
  { id: "bling_buddy", label: "Bling Buddies", match: (item) => item.itemType === "bling_buddy" },
  { id: "seasonal", label: "Seasonal", match: (item) => Boolean(item.season || item.limited) },
];

const PROFILE_PREVIEWABLE_TYPES = new Set(["background", "frame", "glow", "badge", "bling_buddy"]);

function normalizeShopData(data) {
  return {
    balance: data?.balance ?? null,
    isAdmin: Boolean(data?.isAdmin),
    items: (data?.items || []).map((item) => getBlingDepotItemPresentation(item)).filter(Boolean),
    purchases: data?.purchases || [],
    equipped: data?.equipped || [],
  };
}

function BlingDepot({ onAuthOpen, showToast }) {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("featured");
  const [buddyRarityFilter, setBuddyRarityFilter] = useState(BLING_BUDDY_FILTER_ALL);
  const [buddyMoodFilter, setBuddyMoodFilter] = useState(BLING_BUDDY_FILTER_ALL);
  const [buddyVibeFilter, setBuddyVibeFilter] = useState(BLING_BUDDY_FILTER_ALL);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [shopData, setShopData] = useState({
    balance: null,
    isAdmin: false,
    items: [],
    purchases: [],
    equipped: [],
  });
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewItem, setPreviewItem] = useState(null);

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
        setProfile(null);
        setShopData({
          balance: null,
          isAdmin: false,
          items: [],
          purchases: [],
          equipped: [],
        });
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const [nextShopData, nextProfile] = await Promise.all([
          getBlingShopData(),
          fetchResidentProfile(nextUser.id).catch(() => null),
        ]);

        if (active) {
          setShopData(normalizeShopData(nextShopData));
          setProfile(nextProfile);
        }
      } catch (loadError) {
        if (active) {
          setShopData({
            balance: null,
            isAdmin: false,
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

  // shopItems is the full list (includes archived items the user owns, so
  // ownership/equip lookups keep working). browsableItems excludes those
  // archived rows and is what every general discovery/browsing surface
  // (category tabs, curated sections, search/sort) should use instead, so
  // an archived item never appears as something new to buy.
  const shopItems = user ? shopData.items : BLING_DEPOT_ITEMS;
  const browsableItems = useMemo(() => shopItems.filter((item) => item.isActive !== false), [shopItems]);

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
  const equippedBuddy = useMemo(
    () => shopItems.find((item) => item.itemType === "bling_buddy" && item.id === equippedByType.bling_buddy) || null,
    [shopItems, equippedByType]
  );
  const balance = shopData.balance?.balance ?? STARTING_BLING_BITS;

  const availableCategoryTabs = useMemo(() => {
    const tabs = CATEGORY_TAB_DEFINITIONS.filter((tab) => browsableItems.some(tab.match));
    const withOwned = user && ownedItemIds.size ? [...tabs, { id: "owned", label: "Owned" }] : tabs;
    return [{ id: "all", label: "All" }, ...withOwned];
  }, [browsableItems, user, ownedItemIds]);

  const buddyCategoryItems = useMemo(
    () => browsableItems.filter((item) => item.itemType === "bling_buddy"),
    [browsableItems]
  );

  const visibleItems = useMemo(() => {
    let items;

    if (activeTab === "all") {
      items = browsableItems;
    } else if (activeTab === "seasonal") {
      items = browsableItems.filter((item) => item.season || item.limited);
    } else if (activeTab === "chat_themes") {
      items = browsableItems.filter((item) =>
        ["messenger_theme", "emoji_pack", "sticker_pack", "emote"].includes(item.itemType)
      );
    } else if (activeTab === "owned") {
      items = shopItems.filter((item) => ownedItemIds.has(item.id));
    } else if (activeTab === "bling_buddy") {
      items = filterBlingBuddies(buddyCategoryItems, {
        rarity: buddyRarityFilter,
        mood: buddyMoodFilter,
        vibe: buddyVibeFilter,
      });
    } else {
      items = browsableItems.filter((item) => item.itemType === activeTab);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      items = items.filter((item) => item.name?.toLowerCase().includes(query));
    }

    if (sortMode === "newest") {
      items = [...items].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    } else if (sortMode === "price_low") {
      items = [...items].sort((a, b) => a.price - b.price);
    } else if (sortMode === "price_high") {
      items = [...items].sort((a, b) => b.price - a.price);
    } else if (sortMode === "rarity") {
      items = [...items].sort((a, b) => getBlingRarityRank(b) - getBlingRarityRank(a));
    }

    return items;
  }, [shopItems, browsableItems, activeTab, buddyCategoryItems, buddyRarityFilter, buddyMoodFilter, buddyVibeFilter, searchQuery, sortMode, ownedItemIds]);

  // Curated shelves only make sense on the untouched "All" browsing view -
  // once someone searches, sorts, or picks a specific category, show one
  // flat filtered/sorted grid (visibleItems) instead.
  const showCuratedSections =
    activeTab === "all" && !searchQuery.trim() && sortMode === "featured";

  const featuredDropItem = useMemo(() => {
    if (!browsableItems.length) return null;
    return [...browsableItems].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
  }, [browsableItems]);

  const fanFavoriteItems = useMemo(
    () => browsableItems.filter((item) => isHighRarityItem(item) && item.id !== featuredDropItem?.id).slice(0, 6),
    [browsableItems, featuredDropItem]
  );

  const newArrivalItems = useMemo(
    () =>
      [...browsableItems]
        .filter((item) => item.id !== featuredDropItem?.id)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
        .slice(0, 8),
    [browsableItems, featuredDropItem]
  );

  // Capped for the curated "All" overview only - the full list is always
  // reachable via the dedicated "Seasonal" category tab (visibleItems).
  const seasonalItems = useMemo(
    () => browsableItems.filter((item) => item.season || item.limited).slice(0, 8),
    [browsableItems]
  );

  const ownedCollectionItems = useMemo(
    () => shopItems.filter((item) => ownedItemIds.has(item.id)),
    [shopItems, ownedItemIds]
  );

  // Live preview: the real equipped items (as full presented objects, from
  // shopItems - not an extra fetch), with the previewed item's category
  // swapped in locally. Never written to Supabase.
  const equippedCosmeticsForPreview = useMemo(
    () =>
      Object.entries(equippedByType)
        .map(([itemType, itemId]) => {
          const presented = shopItems.find((item) => item.id === itemId);
          return presented ? { item_type: itemType, item_id: itemId, bling_items: presented } : null;
        })
        .filter(Boolean),
    [equippedByType, shopItems]
  );

  const previewOverrideItem =
    previewItem && PROFILE_PREVIEWABLE_TYPES.has(previewItem.itemType) ? previewItem : null;

  const previewEquippedList = useMemo(() => {
    if (!previewOverrideItem) {
      return equippedCosmeticsForPreview;
    }

    const withoutSameType = equippedCosmeticsForPreview.filter(
      (cosmetic) => cosmetic.item_type !== previewOverrideItem.itemType
    );

    return [
      ...withoutSameType,
      { item_type: previewOverrideItem.itemType, item_id: previewOverrideItem.id, bling_items: previewOverrideItem },
    ];
  }, [equippedCosmeticsForPreview, previewOverrideItem]);

  const previewBlingProfile = useMemo(
    () => getBlingProfileStyles(profile, previewEquippedList),
    [profile, previewEquippedList]
  );

  const refreshShopData = async () => {
    const nextShopData = await getBlingShopData();
    const normalized = normalizeShopData(nextShopData);
    setShopData(normalized);
    notifyBlingBalanceChanged();
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
      showToast?.(`${item.name} is already in your inventory.`);
      return;
    }

    if (!shopData.isAdmin && balance < item.price) {
      setError(`Not enough Bling Bits for ${item.name}.`);
      showToast?.(`Not enough Bling Bits for ${item.name}.`);
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
      showToast?.(`${item.name} does not equip to your profile yet.`);
      return;
    }

    if (!ownedItemIds.has(item.id)) {
      setError(`Buy ${item.name} before equipping it.`);
      showToast?.(`Buy ${item.name} before equipping it.`);
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

  const scrollToId = (id) => {
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handlePreview = (item) => {
    setPreviewItem(item);
    if (PROFILE_PREVIEWABLE_TYPES.has(item.itemType)) {
      scrollToId("bling-live-preview");
    }
  };

  const handleShopNewDrops = () => {
    setActiveTab("all");
    setSortMode("featured");
    setSearchQuery("");
    scrollToId("bling-new-arrivals");
  };

  const handleViewOwned = () => {
    setActiveTab("owned");
  };

  const handlePreviewYourLook = () => {
    setPreviewItem(null);
    scrollToId("bling-live-preview");
  };

  function renderCard(item) {
    const owned = ownedItemIds.has(item.id);
    const equipped = equippedItemIds.has(item.id);
    const busy = busyItemId === item.id;
    const canBuy = !user || shopData.items.length > 0;

    if (item.itemType === "bling_buddy") {
      return (
        <BlingBuddyCard
          key={item.id}
          item={item}
          owned={owned}
          equipped={equipped}
          busy={busy}
          loading={loading}
          canBuy={canBuy}
          onBuy={handleBuy}
          onEquip={handleEquip}
          onPreview={handlePreview}
        />
      );
    }

    return (
      <BlingProductCard
        key={item.id}
        item={item}
        owned={owned}
        equipped={equipped}
        busy={busy}
        loading={loading}
        canBuy={canBuy}
        onBuy={handleBuy}
        onEquip={handleEquip}
        onPreview={handlePreview}
      />
    );
  }

  return (
    <section className="bling-depot-page">
      <article className="bling-depot-hero glass-card">
        <div className="bling-depot-copy">
          <span>Bling Depot</span>
          <h2>For when your profile needs to be extra.</h2>
          <p>Spend Bling Bits on profile glowies, backgrounds, stickers, and badges. Want more reach on a post instead? Use Boost Post from any of your own posts.</p>
          <div className="bling-depot-tags">
            <span>Profile glowies</span>
            <span>Backgrounds</span>
            <span>Badges</span>
          </div>
          <div className="bling-depot-hero-balance">
            <span>Bling Bits Balance</span>
            <strong>
              {loading
                ? "Loading..."
                : shopData.isAdmin
                  ? "∞ Bling Bits (Owner Access)"
                  : `${formatBits(balance)} Bling Bits`}
            </strong>
          </div>
          <div className="bling-depot-hero-actions">
            <button type="button" className="bling-hero-cta-primary" onClick={handleShopNewDrops}>
              Shop New Drops
            </button>
            <button type="button" onClick={handleViewOwned}>
              View Owned Items
            </button>
            <button type="button" onClick={handlePreviewYourLook}>
              Preview Your Look
            </button>
          </div>
        </div>
        <div className="bling-depot-art-shell">
          <img src={BLING_DEPOT_ARTWORK} alt="Bling Depot neon profile card artwork" />
        </div>
      </article>

      {user && equippedBuddy ? (
        <BlingBuddyShowcase buddy={equippedBuddy} showToast={showToast} />
      ) : null}

      <BlingLivePreview
        profile={profile}
        blingProfile={previewBlingProfile}
        previewItem={previewOverrideItem}
        owned={previewOverrideItem ? ownedItemIds.has(previewOverrideItem.id) : false}
        equipped={previewOverrideItem ? equippedItemIds.has(previewOverrideItem.id) : false}
        busy={previewOverrideItem ? busyItemId === previewOverrideItem.id : false}
        onClearPreview={() => setPreviewItem(null)}
        onBuy={handleBuy}
        onEquip={handleEquip}
      />

      <article className="bling-depot-toolbar glass-card">
        <div>
          <span>Bling Bits Balance</span>
          <strong>
            {loading
              ? "Loading..."
              : shopData.isAdmin
                ? "∞ Bling Bits (Owner Access)"
                : `${formatBits(balance)} Bling Bits`}
          </strong>
        </div>
        <div className="bling-depot-inventory-summary">
          <span>{ownedItemIds.size} Owned</span>
          <span>{equippedItemIds.size} Equipped</span>
        </div>
        {!user ? (
          <button type="button" onClick={() => onAuthOpen?.("login")}>Log In to Buy</button>
        ) : null}
      </article>

      <div className="bling-depot-search-sort">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search Bling Depot..."
          aria-label="Search Bling Depot products"
        />
        <select
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value)}
          aria-label="Sort products"
        >
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="rarity">Rarity</option>
        </select>
      </div>

      {error ? <p className="bling-depot-message bling-depot-error" role="alert">{error}</p> : null}
      {message ? <p className="bling-depot-message bling-depot-success">{message}</p> : null}

      <section className="bling-category-tabs">
        {availableCategoryTabs.map((tab) => (
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

      {activeTab === "bling_buddy" ? (
        <BlingBuddyFilters
          items={buddyCategoryItems}
          rarity={buddyRarityFilter}
          mood={buddyMoodFilter}
          vibe={buddyVibeFilter}
          onRarityChange={setBuddyRarityFilter}
          onMoodChange={setBuddyMoodFilter}
          onVibeChange={setBuddyVibeFilter}
        />
      ) : null}

      {showCuratedSections ? (
        <>
          {featuredDropItem ? (
            <section className="bling-depot-section" id="bling-featured-drop">
              <h2 className="bling-depot-section-heading">Featured Drop</h2>
              <div className="bling-depot-grid bling-depot-grid-featured">
                {renderCard(featuredDropItem)}
              </div>
            </section>
          ) : null}

          {fanFavoriteItems.length ? (
            <section className="bling-depot-section" id="bling-fan-favorites">
              <h2 className="bling-depot-section-heading">Fan Favorites</h2>
              <div className="bling-depot-grid">{fanFavoriteItems.map(renderCard)}</div>
            </section>
          ) : null}

          {newArrivalItems.length ? (
            <section className="bling-depot-section" id="bling-new-arrivals">
              <h2 className="bling-depot-section-heading">New Arrivals</h2>
              <div className="bling-depot-grid">{newArrivalItems.map(renderCard)}</div>
            </section>
          ) : null}

          {seasonalItems.length ? (
            <section className="bling-depot-section" id="bling-seasonal-collection">
              <h2 className="bling-depot-section-heading">Seasonal Collection</h2>
              <div className="bling-depot-grid">{seasonalItems.map(renderCard)}</div>
            </section>
          ) : null}

          {buddyCategoryItems.length ? (
            <section className="bling-depot-section" id="bling-buddies-section">
              <h2 className="bling-depot-section-heading">Bling Buddies</h2>
              <div className="bling-depot-grid bling-buddy-grid">{buddyCategoryItems.map(renderCard)}</div>
            </section>
          ) : null}

          {user && ownedCollectionItems.length ? (
            <section className="bling-depot-section" id="bling-your-collection">
              <h2 className="bling-depot-section-heading">Your Collection</h2>
              <div className="bling-depot-grid">{ownedCollectionItems.map(renderCard)}</div>
            </section>
          ) : null}
        </>
      ) : (
        <div className={activeTab === "bling_buddy" ? "bling-depot-grid bling-buddy-grid" : "bling-depot-grid"}>
          {visibleItems.map(renderCard)}
        </div>
      )}

      {previewItem?.itemType === "messenger_theme" ? (
        <MessengerThemePreviewModal theme={previewItem} onClose={() => setPreviewItem(null)} />
      ) : null}

      {previewItem?.itemType === "emoji_pack" ? (
        <EmojiPackPreviewModal pack={previewItem} onClose={() => setPreviewItem(null)} />
      ) : null}
    </section>
  );
}

export default BlingDepot;
