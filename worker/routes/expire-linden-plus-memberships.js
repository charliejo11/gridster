import { createSupabaseAdminClient } from "../shared/gridster.js";

// Stripe-billed Plus (monthly/annual/founding) is expired by Stripe itself
// via customer.subscription.updated/deleted webhooks - there is no existing
// polling/expiration sweep to reuse for that path. Linden kiosk payments are
// a one-time 30-day credit with no subscription behind them, so nothing else
// ever flips is_plus back off once plus_current_period_end passes. This is
// the smallest safe addition to close that gap: a scoped sweep that only
// ever touches plus_price_tier = 'linden' rows.
export async function expireLindenPlusMemberships(env) {
  const supabaseAdmin = createSupabaseAdminClient(env);

  if (!supabaseAdmin) {
    console.error("Skipping Linden Plus expiration sweep - Supabase admin client is not configured.");
    return { ok: false, expired: 0 };
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ is_plus: false, plus_status: "expired" })
    .eq("plus_price_tier", "linden")
    .eq("is_plus", true)
    .lt("plus_current_period_end", new Date().toISOString())
    .select("user_id");

  if (error) {
    console.error("Linden Plus expiration sweep failed", error);
    return { ok: false, expired: 0 };
  }

  const expiredCount = data?.length ?? 0;

  if (expiredCount > 0) {
    console.log("Linden Plus expiration sweep expired memberships", expiredCount);
  }

  return { ok: true, expired: expiredCount };
}
