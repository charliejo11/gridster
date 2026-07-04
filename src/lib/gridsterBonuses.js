import { supabase } from "./supabaseClient";

export async function claimDailyLoginBonus() {
  const { data, error } = await supabase.rpc("claim_daily_login_bonus");

  if (error) {
    throw error;
  }

  return data;
}

export async function claimProfileCompleteBonus() {
  const { data, error } = await supabase.rpc("claim_profile_complete_bonus");

  if (error) {
    throw error;
  }

  return data;
}

export async function claimSlVerifiedBonus() {
  const { data, error } = await supabase.rpc("claim_sl_verified_bonus");

  if (error) {
    throw error;
  }

  return data;
}
