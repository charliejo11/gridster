import { supabase } from "./supabaseClient";
import { createNotification } from "./gridsterNotifications";

export const GRIDSTER_GROUP_POSTS_TABLE = "gridster_group_posts";
export const GRIDSTER_GROUP_POST_COMMENTS_TABLE = "gridster_group_post_comments";
export const GRIDSTER_GROUP_POST_LIKES_TABLE = "gridster_group_post_likes";
export const GRIDSTER_GROUP_COMMENT_LIKES_TABLE = "gridster_group_comment_likes";
export const GRIDSTER_GROUP_POST_HIDES_TABLE = "gridster_group_post_hides";
export const GRIDSTER_GROUP_POST_REPORTS_TABLE = "gridster_group_post_reports";

// ---------------------------------------------------------------------------
// Feed posts
// ---------------------------------------------------------------------------

export async function fetchGroupFeedPosts(groupId, { limit = 20, before = null } = {}) {
  let query = supabase
    .from(GRIDSTER_GROUP_POSTS_TABLE)
    .select("*")
    .eq("group_id", groupId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function fetchGroupPostById(postId) {
  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_POSTS_TABLE)
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createGroupFeedPost(userId, groupId, form) {
  const mediaUrls = (form.media_urls || []).filter(Boolean);

  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_POSTS_TABLE)
    .insert({
      group_id: groupId,
      user_id: userId,
      author_name: form.author_name || null,
      post_type: form.post_type || "post",
      content: String(form.content || "").trim(),
      photo_url: mediaUrls[0] || null,
      media_urls: mediaUrls,
      link_url: form.link_url || null,
      slurl: form.slurl || null,
      when_label: form.when_label || null,
      region_name: form.region_name || null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateGroupFeedPost(postId, userId, updates) {
  const mediaUrls = updates.media_urls ? updates.media_urls.filter(Boolean) : undefined;

  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_POSTS_TABLE)
    .update({
      content: updates.content,
      ...(mediaUrls ? { media_urls: mediaUrls, photo_url: mediaUrls[0] || null } : {}),
      link_url: updates.link_url ?? null,
      slurl: updates.slurl ?? null,
      content_edited_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteGroupFeedPost(postId, userId) {
  const { error } = await supabase
    .from(GRIDSTER_GROUP_POSTS_TABLE)
    .delete()
    .eq("id", postId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function fetchGroupPostComments(postId) {
  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_POST_COMMENTS_TABLE)
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function postGroupComment(userId, postId, content, { parentCommentId = null, groupId = null, postAuthorId = null, parentAuthorId = null } = {}) {
  const trimmed = String(content || "").trim();

  if (!trimmed) {
    throw new Error("Comment cannot be empty.");
  }

  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_POST_COMMENTS_TABLE)
    .insert({ post_id: postId, author_user_id: userId, parent_comment_id: parentCommentId, content: trimmed })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  if (postAuthorId) {
    createNotification({
      p_recipient_user_id: postAuthorId,
      p_actor_user_id: userId,
      p_notification_type: "group_post_commented",
      p_related_group_id: groupId,
      p_related_group_post_id: postId,
      p_related_group_comment_id: data.id,
      p_message: trimmed.slice(0, 140),
    });
  }

  if (parentAuthorId && parentAuthorId !== postAuthorId) {
    createNotification({
      p_recipient_user_id: parentAuthorId,
      p_actor_user_id: userId,
      p_notification_type: "group_comment_reply",
      p_related_group_id: groupId,
      p_related_group_post_id: postId,
      p_related_group_comment_id: data.id,
      p_message: trimmed.slice(0, 140),
    });
  }

  return data;
}

export async function updateGroupComment(commentId, userId, content) {
  const trimmed = String(content || "").trim();

  if (!trimmed) {
    throw new Error("Comment cannot be empty.");
  }

  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_POST_COMMENTS_TABLE)
    .update({ content: trimmed, content_edited_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("author_user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteGroupComment(commentId, userId) {
  const { error } = await supabase
    .from(GRIDSTER_GROUP_POST_COMMENTS_TABLE)
    .delete()
    .eq("id", commentId)
    .eq("author_user_id", userId);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Engagement: likes + counts
// ---------------------------------------------------------------------------

export async function fetchGroupPostEngagement(postIds) {
  if (!postIds?.length) {
    return new Map();
  }

  const [likesResult, commentsResult] = await Promise.all([
    supabase.from(GRIDSTER_GROUP_POST_LIKES_TABLE).select("post_id").in("post_id", postIds),
    supabase.from(GRIDSTER_GROUP_POST_COMMENTS_TABLE).select("post_id").in("post_id", postIds),
  ]);

  if (likesResult.error) throw likesResult.error;
  if (commentsResult.error) throw commentsResult.error;

  const stats = new Map(postIds.map((id) => [id, { likeCount: 0, commentCount: 0 }]));

  for (const row of likesResult.data || []) {
    const entry = stats.get(row.post_id);
    if (entry) entry.likeCount += 1;
  }

  for (const row of commentsResult.data || []) {
    const entry = stats.get(row.post_id);
    if (entry) entry.commentCount += 1;
  }

  return stats;
}

export async function fetchMyGroupPostLikes(userId, postIds) {
  if (!userId || !postIds?.length) {
    return new Set();
  }

  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_POST_LIKES_TABLE)
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  if (error) {
    throw error;
  }

  return new Set((data || []).map((row) => row.post_id));
}

export async function likeGroupPost(userId, postId, { groupId = null, postAuthorId = null } = {}) {
  const { error } = await supabase
    .from(GRIDSTER_GROUP_POST_LIKES_TABLE)
    .insert({ post_id: postId, user_id: userId });

  if (error && error.code !== "23505") {
    throw error;
  }

  if (postAuthorId) {
    createNotification({
      p_recipient_user_id: postAuthorId,
      p_actor_user_id: userId,
      p_notification_type: "group_post_liked",
      p_related_group_id: groupId,
      p_related_group_post_id: postId,
    });
  }
}

export async function unlikeGroupPost(userId, postId) {
  const { error } = await supabase
    .from(GRIDSTER_GROUP_POST_LIKES_TABLE)
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function fetchGroupCommentLikeCounts(commentIds) {
  if (!commentIds?.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_COMMENT_LIKES_TABLE)
    .select("comment_id")
    .in("comment_id", commentIds);

  if (error) {
    throw error;
  }

  const counts = new Map(commentIds.map((id) => [id, 0]));

  for (const row of data || []) {
    counts.set(row.comment_id, (counts.get(row.comment_id) || 0) + 1);
  }

  return counts;
}

export async function fetchMyGroupCommentLikes(userId, commentIds) {
  if (!userId || !commentIds?.length) {
    return new Set();
  }

  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_COMMENT_LIKES_TABLE)
    .select("comment_id")
    .eq("user_id", userId)
    .in("comment_id", commentIds);

  if (error) {
    throw error;
  }

  return new Set((data || []).map((row) => row.comment_id));
}

// Comment likes are not part of the notification spec (only post likes,
// comments, replies, mentions, and pins are) - no createNotification call
// here on purpose.
export async function likeGroupComment(userId, commentId) {
  const { error } = await supabase
    .from(GRIDSTER_GROUP_COMMENT_LIKES_TABLE)
    .insert({ comment_id: commentId, user_id: userId });

  if (error && error.code !== "23505") {
    throw error;
  }
}

export async function unlikeGroupComment(userId, commentId) {
  const { error } = await supabase
    .from(GRIDSTER_GROUP_COMMENT_LIKES_TABLE)
    .delete()
    .eq("comment_id", commentId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Hide + report
// ---------------------------------------------------------------------------

export async function fetchMyHiddenGroupPostIds(userId, postIds) {
  if (!userId || !postIds?.length) {
    return new Set();
  }

  const { data, error } = await supabase
    .from(GRIDSTER_GROUP_POST_HIDES_TABLE)
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  if (error) {
    throw error;
  }

  return new Set((data || []).map((row) => row.post_id));
}

export async function hideGroupPostForUser(userId, postId) {
  const { error } = await supabase
    .from(GRIDSTER_GROUP_POST_HIDES_TABLE)
    .insert({ user_id: userId, post_id: postId });

  if (error && error.code !== "23505") {
    throw error;
  }
}

export async function reportGroupPost(reporterUserId, postId, { commentId = null, reason = "Spam" } = {}) {
  const { error } = await supabase
    .from(GRIDSTER_GROUP_POST_REPORTS_TABLE)
    .insert({ reporter_user_id: reporterUserId, post_id: postId, comment_id: commentId, reason });

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Moderator actions (RPCs - server validates role, not the frontend)
// ---------------------------------------------------------------------------

export async function pinGroupPost(postId, pin) {
  const { error } = await supabase.rpc("pin_group_post", { target_post_id: postId, pin });

  if (error) {
    throw new Error(error.message || "Could not update pin status.");
  }
}

export async function setGroupPostCommentsEnabled(postId, enabled) {
  const { error } = await supabase.rpc("set_group_post_comments_enabled", { target_post_id: postId, enabled });

  if (error) {
    throw new Error(error.message || "Could not update comment settings.");
  }
}

export async function moderatorRemoveGroupPost(postId) {
  const { error } = await supabase.rpc("moderator_remove_group_post", { target_post_id: postId });

  if (error) {
    throw new Error(error.message || "Could not remove that post.");
  }
}

export async function moderatorRemoveGroupComment(commentId) {
  const { error } = await supabase.rpc("moderator_remove_group_comment", { target_comment_id: commentId });

  if (error) {
    throw new Error(error.message || "Could not remove that comment.");
  }
}
