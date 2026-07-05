import { supabase } from "./supabaseClient";

export const GRIDSTER_POSTS_TABLE = "gridster_posts";

export const GRIDSTER_POST_TYPES = ["general", "photo", "blog", "store"];

export const GRIDSTER_POST_TYPE_LABELS = {
  general: "Post",
  photo: "Photo",
  blog: "Blog",
  store: "Store",
};

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeTags(value) {
  const rawTags = Array.isArray(value) ? value : String(value || "").split(",");

  return [...new Set(rawTags.map((tag) => tag.trim()).filter(Boolean))];
}

export function normalizeGridsterPostForm(form) {
  return {
    post_type: GRIDSTER_POST_TYPES.includes(form.post_type) ? form.post_type : "general",
    content: String(form.content || "").trim(),
    photo_url: normalizeUrl(form.photo_url),
    link_url: normalizeUrl(form.link_url),
    region_name: String(form.region_name || "").trim(),
    slurl: String(form.slurl || "").trim(),
    tags: normalizeTags(form.tags),
  };
}

export async function fetchRecentPosts(limit = 20) {
  const { data, error } = await supabase
    .from(GRIDSTER_POSTS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data;
}

export async function createGridsterPost(userId, form) {
  const post = normalizeGridsterPostForm(form);
  const { data, error } = await supabase
    .from(GRIDSTER_POSTS_TABLE)
    .insert({ ...post, user_id: userId, author_name: form.author_name || null })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteGridsterPost(postId, userId) {
  const { error } = await supabase
    .from(GRIDSTER_POSTS_TABLE)
    .delete()
    .eq("id", postId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
