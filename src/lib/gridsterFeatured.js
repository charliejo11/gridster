import { supabase } from "./supabaseClient";
import { GRIDSTER_PLACE_CATEGORY_LABELS } from "./gridsterPlaces";

export const GRIDSTER_FEATURED_PLACES_TABLE = "gridster_featured_places";
export const GRIDSTER_PLACE_NOMINATIONS_TABLE = "gridster_place_nominations";
export const GRIDSTER_FEATURED_TELEPORT_CLICKS_TABLE = "gridster_featured_teleport_clicks";

export const GRIDSTER_FEATURE_STATUSES = ["draft", "scheduled", "active", "expired"];

export const GRIDSTER_FEATURE_STATUS_LABELS = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  expired: "Expired",
};

export const GRIDSTER_NOMINATION_STATUSES = ["pending", "approved", "rejected"];

// Categories that read as a "Sim" destination vs. a "Store" in the sidebar's
// type label. Everything not in STORE_CATEGORIES reads as "Sim".
const STORE_CATEGORIES = new Set(["stores"]);

export function getPlaceTypeLabel(category) {
  return STORE_CATEGORIES.has(category) ? "Store" : "Sim";
}

export const DEFAULT_FEATURE_DURATION_DAYS = 7;
export const FEATURE_ROTATION_COOLDOWN_DAYS = 30;

// -----------------------------------------------------------------------
// Not yet active. Once enough real analytics exist (profile views, saves,
// follows, event interest, teleport clicks, listing completeness, and
// community nominations), a future automated recommendation score could
// combine:
//   30% recent activity
//   25% engagement (saves/follows/event interest/teleport clicks)
//   25% listing completeness
//   20% staff/community nomination signal
// Do not wire this into ranking until each term is backed by real data -
// a stub score that nobody trusts is worse than an honest manual list.
// -----------------------------------------------------------------------
export const FUTURE_FEATURED_SCORE_WEIGHTS = {
  recentActivity: 0.3,
  engagement: 0.25,
  listingCompleteness: 0.25,
  communityNomination: 0.2,
};

export async function fetchIsCurrentUserAdmin() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    return false;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.is_admin);
}

// Computes the *effective* status for display, without needing a cron job
// to keep the stored feature_status in sync with the clock. The stored
// value still matters for "draft" (never shown, regardless of dates) and
// "expired" (an admin pulled it early) - both are intent, not a date fact.
export function computeDisplayFeatureStatus(row) {
  if (row.feature_status === "draft" || row.feature_status === "expired") {
    return row.feature_status;
  }

  const now = Date.now();
  const startsAt = new Date(row.starts_at).getTime();
  const endsAt = new Date(row.ends_at).getTime();

  if (now < startsAt) {
    return "scheduled";
  }

  if (now > endsAt) {
    return "expired";
  }

  return "active";
}

// -----------------------------------------------------------------------
// Sidebar (public) read
// -----------------------------------------------------------------------

export async function fetchActiveFeaturedPlaces(limit = 3) {
  const { data, error } = await supabase
    .from(GRIDSTER_FEATURED_PLACES_TABLE)
    .select("*, gridster_places(*)")
    .eq("is_sponsored", false)
    .in("feature_status", ["scheduled", "active"])
    .lte("starts_at", new Date().toISOString())
    .gte("ends_at", new Date().toISOString())
    .order("priority", { ascending: false })
    .order("starts_at", { ascending: false });

  if (error) {
    throw error;
  }

  const seenPlaceIds = new Set();
  const deduped = [];

  for (const row of data || []) {
    if (!row.gridster_places || seenPlaceIds.has(row.place_id)) {
      continue;
    }

    seenPlaceIds.add(row.place_id);
    deduped.push(row);

    if (deduped.length >= limit) {
      break;
    }
  }

  return deduped;
}

export async function recordFeaturedTeleportClick(placeId, userId, source = "featured_sidebar") {
  try {
    const { error } = await supabase
      .from(GRIDSTER_FEATURED_TELEPORT_CLICKS_TABLE)
      .insert({ place_id: placeId, user_id: userId || null, source });

    if (error) {
      console.error("Gridster featured: could not record teleport click", error);
    }
  } catch (clickError) {
    // Teleporting must never depend on analytics succeeding.
    console.error("Gridster featured: could not record teleport click", clickError);
  }
}

// -----------------------------------------------------------------------
// Admin: featured placements
// -----------------------------------------------------------------------

export async function fetchAllFeaturedPlacesForAdmin() {
  const { data, error } = await supabase
    .from(GRIDSTER_FEATURED_PLACES_TABLE)
    .select("*, gridster_places(*)")
    .order("priority", { ascending: false })
    .order("starts_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function searchApprovedPlaces(query) {
  let request = supabase
    .from("gridster_places")
    .select("id, title, category, region_name, slurl, photo_url, is_active, is_approved")
    .eq("is_active", true)
    .eq("is_approved", true)
    .order("title", { ascending: true })
    .limit(25);

  const trimmed = String(query || "").trim();

  if (trimmed) {
    request = request.ilike("title", `%${trimmed}%`);
  }

  const { data, error } = await request;

  if (error) {
    throw error;
  }

  return data || [];
}

// Checks whether featuring this place right now would create a duplicate
// active/scheduled placement, or fall inside the 30-day re-feature cooldown
// since its last placement ended. Both are warnings an admin can override,
// not hard blocks - see section 6 of the spec this implements.
export async function checkFeatureEligibility(placeId) {
  const { data, error } = await supabase
    .from(GRIDSTER_FEATURED_PLACES_TABLE)
    .select("id, feature_status, starts_at, ends_at")
    .eq("place_id", placeId)
    .order("ends_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = data || [];
  const now = Date.now();

  const activeConflict = rows.some((row) => {
    if (row.feature_status !== "scheduled" && row.feature_status !== "active") {
      return false;
    }

    return new Date(row.ends_at).getTime() >= now;
  });

  const mostRecentEnded = rows
    .filter((row) => new Date(row.ends_at).getTime() < now)
    .sort((a, b) => new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime())[0];

  let cooldownActive = false;
  let cooldownEndsAt = null;

  if (mostRecentEnded) {
    const cooldownEndMs = new Date(mostRecentEnded.ends_at).getTime() + FEATURE_ROTATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

    if (cooldownEndMs > now) {
      cooldownActive = true;
      cooldownEndsAt = new Date(cooldownEndMs).toISOString();
    }
  }

  return { activeConflict, cooldownActive, cooldownEndsAt };
}

export async function createFeaturedPlace(adminUserId, form, { override = false } = {}) {
  if (!override) {
    const eligibility = await checkFeatureEligibility(form.place_id);

    if (eligibility.activeConflict) {
      const error = new Error("This place is already actively featured or scheduled. Use override to feature it again anyway.");
      error.code = "ACTIVE_CONFLICT";
      throw error;
    }

    if (eligibility.cooldownActive) {
      const cooldownDate = new Date(eligibility.cooldownEndsAt).toLocaleDateString();
      const error = new Error(`This place was featured within the last ${FEATURE_ROTATION_COOLDOWN_DAYS} days (cooldown until ${cooldownDate}). Use override to feature it again anyway.`);
      error.code = "COOLDOWN_ACTIVE";
      throw error;
    }
  }

  const startsAt = form.starts_at ? new Date(form.starts_at) : new Date();
  const endsAt = form.ends_at
    ? new Date(form.ends_at)
    : new Date(startsAt.getTime() + DEFAULT_FEATURE_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from(GRIDSTER_FEATURED_PLACES_TABLE)
    .insert({
      place_id: form.place_id,
      feature_status: form.feature_status || "scheduled",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      priority: Number.isFinite(Number(form.priority)) ? Number(form.priority) : 0,
      feature_reason: form.feature_reason || null,
      is_sponsored: Boolean(form.is_sponsored),
      image_url: form.image_url || null,
      created_by: adminUserId,
    })
    .select("*, gridster_places(*)")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateFeaturedPlace(id, updates) {
  const { data, error } = await supabase
    .from(GRIDSTER_FEATURED_PLACES_TABLE)
    .update(updates)
    .eq("id", id)
    .select("*, gridster_places(*)")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function expireFeaturedPlace(id) {
  return updateFeaturedPlace(id, { feature_status: "expired", ends_at: new Date().toISOString() });
}

export async function deleteFeaturedPlace(id) {
  const { error } = await supabase
    .from(GRIDSTER_FEATURED_PLACES_TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

// -----------------------------------------------------------------------
// Nominations
// -----------------------------------------------------------------------

export async function submitNomination(userId, placeId, reason) {
  const { data, error } = await supabase
    .from(GRIDSTER_PLACE_NOMINATIONS_TABLE)
    .insert({ place_id: placeId, nominated_by: userId, reason: reason || null })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const duplicateError = new Error("You already nominated this place - an admin hasn't reviewed it yet.");
      duplicateError.code = "DUPLICATE_NOMINATION";
      throw duplicateError;
    }

    throw error;
  }

  return data;
}

export async function fetchMyNominationForPlace(userId, placeId) {
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from(GRIDSTER_PLACE_NOMINATIONS_TABLE)
    .select("*")
    .eq("nominated_by", userId)
    .eq("place_id", placeId)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchNominationsForAdmin(status = "pending") {
  let request = supabase
    .from(GRIDSTER_PLACE_NOMINATIONS_TABLE)
    .select("*, gridster_places(*)")
    .order("created_at", { ascending: false });

  if (status) {
    request = request.eq("status", status);
  }

  const { data, error } = await request;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function reviewNomination(id, status, adminUserId) {
  const { data, error } = await supabase
    .from(GRIDSTER_PLACE_NOMINATIONS_TABLE)
    .update({ status, reviewed_by: adminUserId, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export { GRIDSTER_PLACE_CATEGORY_LABELS };
