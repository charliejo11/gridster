import { supabase } from "./supabaseClient";

export const GRIDSTER_GAME_PROFILES_TABLE = "gridster_game_profiles";
export const GRIDSTER_GAME_LEVELS_TABLE = "gridster_game_levels";
export const GRIDSTER_GAME_TITLES_TABLE = "gridster_game_titles";

export async function fetchGameProfile(userId) {
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from(GRIDSTER_GAME_PROFILES_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || { user_id: userId, xp: 0, level: 1, current_title: null, spins_total: 0 };
}

export async function fetchGameLevels() {
  const { data, error } = await supabase
    .from(GRIDSTER_GAME_LEVELS_TABLE)
    .select("level, xp_required")
    .order("level", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function fetchGameTitles() {
  const { data, error } = await supabase
    .from(GRIDSTER_GAME_TITLES_TABLE)
    .select("level_threshold, title")
    .order("level_threshold", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

// Display-only leaderboard by XP - never authoritative for anything
// server-side, purely for the Leaderboards section.
export async function fetchGameXpLeaderboard(limit = 20) {
  const { data, error } = await supabase
    .from(GRIDSTER_GAME_PROFILES_TABLE)
    .select("user_id, xp, level, current_title")
    .order("xp", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

// ---------------------------------------------------------------------------
// Pure display helpers - the server (grant_game_xp) is the only source of
// truth for a user's actual level/title. These exist only to render a
// progress bar without waiting on a round trip after every XP change.
// ---------------------------------------------------------------------------

export function levelForXp(xp, levels) {
  const sorted = [...(levels || [])].sort((a, b) => a.level - b.level);
  let currentLevel = 1;

  for (const entry of sorted) {
    if (xp >= entry.xp_required) {
      currentLevel = entry.level;
    } else {
      break;
    }
  }

  return currentLevel;
}

export function titleForLevel(level, titles) {
  const sorted = [...(titles || [])].sort((a, b) => a.level_threshold - b.level_threshold);
  let currentTitle = null;

  for (const entry of sorted) {
    if (level >= entry.level_threshold) {
      currentTitle = entry.title;
    } else {
      break;
    }
  }

  return currentTitle;
}

// Returns { level, nextLevel, xpIntoLevel, xpForNextLevel, progressRatio }.
// progressRatio is 1 (fully complete) when there's no further level to reach.
export function xpProgress(xp, levels) {
  const sorted = [...(levels || [])].sort((a, b) => a.level - b.level);
  const currentLevel = levelForXp(xp, sorted);
  const currentEntry = sorted.find((entry) => entry.level === currentLevel);
  const nextEntry = sorted.find((entry) => entry.level === currentLevel + 1);

  const currentThreshold = currentEntry?.xp_required ?? 0;

  if (!nextEntry) {
    return { level: currentLevel, nextLevel: null, xpIntoLevel: xp - currentThreshold, xpForNextLevel: null, progressRatio: 1 };
  }

  const span = nextEntry.xp_required - currentThreshold;
  const xpIntoLevel = xp - currentThreshold;
  const progressRatio = span > 0 ? Math.min(1, Math.max(0, xpIntoLevel / span)) : 1;

  return {
    level: currentLevel,
    nextLevel: nextEntry.level,
    xpIntoLevel,
    xpForNextLevel: span,
    progressRatio,
  };
}
