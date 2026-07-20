import { supabase } from "./supabaseClient";

export const GRIDSTER_PROFILE_TABLE = "profiles";
export const GRIDSTER_FAVORITE_PLACES_TABLE = "gridster_favorite_places";
export const DEFAULT_BLING_BITS = 1250;
export const GRIDSTER_PROFILE_UPDATED_EVENT = "gridster:profile-updated";
export const GRIDSTER_PROFILE_IMAGES_BUCKET = "profile-images";
export const GRIDSTER_MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
export const GRIDSTER_ALLOWED_PROFILE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const PROFILE_IMAGE_EXTENSIONS_BY_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function notifyGridsterProfileUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GRIDSTER_PROFILE_UPDATED_EVENT));
  }
}

export const GRIDSTER_AVAILABLE_FOR_TAGS = [
  "dj",
  "host",
  "blogger",
  "photographer",
  "creator",
  "model",
  "club_owner",
  "roleplayer",
  "decorator",
  "shopper",
];

export const GRIDSTER_AVAILABLE_FOR_LABELS = {
  dj: "DJ",
  host: "Host",
  blogger: "Blogger",
  photographer: "Photographer",
  creator: "Creator",
  model: "Model",
  club_owner: "Club Owner",
  roleplayer: "Roleplayer",
  decorator: "Decorator",
  shopper: "Shopper",
};

export const GRIDSTER_MOOD_PRESETS = [
  "DJing",
  "Shopping",
  "Blogging",
  "Taking Photos",
  "At a Club",
  "AFK But Judging",
  "Looking for Trouble",
  "Open to Chat",
  "Do Not Disturb",
];

export const GRIDSTER_MAX_FEATURED_PHOTOS = 6;

export const GRIDSTER_CREATOR_TYPES = [
  "Resident",
  "Blogger",
  "Photographer",
  "DJ",
  "Store Owner",
  "Club Owner",
  "Sim Owner",
  "Event Host",
  "Roleplay Creator",
];

export const GRIDSTER_INTEREST_TAGS = [
  "Fashion",
  "Events",
  "Music",
  "Nightlife",
  "Shopping",
  "Photography",
  "Roleplay",
  "Decor",
  "Adult",
  "Blogging",
  "Beaches",
  "Goth",
  "Fantasy",
  "Sci-Fi",
];

export const EMPTY_GRIDSTER_PROFILE = {
  display_name: "",
  sl_username: "",
  avatar_url: "",
  banner_url: "",
  bio: "",
  creator_type: "Resident",
  interests: [],
  flickr_url: "",
  primfeed_url: "",
  instagram_url: "",
  marketplace_url: "",
  discord_name: "",
  bling_bits: DEFAULT_BLING_BITS,
  owned_bling_items: [],
  equipped_profile_background: "",
  equipped_profile_frame: "",
  equipped_glow_effect: "",
  equipped_badges: [],
  available_for: [],
  current_mood: "",
  featured_photo_urls: [],
};

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function normalizeGridsterProfileForm(form) {
  const creatorType = GRIDSTER_CREATOR_TYPES.includes(form.creator_type)
    ? form.creator_type
    : "Resident";
  const interests = Array.isArray(form.interests)
    ? form.interests.filter((tag) => GRIDSTER_INTEREST_TAGS.includes(tag))
    : [];
  const availableFor = Array.isArray(form.available_for)
    ? form.available_for.filter((tag) => GRIDSTER_AVAILABLE_FOR_TAGS.includes(tag))
    : [];
  const featuredPhotoUrls = Array.isArray(form.featured_photo_urls)
    ? form.featured_photo_urls
        .map((url) => normalizeUrl(url))
        .filter(Boolean)
        .slice(0, GRIDSTER_MAX_FEATURED_PHOTOS)
    : [];

  return {
    display_name: String(form.display_name || "").trim(),
    sl_username: String(form.sl_username || "").trim().toLowerCase(),
    avatar_url: normalizeUrl(form.avatar_url),
    banner_url: normalizeUrl(form.banner_url),
    bio: String(form.bio || "").trim(),
    creator_type: creatorType,
    interests,
    flickr_url: normalizeUrl(form.flickr_url),
    primfeed_url: normalizeUrl(form.primfeed_url),
    instagram_url: normalizeUrl(form.instagram_url),
    marketplace_url: normalizeUrl(form.marketplace_url),
    discord_name: String(form.discord_name || "").trim(),
    available_for: availableFor,
    current_mood: String(form.current_mood || "").trim(),
    featured_photo_urls: featuredPhotoUrls,
  };
}

export async function fetchGridsterProfile(userId) {
  const { data, error } = await supabase
    .from(GRIDSTER_PROFILE_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

// Batch profile lookup for feed rendering: posts.user_id references
// auth.users(id), and profiles.user_id also references auth.users(id) -
// there's no direct FK between gridster_posts and profiles for PostgREST
// to embed automatically, so the feed fetches profiles separately and
// maps them by user_id here.
export async function fetchProfilesByUserIds(userIds) {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];

  if (!uniqueIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from(GRIDSTER_PROFILE_TABLE)
    .select("user_id, display_name, sl_username, avatar_url")
    .in("user_id", uniqueIds);

  if (error) {
    throw error;
  }

  return new Map((data || []).map((profile) => [profile.user_id, profile]));
}

export async function ensureGridsterProfile(user) {
  if (!user?.id) {
    return null;
  }

  const existingProfile = await fetchGridsterProfile(user.id);

  if (existingProfile) {
    return existingProfile;
  }

  const displayName = user.email?.split("@")[0] ?? "";
  const { data, error } = await supabase
    .from(GRIDSTER_PROFILE_TABLE)
    .upsert(
      {
        user_id: user.id,
        display_name: displayName,
        bling_bits: DEFAULT_BLING_BITS,
        owned_bling_items: [],
        equipped_badges: [],
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveGridsterProfile(userId, form) {
  const profile = normalizeGridsterProfileForm(form);
  const { data, error } = await supabase
    .from(GRIDSTER_PROFILE_TABLE)
    .upsert(
      {
        ...profile,
        user_id: userId,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  notifyGridsterProfileUpdated();

  return data;
}

export async function updateGridsterProfile(userId, updates) {
  const { data, error } = await supabase
    .from(GRIDSTER_PROFILE_TABLE)
    .update(updates)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  notifyGridsterProfileUpdated();

  return data;
}

export async function uploadGridsterProfileImage(userId, file, kind) {
  if (!GRIDSTER_ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Please choose a PNG, JPEG, WEBP, or GIF image.");
  }

  if (file.size > GRIDSTER_MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("Images must be 5MB or smaller.");
  }

  const extension = PROFILE_IMAGE_EXTENSIONS_BY_TYPE[file.type] || "jpg";
  const path = `${userId}/${kind}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(GRIDSTER_PROFILE_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(GRIDSTER_PROFILE_IMAGES_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}

const PROFILE_STRENGTH_CHECKS = [
  (profile) => Boolean(profile?.display_name?.trim()),
  (profile) => Boolean(profile?.sl_username?.trim()),
  (profile) => Boolean(profile?.bio?.trim()),
  (profile) => Boolean(profile?.avatar_url?.trim()),
  (profile) => Boolean(profile?.interests?.length),
];

export function computeGridsterProfileStrength(profile) {
  if (!profile) {
    return 0;
  }

  const metChecks = PROFILE_STRENGTH_CHECKS.filter((check) => check(profile)).length;

  return Math.round((metChecks / PROFILE_STRENGTH_CHECKS.length) * 100);
}

export async function fetchResidentProfile(userId) {
  return fetchGridsterProfile(userId);
}

export async function fetchResidentDirectory() {
  const { data, error } = await supabase
    .from(GRIDSTER_PROFILE_TABLE)
    .select("*")
    .not("display_name", "is", null)
    .neq("display_name", "")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchFavoritePlaces(userId) {
  const { data, error } = await supabase
    .from(GRIDSTER_FAVORITE_PLACES_TABLE)
    .select("id, place_id, gridster_places(id, title, category, region_name, slurl, photo_url)")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return data;
}

export async function addFavoritePlace(userId, placeId) {
  const { data, error } = await supabase
    .from(GRIDSTER_FAVORITE_PLACES_TABLE)
    .insert({ user_id: userId, place_id: placeId })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function removeFavoritePlace(userId, placeId) {
  const { error } = await supabase
    .from(GRIDSTER_FAVORITE_PLACES_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("place_id", placeId);

  if (error) {
    throw error;
  }
}
