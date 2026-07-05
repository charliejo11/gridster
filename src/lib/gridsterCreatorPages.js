import { supabase } from "./supabaseClient";
import { GRIDSTER_MATURITY_RATING_LABELS, GRIDSTER_MATURITY_RATINGS } from "./gridsterPlaces";

export const GRIDSTER_CREATOR_PAGES_TABLE = "gridster_creator_pages";
export const GRIDSTER_CREATOR_PAGE_HIGHLIGHTS_TABLE = "gridster_creator_page_highlights";

export { GRIDSTER_MATURITY_RATINGS, GRIDSTER_MATURITY_RATING_LABELS };

export const GRIDSTER_PAGE_TYPES = [
  "store",
  "dj",
  "blogger",
  "photographer",
  "event_host",
  "roleplay_creator",
  "club",
  "venue",
  "community",
];

export const GRIDSTER_PAGE_TYPE_LABELS = {
  store: "Store",
  dj: "DJ",
  blogger: "Blogger",
  photographer: "Photographer",
  event_host: "Event Host",
  roleplay_creator: "Roleplay Creator",
  club: "Club",
  venue: "Venue",
  community: "Community",
};

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function normalizeCreatorPageForm(form) {
  return {
    page_type: GRIDSTER_PAGE_TYPES.includes(form.page_type) ? form.page_type : "store",
    name: String(form.name || "").trim(),
    tagline: String(form.tagline || "").trim(),
    bio: String(form.bio || "").trim(),
    avatar_url: normalizeUrl(form.avatar_url),
    banner_url: normalizeUrl(form.banner_url),
    region_name: String(form.region_name || "").trim(),
    slurl: String(form.slurl || "").trim(),
    website_url: normalizeUrl(form.website_url),
    marketplace_url: normalizeUrl(form.marketplace_url),
    maturity_rating: GRIDSTER_MATURITY_RATINGS.includes(form.maturity_rating) ? form.maturity_rating : "general",
  };
}

export function normalizeHighlightForm(form) {
  return {
    title: String(form.title || "").trim(),
    description: String(form.description || "").trim(),
    photo_url: normalizeUrl(form.photo_url),
    link_url: normalizeUrl(form.link_url),
  };
}

export async function fetchCreatorPagesDirectory(pageType) {
  let query = supabase
    .from(GRIDSTER_CREATOR_PAGES_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (pageType) {
    query = query.eq("page_type", pageType);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchMyCreatorPages(userId) {
  const { data, error } = await supabase
    .from(GRIDSTER_CREATOR_PAGES_TABLE)
    .select("*")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchCreatorPage(pageId) {
  const { data, error } = await supabase
    .from(GRIDSTER_CREATOR_PAGES_TABLE)
    .select("*")
    .eq("id", pageId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createCreatorPage(userId, form) {
  const page = normalizeCreatorPageForm(form);
  const { data, error } = await supabase
    .from(GRIDSTER_CREATOR_PAGES_TABLE)
    .insert({ ...page, owner_user_id: userId })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCreatorPage(pageId, userId, form) {
  const page = normalizeCreatorPageForm(form);
  const { data, error } = await supabase
    .from(GRIDSTER_CREATOR_PAGES_TABLE)
    .update(page)
    .eq("id", pageId)
    .eq("owner_user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteCreatorPage(pageId, userId) {
  const { error } = await supabase
    .from(GRIDSTER_CREATOR_PAGES_TABLE)
    .delete()
    .eq("id", pageId)
    .eq("owner_user_id", userId);

  if (error) {
    throw error;
  }
}

export async function fetchPageHighlights(pageId) {
  const { data, error } = await supabase
    .from(GRIDSTER_CREATOR_PAGE_HIGHLIGHTS_TABLE)
    .select("*")
    .eq("page_id", pageId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function addPageHighlight(pageId, form, sortOrder = 0) {
  const highlight = normalizeHighlightForm(form);
  const { data, error } = await supabase
    .from(GRIDSTER_CREATOR_PAGE_HIGHLIGHTS_TABLE)
    .insert({ ...highlight, page_id: pageId, sort_order: sortOrder })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function removePageHighlight(highlightId) {
  const { error } = await supabase
    .from(GRIDSTER_CREATOR_PAGE_HIGHLIGHTS_TABLE)
    .delete()
    .eq("id", highlightId);

  if (error) {
    throw error;
  }
}
