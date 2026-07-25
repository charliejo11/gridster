import { supabase } from "./supabaseClient";
import { notifyBlingBalanceChanged } from "./blingDepot";

// Bling Bits post boosting. Packages/prices live only in the
// boost_packages table (seeded in
// supabase/migrations/20260721020000_create_post_boosts.sql) - this
// file never hardcodes a price or duration, it only reads what the
// server returns and asks the server to charge a package by slug.

export const BOOST_PACKAGES_TABLE = "boost_packages";
export const POST_BOOSTS_TABLE = "post_boosts";
export const ACTIVE_POST_BOOSTS_VIEW = "active_post_boosts";

export const BOOST_STATUS_LABELS = {
  pending: "Pending",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `boost-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------

export async function fetchBoostPackages() {
  const { data, error } = await supabase
    .from(BOOST_PACKAGES_TABLE)
    .select("*")
    .eq("is_active", true)
    .order("bits_cost", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

// A post is only Event Push eligible once it's linked to an approved,
// upcoming event - checked here so the UI can disable the package
// with a clear reason instead of letting the user hit the server
// error. The RPC re-validates this regardless.
export function getEventPushEligibility(post, linkedEvent) {
  if (post?.post_type !== "event" || !post?.linked_event_id) {
    return { eligible: false, reason: "Only event posts linked to an event can use Event Push." };
  }

  if (!linkedEvent) {
    return { eligible: false, reason: "Linked event could not be found." };
  }

  if (!linkedEvent.is_approved) {
    return { eligible: false, reason: "This event has not been approved for promotion yet." };
  }

  if (!linkedEvent.starts_at || new Date(linkedEvent.starts_at).getTime() <= Date.now()) {
    return { eligible: false, reason: "Event Push is only available before the event begins." };
  }

  return { eligible: true, reason: null };
}

// ---------------------------------------------------------------------------
// Purchase (the one and only write path - always via RPC, the
// server determines and enforces the price)
// ---------------------------------------------------------------------------

export async function purchasePostBoost(postId, packageSlug) {
  const idempotencyKey = makeIdempotencyKey();

  const { data, error } = await supabase.rpc("purchase_post_boost", {
    target_post_id: postId,
    target_package_slug: packageSlug,
    target_idempotency_key: idempotencyKey,
  });

  if (error) {
    throw error;
  }

  notifyBlingBalanceChanged();

  return data;
}

// ---------------------------------------------------------------------------
// Dashboard reads
// ---------------------------------------------------------------------------

export async function fetchMyBoosts(userId) {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from(POST_BOOSTS_TABLE)
    .select("*, gridster_posts(id, content, photo_url, post_type)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function fetchBoostPerformance(boostId) {
  const { data, error } = await supabase
    .from("gridster_boost_events")
    .select("event_type")
    .eq("boost_id", boostId);

  if (error) {
    throw error;
  }

  const counts = { impression: 0, click: 0, profile_click: 0, teleport_click: 0 };

  for (const row of data || []) {
    if (counts[row.event_type] !== undefined) {
      counts[row.event_type] += 1;
    }
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Feed / spotlight surfaces (public-safe view - no bits_spent, no
// user_id, see active_post_boosts in the migration)
// ---------------------------------------------------------------------------

export async function fetchActiveFeedBoosts(postIds) {
  if (!postIds?.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from(ACTIVE_POST_BOOSTS_VIEW)
    .select("*")
    .in("post_id", postIds);

  if (error) {
    throw error;
  }

  return new Map((data || []).map((row) => [row.post_id, row]));
}

export async function fetchActiveSpotlightBoosts(limit = 6) {
  const { data, error } = await supabase
    .from(ACTIVE_POST_BOOSTS_VIEW)
    .select("*")
    .eq("placement_type", "spotlight")
    .order("starts_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const boosts = data || [];

  if (!boosts.length) {
    return [];
  }

  const { data: posts, error: postsError } = await supabase
    .from("gridster_posts")
    .select("*")
    .in("id", boosts.map((boost) => boost.post_id));

  if (postsError) {
    throw postsError;
  }

  const postsById = new Map((posts || []).map((post) => [post.id, post]));

  return boosts
    .map((boost) => ({ boost, post: postsById.get(boost.post_id) }))
    .filter((entry) => Boolean(entry.post));
}

// ---------------------------------------------------------------------------
// Boost performance event logging (best-effort - never blocks
// content display, see record_boost_event in the migration for
// server-side dedup/self-view exclusion).
// ---------------------------------------------------------------------------

async function recordBoostEvent(boostId, eventType, placement) {
  if (!boostId) {
    return;
  }

  try {
    await supabase.rpc("record_boost_event", {
      target_boost_id: boostId,
      target_event_type: eventType,
      target_placement: placement || null,
    });
  } catch (recordError) {
    console.error("Gridster boosts: could not record boost event", recordError);
  }
}

export const recordBoostImpression = (boostId, placement) => recordBoostEvent(boostId, "impression", placement);
export const recordBoostClick = (boostId, placement) => recordBoostEvent(boostId, "click", placement);
export const recordBoostProfileClick = (boostId, placement) => recordBoostEvent(boostId, "profile_click", placement);
export const recordBoostTeleportClick = (boostId, placement) => recordBoostEvent(boostId, "teleport_click", placement);

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function adminRefundBoost(boostId, reason) {
  const { data, error } = await supabase.rpc("admin_refund_boost", {
    target_boost_id: boostId,
    target_reason: reason || "Admin refund",
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function adminCancelBoost(boostId, reason) {
  const { data, error } = await supabase.rpc("admin_cancel_boost", {
    target_boost_id: boostId,
    target_reason: reason || "Admin cancelled",
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchAllBoostsForAdmin() {
  const { data, error } = await supabase
    .from(POST_BOOSTS_TABLE)
    .select("*, gridster_posts(id, content, post_type, user_id)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  return data || [];
}
