import { supabase } from "./supabaseClient";
import { GRIDSTER_MATURITY_RATING_LABELS, GRIDSTER_MATURITY_RATINGS } from "./gridsterPlaces";

export const GRIDSTER_GROUPS_TABLE = "gridster_groups";
export const GRIDSTER_GROUP_MEMBERS_TABLE = "gridster_group_members";
export const GRIDSTER_GROUP_POSTS_TABLE = "gridster_group_posts";

export { GRIDSTER_MATURITY_RATINGS, GRIDSTER_MATURITY_RATING_LABELS };

export const GRIDSTER_GROUP_CATEGORIES = [
  "clubs",
  "stores",
  "rp_sims",
  "fandoms",
  "bloggers",
  "photographers",
  "adult_communities",
  "music_scenes",
];

export const GRIDSTER_GROUP_CATEGORY_LABELS = {
  clubs: "Clubs",
  stores: "Stores",
  rp_sims: "RP Sims",
  fandoms: "Fandoms",
  bloggers: "Bloggers",
  photographers: "Photographers",
  adult_communities: "Adult Communities",
  music_scenes: "Music Scenes",
};

export const GRIDSTER_GROUP_POST_TYPES = ["post", "event", "announcement"];

export const GRIDSTER_GROUP_POST_TYPE_LABELS = {
  post: "Post",
  event: "Event",
  announcement: "Announcement",
};

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function normalizeGroupForm(form) {
  return {
    name: String(form.name || "").trim(),
    description: String(form.description || "").trim(),
    category: GRIDSTER_GROUP_CATEGORIES.includes(form.category) ? form.category : "clubs",
    region_name: String(form.region_name || "").trim(),
    slurl: String(form.slurl || "").trim(),
    photo_url: normalizeUrl(form.photo_url),
    maturity_rating: GRIDSTER_MATURITY_RATINGS.includes(form.maturity_rating) ? form.maturity_rating : "general",
  };
}

export function normalizeGroupPostForm(form) {
  return {
    post_type: GRIDSTER_GROUP_POST_TYPES.includes(form.post_type) ? form.post_type : "post",
    content: String(form.content || "").trim(),
    photo_url: normalizeUrl(form.photo_url),
    when_label: String(form.when_label || "").trim(),
    region_name: String(form.region_name || "").trim(),
    slurl: String(form.slurl || "").trim(),
  };
}

export async function fetchGroups() {
  const { data, error } = await supabase
    .from(GRIDSTER_GROUPS_TABLE)
    .select("*")
    .order("member_count", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchGroup(groupId) {
  const { data, error } = await supabase
    .from(GRIDSTER_GROUPS_TABLE)
    .select("*")
    .eq("id", groupId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createGroup(userId, form) {
  const group = normalizeGroupForm(form);
  const { data, error } = await supabase
    .from(GRIDSTER_GROUPS_TABLE)
    .insert({ ...group, owner_user_id: userId })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteGroup(groupId, userId) {
  const { error } = await supabase
    .from(GRIDSTER_GROUPS_TABLE)
    .delete()
    .eq("id", groupId)
    .eq("owner_user_id", userId);

  if (error) {
    throw error;
  }
}

export async function fetchGroupMembership(groupId, userId) {
  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_MEMBERS_TABLE)
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function joinGroup(groupId, userId, displayName) {
  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_MEMBERS_TABLE)
    .insert({ group_id: groupId, user_id: userId, display_name: displayName || null })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function leaveGroup(groupId, userId) {
  const { error } = await supabase
    .from(GRIDSTER_GROUP_MEMBERS_TABLE)
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function fetchGroupMembers(groupId) {
  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_MEMBERS_TABLE)
    .select("*")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchGroupPosts(groupId) {
  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_POSTS_TABLE)
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function createGroupPost(groupId, userId, form) {
  const post = normalizeGroupPostForm(form);
  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_POSTS_TABLE)
    .insert({ ...post, group_id: groupId, user_id: userId, author_name: form.author_name || null })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteGroupPost(postId, userId) {
  const { error } = await supabase
    .from(GRIDSTER_GROUP_POSTS_TABLE)
    .delete()
    .eq("id", postId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
