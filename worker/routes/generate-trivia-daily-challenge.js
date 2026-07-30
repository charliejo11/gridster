import { createSupabaseAdminClient } from "../shared/gridster.js";

// Generates today's Trivia Daily Challenge question set if it doesn't
// already exist. generate_trivia_daily_challenge() is idempotent
// (insert ... on conflict (challenge_date) do nothing), so calling this
// every tick is safe - only the first call each day actually does anything.
export async function generateTriviaDailyChallenge(env) {
  const supabaseAdmin = createSupabaseAdminClient(env);

  if (!supabaseAdmin) {
    console.error("Skipping Trivia Daily Challenge generation - Supabase admin client is not configured.");
    return { ok: false };
  }

  const { data, error } = await supabaseAdmin.rpc("generate_trivia_daily_challenge", {});

  if (error) {
    console.error("Trivia Daily Challenge generation failed", error);
    return { ok: false };
  }

  if (!data?.already_exists) {
    console.log("Generated today's Trivia Daily Challenge", data);
  }

  return data;
}
