import { createClient } from "@supabase/supabase-js";

const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

function getHeader(event, name) {
  const normalizedName = name.toLowerCase();
  const found = Object.entries(event.headers || {}).find(
    ([key]) => key.toLowerCase() === normalizedName
  );

  return found?.[1] || "";
}

function authorizeSender(event) {
  const expectedSecret = process.env.GRIDSTER_SL_SENDER_SECRET;

  if (!expectedSecret) {
    return {
      ok: false,
      statusCode: 500,
      error: "Gridster SL sender bridge is not configured.",
    };
  }

  if (getHeader(event, "X-Gridster-Sender-Secret") !== expectedSecret) {
    return {
      ok: false,
      statusCode: 401,
      error: "Unauthorized sender.",
    };
  }

  return { ok: true };
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

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

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Use GET to fetch a pending verification code." });
  }

  const authorization = authorizeSender(event);

  if (!authorization.ok) {
    return jsonResponse(authorization.statusCode, { error: authorization.error });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (!supabaseAdmin) {
    return jsonResponse(500, {
      error: "Gridster avatar verification is not configured yet.",
    });
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
      return jsonResponse(200, {
        hasPending: 0,
        message: "No pending Second Life verification codes.",
      });
    }

    return jsonResponse(200, {
      hasPending: 1,
      id: data.id,
      slUsername: data.sl_username,
      code: data.code,
      expiresAt: data.expires_at,
      message: `Your Gridster verification code is ${data.code}. Enter this code on Gridster to connect your Second Life avatar.`,
    });
  } catch (error) {
    console.error("Failed to fetch pending SL verification code", error);

    return jsonResponse(500, {
      error: "Could not fetch a pending verification code.",
    });
  }
};
