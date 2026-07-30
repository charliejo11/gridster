import { createSupabaseAdminClient } from "../shared/gridster.js";

// Enforces Photo Challenge Battle close times server-side even if no
// admin ever manually closes a battle - close_due_photo_battles() (Postgres,
// service_role-only) picks the winner, grants the prize exactly once
// (idempotent via gridster_game_photo_battle_prize_claims), and fires
// notifications. Safe to call every tick - a no-op whenever nothing is due.
export async function closeDuePhotoBattles(env) {
  const supabaseAdmin = createSupabaseAdminClient(env);

  if (!supabaseAdmin) {
    console.error("Skipping Photo Battle close sweep - Supabase admin client is not configured.");
    return { ok: false };
  }

  const { data, error } = await supabaseAdmin.rpc("close_due_photo_battles");

  if (error) {
    console.error("Photo Battle close sweep failed", error);
    return { ok: false };
  }

  if (data?.opened_count > 0 || data?.closed_count > 0) {
    console.log("Photo Battle sweep", data);
  }

  return data;
}
