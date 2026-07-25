import { supabase } from "./supabaseClient";

// Real, server-tracked engagement for gridster_posts. Replaces the
// previous localStorage-only "likedPosts"/"savedPosts" flags and the
// hardcoded sample comment list - this is what the organic Trending
// score in gridsterTrending.js actually reads.

export const GRIDSTER_POST_REACTIONS_TABLE = "gridster_post_reactions";
export const GRIDSTER_POST_COMMENTS_TABLE = "gridster_post_comments";
export const GRIDSTER_POST_SAVES_TABLE = "gridster_post_saves";
export const GRIDSTER_POST_SHARES_TABLE = "gridster_post_shares";
export const GRIDSTER_POST_CLICKS_TABLE = "gridster_post_clicks";
export const GRIDSTER_POST_ENGAGEMENT_STATS_VIEW = "gridster_post_engagement_stats";

export const GRIDSTER_SHARE_TYPES = ["repost", "message", "copy_link", "copy_slurl"];

// ---------------------------------------------------------------------------
// Engagement stats (organic Trending input)
// ---------------------------------------------------------------------------

export async function fetchEngagementStats(postIds) {
  if (!postIds?.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from(GRIDSTER_POST_ENGAGEMENT_STATS_VIEW)
    .select("*")
    .in("post_id", postIds);

  if (error) {
    throw error;
  }

  return new Map((data || []).map((row) => [row.post_id, row]));
}

// ---------------------------------------------------------------------------
// Reactions (likes)
// ---------------------------------------------------------------------------

export async function fetchMyReactedPostIds(userId, postIds) {
  if (!userId || !postIds?.length) {
    return new Set();
  }

  const { data, error } = await supabase
    .from(GRIDSTER_POST_REACTIONS_TABLE)
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  if (error) {
    throw error;
  }

  return new Set((data || []).map((row) => row.post_id));
}

export async function reactToPost(userId, postId) {
  const { error } = await supabase
    .from(GRIDSTER_POST_REACTIONS_TABLE)
    .insert({ user_id: userId, post_id: postId });

  if (error && error.code !== "23505") {
    throw error;
  }
}

export async function unreactToPost(userId, postId) {
  const { error } = await supabase
    .from(GRIDSTER_POST_REACTIONS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("post_id", postId);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Saves
// ---------------------------------------------------------------------------

export async function fetchMySavedPostIds(userId, postIds) {
  if (!userId || !postIds?.length) {
    return new Set();
  }

  const { data, error } = await supabase
    .from(GRIDSTER_POST_SAVES_TABLE)
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  if (error) {
    throw error;
  }

  return new Set((data || []).map((row) => row.post_id));
}

export async function savePost(userId, postId) {
  const { error } = await supabase
    .from(GRIDSTER_POST_SAVES_TABLE)
    .insert({ user_id: userId, post_id: postId });

  if (error && error.code !== "23505") {
    throw error;
  }
}

export async function unsavePost(userId, postId) {
  const { error } = await supabase
    .from(GRIDSTER_POST_SAVES_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("post_id", postId);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function fetchComments(postId) {
  const { data, error } = await supabase
    .from(GRIDSTER_POST_COMMENTS_TABLE)
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function postComment(userId, postId, body) {
  const trimmed = String(body || "").trim();

  if (!trimmed) {
    throw new Error("Comment cannot be empty.");
  }

  const { data, error } = await supabase
    .from(GRIDSTER_POST_COMMENTS_TABLE)
    .insert({ user_id: userId, post_id: postId, body: trimmed })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// ---------------------------------------------------------------------------
// Shares
// ---------------------------------------------------------------------------

export async function logShare(userId, postId, shareType = "repost") {
  const { error } = await supabase
    .from(GRIDSTER_POST_SHARES_TABLE)
    .insert({
      user_id: userId,
      post_id: postId,
      share_type: GRIDSTER_SHARE_TYPES.includes(shareType) ? shareType : "repost",
    });

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Profile / teleport clicks
// ---------------------------------------------------------------------------

export async function logPostClick(postId, userId, clickType) {
  const { error } = await supabase
    .from(GRIDSTER_POST_CLICKS_TABLE)
    .insert({ post_id: postId, user_id: userId || null, click_type: clickType });

  if (error) {
    throw error;
  }
}
