import { authorizeSender, createSupabaseAdminClient, jsonResponse } from "../_shared/gridster.js";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

async function expireStalePendingCodes(supabaseAdmin, now) {
  const { error } = await supabaseAdmin
    .from("sl_verification_codes")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lte("expires_at", now);

  if (error) {
    console.error("Failed to expire stale SL verification codes", error);
  }
}

export async function onRequestGet({ request, env }) {
  const authorization = authorizeSender(request, env);

  if (!authorization.ok) {
    return jsonResponse(authorization.status, { error: authorization.error }, NO_STORE_HEADERS);
  }

  const supabaseAdmin = createSupabaseAdminClient(env);

  if (!supabaseAdmin) {
    return jsonResponse(500, { error: "Gridster avatar verification is not configured yet." }, NO_STORE_HEADERS);
  }

  const now = new Date().toISOString();

  try {
    await expireStalePendingCodes(supabaseAdmin, now);

    const { data, error } = await supabaseAdmin
      .from("sl_verification_codes")
      .select("id, sl_username, code, expires_at")
      .eq("status", "pending")
      .gt("expires_at", now)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return jsonResponse(
        200,
        { hasPending: 0, message: "No pending Second Life verification codes." },
        NO_STORE_HEADERS
      );
    }

    return jsonResponse(
      200,
      {
        hasPending: 1,
        id: data.id,
        slUsername: data.sl_username,
        code: data.code,
        expiresAt: data.expires_at,
        message: `Your Gridster verification code is ${data.code}. Enter this code on Gridster to connect your Second Life avatar.`,
      },
      NO_STORE_HEADERS
    );
  } catch (error) {
    console.error("Failed to fetch pending SL verification code", error);

    return jsonResponse(500, { error: "Could not fetch a pending verification code." }, NO_STORE_HEADERS);
  }
}
