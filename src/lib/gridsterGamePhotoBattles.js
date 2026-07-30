import { supabase } from "./supabaseClient";

export const GRIDSTER_GAME_PHOTO_BATTLES_TABLE = "gridster_game_photo_battles";
export const GRIDSTER_GAME_PHOTO_BATTLE_ENTRIES_TABLE = "gridster_game_photo_battle_entries";
export const GRIDSTER_GAME_PHOTO_BATTLE_VOTES_TABLE = "gridster_game_photo_battle_votes";

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function normalizePhotoBattleEntryForm(form) {
  return {
    photo_url: normalizeUrl(form.photo_url),
    caption: String(form.caption || "").trim(),
  };
}

export async function fetchOpenPhotoBattles() {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from(GRIDSTER_GAME_PHOTO_BATTLES_TABLE)
    .select("*")
    .neq("status", "closed")
    .lte("open_at", nowIso)
    .gte("close_at", nowIso)
    .order("close_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function fetchPastPhotoBattles(limit = 20) {
  const { data, error } = await supabase
    .from(GRIDSTER_GAME_PHOTO_BATTLES_TABLE)
    .select("*")
    .eq("status", "closed")
    .order("close_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function fetchPhotoBattleEntries(battleId) {
  const { data, error } = await supabase
    .from(GRIDSTER_GAME_PHOTO_BATTLE_ENTRIES_TABLE)
    .select("*")
    .eq("battle_id", battleId)
    .order("vote_count", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function fetchMyPhotoBattleVotes(battleId, userId) {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from(GRIDSTER_GAME_PHOTO_BATTLE_VOTES_TABLE)
    .select("entry_id")
    .eq("battle_id", battleId)
    .eq("voter_user_id", userId);

  if (error) {
    throw error;
  }

  return (data || []).map((row) => row.entry_id);
}

export async function submitPhotoBattleEntry(battleId, form) {
  const entry = normalizePhotoBattleEntryForm(form);

  const { data, error } = await supabase.rpc("submit_photo_battle_entry", {
    target_battle_id: battleId,
    photo_url: entry.photo_url,
    caption: entry.caption || null,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePhotoBattleEntry(entryId, form) {
  const entry = normalizePhotoBattleEntryForm(form);

  const { data, error } = await supabase
    .from(GRIDSTER_GAME_PHOTO_BATTLE_ENTRIES_TABLE)
    .update({ photo_url: entry.photo_url, caption: entry.caption || null })
    .eq("id", entryId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function withdrawPhotoBattleEntry(entryId, userId) {
  const { error } = await supabase
    .from(GRIDSTER_GAME_PHOTO_BATTLE_ENTRIES_TABLE)
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function castPhotoBattleVote(entryId) {
  const { data, error } = await supabase.rpc("cast_photo_battle_vote", { target_entry_id: entryId });

  if (error) {
    throw error;
  }

  return data;
}

export function formatBattleCountdown(closeAtIso) {
  const remainingMs = new Date(closeAtIso).getTime() - Date.now();

  if (remainingMs <= 0) {
    return "Closed";
  }

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${minutes}m left`;
}
