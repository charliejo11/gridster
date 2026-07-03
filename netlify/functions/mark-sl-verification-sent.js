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

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Use POST to mark verification delivery." });
  }

  const authorization = authorizeSender(event);

  if (!authorization.ok) {
    return jsonResponse(authorization.statusCode, { error: authorization.error });
  }

  let payload = {};

  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Request body must be valid JSON." });
  }

  const id = String(payload.id || "").trim();
  const status = payload.status === "failed" ? "failed" : "sent";

  if (!id) {
    return jsonResponse(400, { error: "Missing verification id." });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (!supabaseAdmin) {
    return jsonResponse(500, {
      error: "Gridster avatar verification is not configured yet.",
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("sl_verification_codes")
      .update({ status })
      .eq("id", id)
      .eq("status", "pending")
      .select("id, status")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return jsonResponse(404, {
        error: "No pending verification code was found for that id.",
      });
    }

    return jsonResponse(200, {
      id: data.id,
      status: data.status,
    });
  } catch (error) {
    console.error("Failed to mark SL verification delivery", error);

    return jsonResponse(500, {
      error: "Could not update verification delivery status.",
    });
  }
};
