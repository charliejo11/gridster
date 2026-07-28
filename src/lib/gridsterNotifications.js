import { supabase } from "./supabaseClient";
import { fetchProfilesByUserIds } from "./gridsterProfiles";

export const GRIDSTER_NOTIFICATIONS_TABLE = "gridster_notifications";
export const GRIDSTER_NOTIFICATIONS_EVENT = "gridster:notifications-changed";

function notifyNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GRIDSTER_NOTIFICATIONS_EVENT));
  }
}

export function formatNotificationTime(isoString) {
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

async function enrichNotifications(rows) {
  if (!rows.length) {
    return [];
  }

  const actorIds = rows.map((row) => row.actor_user_id).filter(Boolean);
  const groupIds = [...new Set(rows.map((row) => row.related_group_id).filter(Boolean))];
  const eventIds = [...new Set(rows.map((row) => row.related_event_id).filter(Boolean))];

  const [profilesById, groupsResult, eventsResult] = await Promise.all([
    fetchProfilesByUserIds(actorIds),
    groupIds.length
      ? supabase.from("gridster_groups").select("id, name").in("id", groupIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? supabase.from("gridster_events").select("id, title").in("id", eventIds)
      : Promise.resolve({ data: [] }),
  ]);

  const groupNameById = new Map((groupsResult.data || []).map((group) => [group.id, group.name]));
  const eventNameById = new Map((eventsResult.data || []).map((event) => [event.id, event.title]));

  return rows.map((row) => {
    const actorProfile = row.actor_user_id ? profilesById.get(row.actor_user_id) : null;

    return {
      ...row,
      actorName: actorProfile?.display_name || actorProfile?.sl_username || null,
      actorAvatarUrl: actorProfile?.avatar_url || null,
      groupName: row.related_group_id ? groupNameById.get(row.related_group_id) : null,
      eventName: row.related_event_id ? eventNameById.get(row.related_event_id) : null,
    };
  });
}

export async function fetchRecentNotifications(userId, limit = 8) {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from(GRIDSTER_NOTIFICATIONS_TABLE)
    .select("*")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return enrichNotifications(data || []);
}

export async function fetchNotificationsPage(userId, { limit = 20, before = null } = {}) {
  if (!userId) {
    return [];
  }

  let query = supabase
    .from(GRIDSTER_NOTIFICATIONS_TABLE)
    .select("*")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return enrichNotifications(data || []);
}

export async function fetchUnreadNotificationCount(userId) {
  if (!userId) {
    return 0;
  }

  const { count, error } = await supabase
    .from(GRIDSTER_NOTIFICATIONS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function markNotificationRead(notificationId, isRead = true) {
  const { error } = await supabase
    .from(GRIDSTER_NOTIFICATIONS_TABLE)
    .update({ is_read: isRead, read_at: isRead ? new Date().toISOString() : null })
    .eq("id", notificationId);

  if (error) {
    throw error;
  }

  notifyNotificationsChanged();
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from(GRIDSTER_NOTIFICATIONS_TABLE)
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw error;
  }

  notifyNotificationsChanged();
}

export async function deleteNotification(notificationId) {
  const { error } = await supabase
    .from(GRIDSTER_NOTIFICATIONS_TABLE)
    .delete()
    .eq("id", notificationId);

  if (error) {
    throw error;
  }

  notifyNotificationsChanged();
}

export async function clearAllNotifications(userId) {
  const { error } = await supabase
    .from(GRIDSTER_NOTIFICATIONS_TABLE)
    .delete()
    .eq("recipient_user_id", userId);

  if (error) {
    throw error;
  }

  notifyNotificationsChanged();
}

// Marks the newest unread new_message notification from a given sender as
// read - used when a conversation is opened, so we never need message
// content in the notification row itself to know which one to clear.
export async function markMessageNotificationsRead(recipientUserId, senderUserId) {
  if (!recipientUserId || !senderUserId) {
    return;
  }

  const { error } = await supabase
    .from(GRIDSTER_NOTIFICATIONS_TABLE)
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_user_id", recipientUserId)
    .eq("actor_user_id", senderUserId)
    .eq("notification_type", "new_message")
    .eq("is_read", false);

  if (error) {
    throw error;
  }

  notifyNotificationsChanged();
}

export function subscribeToNotifications(userId, { onInsert, onUpdate } = {}) {
  if (!userId) {
    return null;
  }

  const channel = supabase
    .channel(`gridster-notifications-${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: GRIDSTER_NOTIFICATIONS_TABLE, filter: `recipient_user_id=eq.${userId}` },
      (payload) => onInsert?.(payload.new)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: GRIDSTER_NOTIFICATIONS_TABLE, filter: `recipient_user_id=eq.${userId}` },
      (payload) => onUpdate?.(payload.new)
    )
    .subscribe();

  return channel;
}

// Thin, best-effort wrapper around the create_or_group_notification RPC -
// every write-path (likes, comments, friend requests, follows, messages,
// invites) calls this after its own write succeeds. Never throws: a failed
// notification must never block the underlying action.
export async function createNotification(params) {
  try {
    await supabase.rpc("create_or_group_notification", params);
  } catch {
    // best-effort only
  }
}

export function getNotificationCopy(notification) {
  const actorName = notification.actorName || "A resident";
  const extraCount = Math.max(0, (notification.actor_count || 1) - 1);
  const actorPhrase = extraCount > 0
    ? `${actorName} and ${extraCount} other${extraCount > 1 ? "s" : ""}`
    : actorName;

  switch (notification.notification_type) {
    case "post_liked":
      return `${actorPhrase} liked your post.`;
    case "post_commented":
      return notification.message
        ? `${actorPhrase} commented on your post: "${notification.message}"`
        : `${actorPhrase} commented on your post.`;
    case "new_message":
      return extraCount > 0
        ? `${actorName} sent you ${notification.actor_count} new messages.`
        : `${actorName} sent you a new message.`;
    case "friend_request_received":
      return `${actorName} sent you a friend request.`;
    case "friend_request_accepted":
      return `${actorName} accepted your friend request.`;
    case "follow_received":
      return `${actorName} started following you.`;
    case "mention":
      return `${actorName} mentioned you in a post.`;
    case "group_invite":
      return `${actorName} invited you to join ${notification.groupName || "a group"}.`;
    case "group_activity":
      return notification.message
        ? `${notification.groupName || "A group"}: ${notification.message}`
        : `New activity in ${notification.groupName || "a group"}.`;
    case "event_invite":
      return `${actorName} invited you to ${notification.eventName || "an event"}.`;
    case "event_reminder":
      return `Reminder: ${notification.eventName || "an event"} is starting soon.`;
    case "bling_bits_bonus":
      return `You received ${notification.amount ?? 0} Bling Bits${notification.title ? ` — ${notification.title}` : ""}.`;
    case "bling_bits_purchase":
      return `Your Bling Depot purchase is ready${notification.title ? ` — ${notification.title}` : ""}.`;
    case "account_announcement":
      return notification.title || "Gridster announcement";
    default:
      return notification.title || "New notification";
  }
}
