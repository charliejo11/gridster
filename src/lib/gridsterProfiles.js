import { supabase } from "./supabaseClient";

export const GRIDSTER_PROFILE_TABLE = "profiles";
export const DEFAULT_BLING_BITS = 1250;

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

  return data;
}
