import { supabase } from "./supabaseClient";

export const GRIDSTER_FOLLOWS_TABLE = "gridster_follows";
export const GRIDSTER_FOLLOWS_UPDATED_EVENT = "gridster:follows-updated";

function notifyFollowsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GRIDSTER_FOLLOWS_UPDATED_EVENT));
  }
}

export async function fetchFollowCounts(userId) {
  if (!userId) {
    return { followers: 0, following: 0 };
  }

  const [followersResult, followingResult] = await Promise.all([
    supabase.from(GRIDSTER_FOLLOWS_TABLE).select("id", { count: "exact", head: true }).eq("followed_id", userId),
    supabase.from(GRIDSTER_FOLLOWS_TABLE).select("id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);

  if (followersResult.error) {
    throw followersResult.error;
  }

  if (followingResult.error) {
    throw followingResult.error;
  }

  return {
    followers: followersResult.count ?? 0,
    following: followingResult.count ?? 0,
  };
}

export async function fetchIsFollowing(followerId, followedId) {
  if (!followerId || !followedId || followerId === followedId) {
    return false;
  }

  const { data, error } = await supabase
    .from(GRIDSTER_FOLLOWS_TABLE)
    .select("id")
    .eq("follower_id", followerId)
    .eq("followed_id", followedId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function followUser(followerId, followedId) {
  const { error } = await supabase
    .from(GRIDSTER_FOLLOWS_TABLE)
    .insert({ follower_id: followerId, followed_id: followedId });

  if (error) {
    throw error;
  }

  notifyFollowsUpdated();
}

export async function unfollowUser(followerId, followedId) {
  const { error } = await supabase
    .from(GRIDSTER_FOLLOWS_TABLE)
    .delete()
    .eq("follower_id", followerId)
    .eq("followed_id", followedId);

  if (error) {
    throw error;
  }

  notifyFollowsUpdated();
}
