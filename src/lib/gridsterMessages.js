import { supabase } from "./supabaseClient";
import { fetchFriendshipStatus, fetchFriends } from "./gridsterFriends";

export const GRIDSTER_MESSAGES_TABLE = "gridster_messages";
export const GRIDSTER_MESSAGE_EVENT = "gridster:message-sent";

function notifyMessageSent() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GRIDSTER_MESSAGE_EVENT));
  }
}

export async function sendMessage(senderId, recipientId, content) {
  const trimmed = String(content || "").trim();

  if (!trimmed) {
    throw new Error("Message can't be empty.");
  }

  const { status } = await fetchFriendshipStatus(senderId, recipientId);

  if (status !== "friends") {
    throw new Error("You can only message residents who are your friends.");
  }

  const { data, error } = await supabase
    .from(GRIDSTER_MESSAGES_TABLE)
    .insert({ sender_id: senderId, recipient_id: recipientId, content: trimmed })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  notifyMessageSent();

  return data;
}

export async function fetchThread(userId, otherUserId) {
  const { data, error } = await supabase
    .from(GRIDSTER_MESSAGES_TABLE)
    .select("*")
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
    )
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function markThreadRead(userId, otherUserId) {
  const { error } = await supabase
    .from(GRIDSTER_MESSAGES_TABLE)
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .eq("sender_id", otherUserId)
    .is("read_at", null);

  if (error) {
    throw error;
  }

  notifyMessageSent();
}

export async function fetchConversations(userId) {
  if (!userId) {
    return [];
  }

  const [friends, { data: messages, error }] = await Promise.all([
    fetchFriends(userId),
    supabase
      .from(GRIDSTER_MESSAGES_TABLE)
      .select("sender_id, recipient_id, content, created_at, read_at")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
  ]);

  if (error) {
    throw error;
  }

  const lastMessageByFriend = new Map();
  const unreadCountByFriend = new Map();

  for (const message of messages || []) {
    const otherId = message.sender_id === userId ? message.recipient_id : message.sender_id;

    if (!lastMessageByFriend.has(otherId)) {
      lastMessageByFriend.set(otherId, message);
    }

    if (message.recipient_id === userId && !message.read_at) {
      unreadCountByFriend.set(otherId, (unreadCountByFriend.get(otherId) || 0) + 1);
    }
  }

  return friends
    .map((friend) => ({
      friend,
      lastMessage: lastMessageByFriend.get(friend.user_id) || null,
      unreadCount: unreadCountByFriend.get(friend.user_id) || 0,
    }))
    .sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;

      return bTime - aTime;
    });
}
