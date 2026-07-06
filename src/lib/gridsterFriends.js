import { supabase } from "./supabaseClient";

export const GRIDSTER_FRIEND_REQUESTS_TABLE = "gridster_friend_requests";
export const GRIDSTER_FRIEND_REQUEST_UPDATED_EVENT = "gridster:friend-request-updated";

function notifyFriendRequestUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GRIDSTER_FRIEND_REQUEST_UPDATED_EVENT));
  }
}

export function formatFriendNotificationTime(isoString) {
  if (!isoString) {
    return "";
  }

  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.round(diffHours / 24);

  return `${diffDays}d`;
}

export async function fetchFriendshipStatus(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { status: "self", request: null };
  }

  const { data, error } = await supabase
    .from(GRIDSTER_FRIEND_REQUESTS_TABLE)
    .select("*")
    .or(
      `and(sender_id.eq.${currentUserId},recipient_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},recipient_id.eq.${currentUserId})`
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { status: "none", request: null };
  }

  if (data.status === "accepted") {
    return { status: "friends", request: data };
  }

  if (data.status === "declined") {
    return { status: "none", request: data };
  }

  if (data.sender_id === currentUserId) {
    return { status: "pending_sent", request: data };
  }

  return { status: "pending_received", request: data };
}

export async function sendFriendRequest(currentUserId, targetUserId) {
  const { data: existing } = await supabase
    .from(GRIDSTER_FRIEND_REQUESTS_TABLE)
    .select("*")
    .or(
      `and(sender_id.eq.${currentUserId},recipient_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},recipient_id.eq.${currentUserId})`
    )
    .maybeSingle();

  if (existing && existing.status === "declined") {
    const { data, error } = await supabase
      .from(GRIDSTER_FRIEND_REQUESTS_TABLE)
      .delete()
      .eq("id", existing.id)
      .eq("sender_id", currentUserId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("Only the original sender can resend a declined request.");
    }
  } else if (existing) {
    throw new Error("A friend request already exists between you and this resident.");
  }

  const { data, error } = await supabase
    .from(GRIDSTER_FRIEND_REQUESTS_TABLE)
    .insert({ sender_id: currentUserId, recipient_id: targetUserId })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  notifyFriendRequestUpdated();

  return data;
}

export async function respondToFriendRequest(requestId, accept) {
  const { data, error } = await supabase
    .from(GRIDSTER_FRIEND_REQUESTS_TABLE)
    .update({
      status: accept ? "accepted" : "declined",
      responded_at: new Date().toISOString(),
      sender_seen: false,
    })
    .eq("id", requestId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  notifyFriendRequestUpdated();

  return data;
}

export async function cancelFriendRequest(requestId) {
  const { error } = await supabase
    .from(GRIDSTER_FRIEND_REQUESTS_TABLE)
    .delete()
    .eq("id", requestId);

  if (error) {
    throw error;
  }

  notifyFriendRequestUpdated();
}

async function fetchProfilesByUserId(userIds) {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);

  if (!uniqueIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, sl_username, avatar_url")
    .in("user_id", uniqueIds);

  if (error) {
    throw error;
  }

  return new Map((data || []).map((profile) => [profile.user_id, profile]));
}

export async function fetchFriends(userId) {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from(GRIDSTER_FRIEND_REQUESTS_TABLE)
    .select("id, sender_id, recipient_id")
    .eq("status", "accepted")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);

  if (error) {
    throw error;
  }

  const otherUserIds = (data || []).map((row) => (row.sender_id === userId ? row.recipient_id : row.sender_id));
  const profilesById = await fetchProfilesByUserId(otherUserIds);

  return otherUserIds.map((id) => profilesById.get(id)).filter(Boolean);
}

export async function fetchFriendNotifications(userId) {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from(GRIDSTER_FRIEND_REQUESTS_TABLE)
    .select("id, sender_id, recipient_id, status, created_at, responded_at, sender_seen, recipient_seen")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = data || [];
  const otherUserIds = rows.map((row) => (row.sender_id === userId ? row.recipient_id : row.sender_id));
  const profilesById = await fetchProfilesByUserId(otherUserIds);

  const notifications = [];

  for (const row of rows) {
    if (row.recipient_id === userId && row.status === "pending") {
      notifications.push({
        id: `${row.id}-received`,
        type: "friend_request_received",
        person: profilesById.get(row.sender_id) || null,
        time: row.created_at,
        unread: !row.recipient_seen,
        requestId: row.id,
      });
    }

    if (row.sender_id === userId && row.status === "accepted") {
      notifications.push({
        id: `${row.id}-accepted`,
        type: "friend_request_accepted",
        person: profilesById.get(row.recipient_id) || null,
        time: row.responded_at || row.created_at,
        unread: !row.sender_seen,
        requestId: row.id,
      });
    }
  }

  return notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
}

export async function markFriendNotificationsSeen(userId) {
  if (!userId) {
    return;
  }

  await Promise.all([
    supabase
      .from(GRIDSTER_FRIEND_REQUESTS_TABLE)
      .update({ recipient_seen: true })
      .eq("recipient_id", userId)
      .eq("status", "pending")
      .eq("recipient_seen", false),
    supabase
      .from(GRIDSTER_FRIEND_REQUESTS_TABLE)
      .update({ sender_seen: true })
      .eq("sender_id", userId)
      .eq("status", "accepted")
      .eq("sender_seen", false),
  ]);

  notifyFriendRequestUpdated();
}
