import { supabase } from "./supabaseClient";

export const GRIDSTER_GAME_SPIN_REWARDS_TABLE = "gridster_game_spin_rewards";
export const GRIDSTER_GAME_SPINS_TABLE = "gridster_game_spins";

export async function fetchActiveSpinRewards() {
  const { data, error } = await supabase
    .from(GRIDSTER_GAME_SPIN_REWARDS_TABLE)
    .select("id, reward_type, bling_bits_amount, cosmetic_item_id, weight, label")
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function fetchMySpinsToday(userId) {
  if (!userId) {
    return [];
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from(GRIDSTER_GAME_SPINS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("spin_date", today);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function fetchMySpinHistory(userId, limit = 30) {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from(GRIDSTER_GAME_SPINS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function spinDaily(isBonusSpin = false) {
  const { data, error } = await supabase.rpc("spin_daily", { is_bonus_spin: isBonusSpin });

  if (error) {
    throw error;
  }

  return data;
}

// Display-only "your odds" helper - purely informational, never used to
// pick the actual reward (that always happens server-side in spin_daily()).
export function computeWeightedOdds(rewards) {
  const totalWeight = (rewards || []).reduce((sum, reward) => sum + (reward.weight || 0), 0);

  if (totalWeight <= 0) {
    return (rewards || []).map((reward) => ({ ...reward, oddsPercent: 0 }));
  }

  return (rewards || []).map((reward) => ({
    ...reward,
    oddsPercent: (reward.weight / totalWeight) * 100,
  }));
}
