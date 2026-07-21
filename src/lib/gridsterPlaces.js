import { supabase } from "./supabaseClient";
import { GRIDSTER_FAVORITE_PLACES_TABLE } from "./gridsterProfiles";

export const GRIDSTER_PLACES_TABLE = "gridster_places";
export const GRIDSTER_EVENTS_TABLE = "gridster_events";

export const GRIDSTER_PLACE_CATEGORIES = [
  "clubs",
  "beaches",
  "rp_sims",
  "stores",
  "photo_spots",
  "adult_venues",
  "live_music",
  "hangouts",
];

export const GRIDSTER_PLACE_CATEGORY_LABELS = {
  clubs: "Clubs",
  beaches: "Beaches",
  rp_sims: "RP Sims",
  stores: "Stores",
  photo_spots: "Photo Spots",
  adult_venues: "Adult Venues",
  live_music: "Live Music",
  hangouts: "Hangouts",
};

export const GRIDSTER_EVENT_TYPES = [
  "live_dj",
  "contest",
  "roleplay",
  "new_release",
  "beach_party",
  "photo_meetup",
  "club_opening",
  "grand_opening",
];

export const GRIDSTER_EVENT_TYPE_LABELS = {
  live_dj: "Live DJ",
  contest: "Contest",
  roleplay: "Roleplay",
  new_release: "New Release",
  beach_party: "Beach Party",
  photo_meetup: "Photo Meetup",
  club_opening: "Club Opening",
  grand_opening: "Grand Opening",
};

export const GRIDSTER_MATURITY_RATINGS = ["general", "moderate", "adult"];

export const GRIDSTER_MATURITY_RATING_LABELS = {
  general: "General",
  moderate: "Moderate",
  adult: "Adult",
};

export const GRIDSTER_TELEPORT_STATUS_LABELS = {
  unverified: "Unverified",
  working: "Verified Working",
  broken: "Reported Broken",
  needs_update: "Needs Update",
};

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// SL viewer chat/IM history prefixes every line with a timestamp, so pasting
// a SLURL copied from there (e.g. "Monday, July 20, 2026 7:21 PM
// https://maps.secondlife.com/...") saves a link the Teleport button can
// never open. Extract just the URL if one is embedded in the pasted text.
const SLURL_PATTERN = /(https?:\/\/\S+|secondlife:\/\/\S+)/i;

export function normalizeSlurlInput(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  const match = trimmed.match(SLURL_PATTERN);

  return match ? match[0] : trimmed;
}

function normalizeTags(value) {
  const rawTags = Array.isArray(value) ? value : String(value || "").split(",");

  return [...new Set(rawTags.map((tag) => tag.trim()).filter(Boolean))];
}

export function normalizeGridsterPlaceForm(form) {
  return {
    title: String(form.title || "").trim(),
    description: String(form.description || "").trim(),
    photo_url: normalizeUrl(form.photo_url),
    slurl: normalizeSlurlInput(form.slurl),
    region_name: String(form.region_name || "").trim(),
    category: GRIDSTER_PLACE_CATEGORIES.includes(form.category) ? form.category : "hangouts",
    vibe_tags: normalizeTags(form.vibe_tags),
    maturity_rating: GRIDSTER_MATURITY_RATINGS.includes(form.maturity_rating)
      ? form.maturity_rating
      : "general",
    is_open_now: Boolean(form.is_open_now),
  };
}

export function normalizeGridsterEventForm(form) {
  return {
    title: String(form.title || "").trim(),
    description: String(form.description || "").trim(),
    photo_url: normalizeUrl(form.photo_url),
    slurl: normalizeSlurlInput(form.slurl),
    region_name: String(form.region_name || "").trim(),
    event_type: GRIDSTER_EVENT_TYPES.includes(form.event_type) ? form.event_type : "live_dj",
    when_label: String(form.when_label || "").trim(),
    maturity_rating: GRIDSTER_MATURITY_RATINGS.includes(form.maturity_rating)
      ? form.maturity_rating
      : "general",
    place_id: form.place_id || null,
  };
}

// ---- Places ----

export async function fetchGridsterPlaces() {
  const { data, error } = await supabase
    .from(GRIDSTER_PLACES_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function createGridsterPlace(userId, form) {
  const place = normalizeGridsterPlaceForm(form);
  const { data, error } = await supabase
    .from(GRIDSTER_PLACES_TABLE)
    .insert({ ...place, user_id: userId })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateGridsterPlace(placeId, userId, updates) {
  const { data, error } = await supabase
    .from(GRIDSTER_PLACES_TABLE)
    .update(updates)
    .eq("id", placeId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteGridsterPlace(placeId, userId) {
  const { error } = await supabase
    .from(GRIDSTER_PLACES_TABLE)
    .delete()
    .eq("id", placeId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function fetchFeaturedPhotoSpots(limit = 6) {
  const { data: places, error } = await supabase
    .from(GRIDSTER_PLACES_TABLE)
    .select("*")
    .eq("category", "photo_spots")
    .not("photo_url", "is", null)
    .neq("photo_url", "")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const placeIds = (places || []).map((place) => place.id);
  let favoriteCounts = {};

  if (placeIds.length) {
    const { data: favorites, error: favoritesError } = await supabase
      .from(GRIDSTER_FAVORITE_PLACES_TABLE)
      .select("place_id")
      .in("place_id", placeIds);

    if (favoritesError) {
      throw favoritesError;
    }

    favoriteCounts = (favorites || []).reduce((counts, favorite) => {
      counts[favorite.place_id] = (counts[favorite.place_id] || 0) + 1;
      return counts;
    }, {});
  }

  return (places || [])
    .map((place) => ({ ...place, favorite_count: favoriteCounts[place.id] || 0 }))
    .sort((a, b) => b.favorite_count - a.favorite_count || new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

export async function reportBrokenTeleport(placeId) {
  const { data, error } = await supabase.rpc("report_broken_teleport", {
    target_place_id: placeId,
  });

  if (error) {
    throw error;
  }

  return data;
}

// ---- Events ----

export async function fetchGridsterEvents() {
  const { data, error } = await supabase
    .from(GRIDSTER_EVENTS_TABLE)
    .select("*, gridster_places(id, title, slurl, region_name)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function createGridsterEvent(userId, form) {
  const event = normalizeGridsterEventForm(form);
  const { data, error } = await supabase
    .from(GRIDSTER_EVENTS_TABLE)
    .insert({ ...event, user_id: userId })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateGridsterEvent(eventId, userId, updates) {
  const { data, error } = await supabase
    .from(GRIDSTER_EVENTS_TABLE)
    .update(updates)
    .eq("id", eventId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteGridsterEvent(eventId, userId) {
  const { error } = await supabase
    .from(GRIDSTER_EVENTS_TABLE)
    .delete()
    .eq("id", eventId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
