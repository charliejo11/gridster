import { supabase } from "./supabaseClient";
import { GRIDSTER_MATURITY_RATING_LABELS, GRIDSTER_MATURITY_RATINGS } from "./gridsterPlaces";

export const GRIDSTER_HIDDEN_POSTS_TABLE = "gridster_hidden_posts";
export const GRIDSTER_CREATOR_ACTIONS_TABLE = "gridster_creator_actions";
export const GRIDSTER_POST_REPORTS_TABLE = "gridster_post_reports";

// Reuse the same lowercase rating values already used for events/places
// (gridster_posts.maturity_rating uses the same convention) - the Feed
// Preferences UI shows the capitalized labels from GRIDSTER_MATURITY_RATING_LABELS.
export const GRIDSTER_MATURITY_RATINGS_FOR_POSTS = GRIDSTER_MATURITY_RATINGS;

// Maps a "Ratings I Want To See" pill label (as shown in
// gridsterFeedPreferenceCards) to the stored lowercase rating value.
export const RATING_LABEL_TO_VALUE = Object.fromEntries(
  GRIDSTER_MATURITY_RATINGS.map((value) => [GRIDSTER_MATURITY_RATING_LABELS[value], value])
);

// "Show Me More/Less" content types map onto gridster_posts.post_type where a
// real column exists. "Events", "Photo Spots", and "Live DJs" aren't posts in
// this table (they live in gridster_events / gridster_places and their own
// feed widgets), so they're accepted as saved preferences but don't currently
// change Home feed ranking - there's nothing in this feed for them to affect.
export const FEED_CONTENT_TYPE_TO_POST_TYPE = {
  "Blogger Posts": "blog",
  "Store Releases": "store",
  "Photo Spots": "photo",
};

// "Show Me Less" options that map to a real, checkable signal on
// gridster_posts. The rest ("Overposted events", "Unrated adult content",
// "Low-credit posts") don't correspond to anything this table can measure
// today (events aren't posts, and "unrated"/"low-credit" would require
// guessing at post quality) - they're saved but don't change ranking, same
// as Discovery Focus's "Popular across the grid" / "Nearby events".
export const FEED_SHOW_LESS_ACTIVE = ["Empty SLURLs", "Repeated ads"];

// "Show Me More" options that map onto a real gridster_posts.post_type.
// "Events" and "Live DJs" aren't posts in this table (they live in their own
// feed widgets), so they're saved but don't change Home feed ranking.
export const FEED_SHOW_MORE_ACTIVE = Object.keys(FEED_CONTENT_TYPE_TO_POST_TYPE);

// Discovery Focus options with a real signal to rank on. "Popular across the
// grid" has no cross-user popularity metric yet, and "Nearby events" has no
// geo data on posts - both are saved but inactive rather than faked.
export const FEED_DISCOVERY_FOCUS_ACTIVE = ["Friends", "New creators", "Local trends"];

const DEFAULT_FEED_PREFERENCES = {
  show_more: [],
  show_less: [],
  ratings: ["general", "moderate"],
  discovery_focus: [],
};

export async function fetchFeedPreferences(userId) {
  if (!userId) {
    return DEFAULT_FEED_PREFERENCES;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("feed_show_more, feed_show_less, feed_ratings, feed_discovery_focus")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return DEFAULT_FEED_PREFERENCES;
  }

  return {
    show_more: data.feed_show_more || [],
    show_less: data.feed_show_less || [],
    ratings: data.feed_ratings?.length ? data.feed_ratings : DEFAULT_FEED_PREFERENCES.ratings,
    discovery_focus: data.feed_discovery_focus || [],
  };
}

export async function saveFeedPreferences(userId, preferences) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      feed_show_more: preferences.show_more || [],
      feed_show_less: preferences.show_less || [],
      feed_ratings: preferences.ratings?.length ? preferences.ratings : DEFAULT_FEED_PREFERENCES.ratings,
      feed_discovery_focus: preferences.discovery_focus || [],
    })
    .eq("user_id", userId)
    .select("feed_show_more, feed_show_less, feed_ratings, feed_discovery_focus")
    .single();

  if (error) {
    throw error;
  }

  return {
    show_more: data.feed_show_more || [],
    show_less: data.feed_show_less || [],
    ratings: data.feed_ratings || DEFAULT_FEED_PREFERENCES.ratings,
    discovery_focus: data.feed_discovery_focus || [],
  };
}

// ---------------------------------------------------------------------------
// Hidden posts
// ---------------------------------------------------------------------------

export async function fetchHiddenPostIds(userId) {
  if (!userId) {
    return new Set();
  }

  const { data, error } = await supabase
    .from(GRIDSTER_HIDDEN_POSTS_TABLE)
    .select("post_id")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return new Set((data || []).map((row) => row.post_id));
}

export async function fetchHiddenPostsWithContent(userId) {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from(GRIDSTER_HIDDEN_POSTS_TABLE)
    .select("post_id, created_at, gridster_posts(id, author_name, content, post_type, created_at)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || [])
    .map((row) => row.gridster_posts)
    .filter(Boolean);
}

export async function hidePostForUser(userId, postId) {
  const { error } = await supabase
    .from(GRIDSTER_HIDDEN_POSTS_TABLE)
    .upsert({ user_id: userId, post_id: postId }, { onConflict: "user_id,post_id" });

  if (error) {
    throw error;
  }
}

export async function unhidePostForUser(userId, postId) {
  const { error } = await supabase
    .from(GRIDSTER_HIDDEN_POSTS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("post_id", postId);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Mute / block
// ---------------------------------------------------------------------------

export async function fetchCreatorActions(userId) {
  if (!userId) {
    return { muted: new Set(), blocked: new Set() };
  }

  const { data, error } = await supabase
    .from(GRIDSTER_CREATOR_ACTIONS_TABLE)
    .select("target_user_id, action")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const muted = new Set();
  const blocked = new Set();

  for (const row of data || []) {
    if (row.action === "mute") {
      muted.add(row.target_user_id);
    } else if (row.action === "block") {
      blocked.add(row.target_user_id);
    }
  }

  return { muted, blocked };
}

async function setCreatorAction(userId, targetUserId, action) {
  const { error } = await supabase
    .from(GRIDSTER_CREATOR_ACTIONS_TABLE)
    .upsert({ user_id: userId, target_user_id: targetUserId, action }, { onConflict: "user_id,target_user_id,action" });

  if (error) {
    throw error;
  }
}

async function clearCreatorAction(userId, targetUserId, action) {
  const { error } = await supabase
    .from(GRIDSTER_CREATOR_ACTIONS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("target_user_id", targetUserId)
    .eq("action", action);

  if (error) {
    throw error;
  }
}

export const muteCreator = (userId, targetUserId) => setCreatorAction(userId, targetUserId, "mute");
export const unmuteCreator = (userId, targetUserId) => clearCreatorAction(userId, targetUserId, "mute");
export const blockCreator = (userId, targetUserId) => setCreatorAction(userId, targetUserId, "block");
export const unblockCreator = (userId, targetUserId) => clearCreatorAction(userId, targetUserId, "block");

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function reportPost(reporterUserId, postId, reason) {
  const { error } = await supabase
    .from(GRIDSTER_POST_REPORTS_TABLE)
    .insert({ reporter_user_id: reporterUserId, post_id: postId, reason: reason || "Spam" });

  if (error) {
    throw error;
  }
}

export async function fetchMyReportedPostIds(userId) {
  if (!userId) {
    return new Set();
  }

  const { data, error } = await supabase
    .from(GRIDSTER_POST_REPORTS_TABLE)
    .select("post_id")
    .eq("reporter_user_id", userId);

  if (error) {
    throw error;
  }

  return new Set((data || []).map((row) => row.post_id));
}

// ---------------------------------------------------------------------------
// Feed filtering + ranking
// ---------------------------------------------------------------------------

const NEW_CREATOR_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Filters out posts the viewer has hidden, or whose author the viewer has
// muted/blocked, or whose maturity rating isn't one the viewer wants to see -
// then ranks the rest with real signal where it exists (Show Me More/Less
// content-type boosts, Friends, New Creators, Local trends), keeping newest
// first as the tiebreaker so an empty/default preference set behaves exactly
// like the plain reverse-chronological feed it replaces.
export function rankAndFilterPosts(posts, options = {}) {
  const {
    preferences = DEFAULT_FEED_PREFERENCES,
    hiddenPostIds = new Set(),
    mutedUserIds = new Set(),
    blockedUserIds = new Set(),
    friendUserIds = new Set(),
    profilesById = new Map(),
    trendingTags = [],
  } = options;

  const allowedRatings = new Set(
    preferences.ratings?.length ? preferences.ratings : DEFAULT_FEED_PREFERENCES.ratings
  );
  const showMorePostTypes = new Set(
    (preferences.show_more || []).map((label) => FEED_CONTENT_TYPE_TO_POST_TYPE[label]).filter(Boolean)
  );
  const showLessPostTypes = new Set(
    (preferences.show_less || []).map((label) => FEED_CONTENT_TYPE_TO_POST_TYPE[label]).filter(Boolean)
  );
  const showLessEmptySlurls = (preferences.show_less || []).includes("Empty SLURLs");
  const showLessRepeatedAds = (preferences.show_less || []).includes("Repeated ads");
  const discoveryFocus = new Set(preferences.discovery_focus || []);
  const normalizedTrendingTags = new Set(
    (trendingTags || []).map((tag) => tag.replace(/^#/, "").toLowerCase())
  );
  const now = Date.now();
  const storePostCountByAuthor = new Map();

  const visible = posts.filter((post) => {
    if (hiddenPostIds.has(post.id)) return false;
    if (mutedUserIds.has(post.user_id) || blockedUserIds.has(post.user_id)) return false;
    if (!allowedRatings.has(post.maturity_rating || "general")) return false;
    return true;
  });

  const scored = visible.map((post) => {
    let score = 0;

    if (showMorePostTypes.has(post.post_type)) score += 2;
    if (showLessPostTypes.has(post.post_type)) score -= 2;

    if (showLessEmptySlurls && !post.slurl && !post.link_url) {
      score -= 1;
    }

    if (showLessRepeatedAds && post.post_type === "store") {
      const priorCount = storePostCountByAuthor.get(post.user_id) || 0;
      storePostCountByAuthor.set(post.user_id, priorCount + 1);
      if (priorCount > 0) {
        score -= 2;
      }
    }

    if (discoveryFocus.has("Friends") && friendUserIds.has(post.user_id)) {
      score += 3;
    }

    if (discoveryFocus.has("New creators")) {
      const authorCreatedAt = profilesById.get(post.user_id)?.created_at;
      if (authorCreatedAt && now - new Date(authorCreatedAt).getTime() <= NEW_CREATOR_WINDOW_MS) {
        score += 2;
      }
    }

    if (discoveryFocus.has("Local trends")) {
      const hasTrendingTag = (post.tags || []).some((tag) => normalizedTrendingTags.has(String(tag).toLowerCase()));
      if (hasTrendingTag) score += 1;
    }

    return { post, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.post.created_at).getTime() - new Date(a.post.created_at).getTime();
  });

  return scored.map((entry) => entry.post);
}
