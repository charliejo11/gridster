import { supabase } from "./supabaseClient";
import { GRIDSTER_MATURITY_RATING_LABELS, GRIDSTER_MATURITY_RATINGS } from "./gridsterPlaces";

export const GRIDSTER_BOOKING_LISTINGS_TABLE = "gridster_booking_listings";

export { GRIDSTER_MATURITY_RATINGS, GRIDSTER_MATURITY_RATING_LABELS };

export const GRIDSTER_BOOKING_POST_TYPES = ["venue_seeking", "talent_available"];

export const GRIDSTER_BOOKING_POST_TYPE_LABELS = {
  venue_seeking: "Looking to Hire",
  talent_available: "Available for Bookings",
};

export const GRIDSTER_BOOKING_ROLE_TYPES = ["dj", "host", "dancer", "manager"];

export const GRIDSTER_BOOKING_ROLE_TYPE_LABELS = {
  dj: "DJ",
  host: "Host",
  dancer: "Dancer",
  manager: "Manager",
};

export const GRIDSTER_BOOKING_GENRES = [
  "rock",
  "top_40",
  "edm",
  "country",
  "metal",
  "hip_hop",
  "pop",
  "alternative",
  "house",
  "trance",
  "jazz_lounge",
  "classic_rock",
  "mixed_variety",
  "other",
];

export const GRIDSTER_BOOKING_GENRE_LABELS = {
  rock: "Rock",
  top_40: "Top 40",
  edm: "EDM",
  country: "Country",
  metal: "Metal",
  hip_hop: "Hip-Hop",
  pop: "Pop",
  alternative: "Alternative",
  house: "House",
  trance: "Trance",
  jazz_lounge: "Jazz / Lounge",
  classic_rock: "Classic Rock",
  mixed_variety: "Mixed / Variety",
  other: "Other",
};

export const GRIDSTER_BOOKING_TIMEZONES = [
  "slt_pacific",
  "us_eastern",
  "us_central",
  "us_mountain",
  "uk_gmt",
  "europe_cet",
  "australia_aet",
  "other_flexible",
];

export const GRIDSTER_BOOKING_TIMEZONE_LABELS = {
  slt_pacific: "SLT (Pacific)",
  us_eastern: "US Eastern",
  us_central: "US Central",
  us_mountain: "US Mountain",
  uk_gmt: "UK / GMT",
  europe_cet: "Europe (CET)",
  australia_aet: "Australia (AET)",
  other_flexible: "Other / Flexible",
};

export const GRIDSTER_BOOKING_PAY_TYPES = ["paid", "tips_only", "volunteer", "negotiable"];

export const GRIDSTER_BOOKING_PAY_TYPE_LABELS = {
  paid: "Paid",
  tips_only: "Tips Only",
  volunteer: "Volunteer",
  negotiable: "Negotiable",
};

export const GRIDSTER_BOOKING_EXPERIENCE_LEVELS = [
  "any",
  "beginner",
  "intermediate",
  "experienced",
  "veteran",
];

export const GRIDSTER_BOOKING_EXPERIENCE_LEVEL_LABELS = {
  any: "Any Experience",
  beginner: "Beginner",
  intermediate: "Intermediate",
  experienced: "Experienced",
  veteran: "Veteran",
};

export const GRIDSTER_BOOKING_STATUSES = ["open", "filled"];

export const GRIDSTER_BOOKING_STATUS_LABELS = {
  open: "Open",
  filled: "Filled",
};

export function normalizeGridsterBookingListingForm(form) {
  return {
    post_type: GRIDSTER_BOOKING_POST_TYPES.includes(form.post_type) ? form.post_type : "venue_seeking",
    role_type: GRIDSTER_BOOKING_ROLE_TYPES.includes(form.role_type) ? form.role_type : "dj",
    title: String(form.title || "").trim(),
    description: String(form.description || "").trim(),
    genre: GRIDSTER_BOOKING_GENRES.includes(form.genre) ? form.genre : "mixed_variety",
    region_name: String(form.region_name || "").trim(),
    slurl: String(form.slurl || "").trim(),
    timezone: GRIDSTER_BOOKING_TIMEZONES.includes(form.timezone) ? form.timezone : "slt_pacific",
    pay_type: GRIDSTER_BOOKING_PAY_TYPES.includes(form.pay_type) ? form.pay_type : "negotiable",
    pay_details: String(form.pay_details || "").trim(),
    voice_required: Boolean(form.voice_required),
    maturity_rating: GRIDSTER_MATURITY_RATINGS.includes(form.maturity_rating) ? form.maturity_rating : "general",
    experience_level: GRIDSTER_BOOKING_EXPERIENCE_LEVELS.includes(form.experience_level)
      ? form.experience_level
      : "any",
    contact_name: String(form.contact_name || "").trim(),
    contact_note: String(form.contact_note || "").trim(),
  };
}

export async function fetchGridsterBookingListings() {
  const { data, error } = await supabase
    .from(GRIDSTER_BOOKING_LISTINGS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function createGridsterBookingListing(userId, form) {
  const listing = normalizeGridsterBookingListingForm(form);
  const { data, error } = await supabase
    .from(GRIDSTER_BOOKING_LISTINGS_TABLE)
    .insert({ ...listing, user_id: userId })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateGridsterBookingListing(listingId, userId, updates) {
  const { data, error } = await supabase
    .from(GRIDSTER_BOOKING_LISTINGS_TABLE)
    .update(updates)
    .eq("id", listingId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteGridsterBookingListing(listingId, userId) {
  const { error } = await supabase
    .from(GRIDSTER_BOOKING_LISTINGS_TABLE)
    .delete()
    .eq("id", listingId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
