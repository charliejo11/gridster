import { supabase } from "./supabaseClient";

export const GRIDSTER_PHOTO_CHALLENGES_TABLE = "gridster_photo_challenges";
export const GRIDSTER_PHOTO_ENTRIES_TABLE = "gridster_photo_entries";
export const GRIDSTER_PHOTO_VOTES_TABLE = "gridster_photo_votes";

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function normalizePhotoEntryForm(form) {
  return {
    photo_url: normalizeUrl(form.photo_url),
    caption: String(form.caption || "").trim(),
    creator_name: String(form.creator_name || "").trim(),
  };
}

export function normalizePhotoChallengeForm(form) {
  return {
    title: String(form.title || "").trim(),
    description: String(form.description || "").trim(),
    reward_bling_bits: Math.max(0, Number(form.reward_bling_bits) || 0),
    reward_badge_item_id: form.reward_badge_item_id || null,
    deadline_label: String(form.deadline_label || "").trim(),
  };
}

export async function fetchActivePhotoChallenge() {
  const { data, error } = await supabase
    .from(GRIDSTER_PHOTO_CHALLENGES_TABLE)
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchPhotoEntries(challengeId) {
  const { data, error } = await supabase
    .from(GRIDSTER_PHOTO_ENTRIES_TABLE)
    .select("*")
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchMyVotedEntryIds(userId) {
  const { data, error } = await supabase
    .from(GRIDSTER_PHOTO_VOTES_TABLE)
    .select("entry_id")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return new Set((data || []).map((row) => row.entry_id));
}

export async function createPhotoEntry(userId, challengeId, form) {
  const entry = normalizePhotoEntryForm(form);
  const { data, error } = await supabase
    .from(GRIDSTER_PHOTO_ENTRIES_TABLE)
    .insert({ ...entry, user_id: userId, challenge_id: challengeId })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deletePhotoEntry(entryId, userId) {
  const { error } = await supabase
    .from(GRIDSTER_PHOTO_ENTRIES_TABLE)
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function votePhotoEntry(entryId) {
  const { data, error } = await supabase.rpc("vote_photo_entry", {
    target_entry_id: entryId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function createPhotoChallenge(form) {
  const challenge = normalizePhotoChallengeForm(form);
  const { data, error } = await supabase
    .from(GRIDSTER_PHOTO_CHALLENGES_TABLE)
    .insert(challenge)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function closePhotoChallengeAndAwardWinner(challengeId) {
  const { data, error } = await supabase.rpc("close_photo_challenge_and_award_winner", {
    target_challenge_id: challengeId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchBadgeRewardOptions() {
  const { data, error } = await supabase
    .from("bling_items")
    .select("id, name, slug")
    .eq("item_type", "badge")
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw error;
  }

  return data;
}
