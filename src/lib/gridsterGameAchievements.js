import { supabase } from "./supabaseClient";

export const GRIDSTER_GAME_ACHIEVEMENTS_TABLE = "gridster_game_achievements";
export const GRIDSTER_GAME_USER_ACHIEVEMENTS_TABLE = "gridster_game_user_achievements";

export async function fetchAchievements() {
  const { data, error } = await supabase
    .from(GRIDSTER_GAME_ACHIEVEMENTS_TABLE)
    .select("*")
    .order("criteria_value", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function fetchUnlockedAchievements(userId) {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from(GRIDSTER_GAME_USER_ACHIEVEMENTS_TABLE)
    .select("achievement_id, unlocked_at")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}
