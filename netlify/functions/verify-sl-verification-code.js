import { createClient } from "@supabase/supabase-js";

const CODE_PATTERN = /^GRID-[0-9]{4}$/;

const headers = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
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

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

async function markExpired(supabaseAdmin, id) {
  await supabaseAdmin
    .from("sl_verification_codes")
    .update({ status: "expired" })
    .eq("id", id)
    .in("status", ["pending", "sent"]);
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Use POST to verify a Second Life code." });
  }

  let payload = {};

  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Request body must be valid JSON." });
  }

  const id = String(payload.id || "").trim();
  const code = normalizeCode(payload.code);

  if (!id || !CODE_PATTERN.test(code)) {
    return jsonResponse(400, { error: "Enter the GRID-#### code from Second Life." });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (!supabaseAdmin) {
    return jsonResponse(500, {
      error: "Gridster avatar verification is not configured yet.",
    });
  }

  try {
    const { data: verification, error: fetchError } = await supabaseAdmin
      .from("sl_verification_codes")
      .select("id, code, status, expires_at, user_id, avatar_uuid")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!verification) {
      return jsonResponse(404, { error: "Verification request was not found." });
    }

    if (verification.status === "verified") {
      return jsonResponse(200, {
        id: verification.id,
        status: verification.status,
        message: "Second Life avatar is already verified.",
      });
    }

    if (Date.parse(verification.expires_at) <= Date.now()) {
      await markExpired(supabaseAdmin, id);

      return jsonResponse(410, {
        error: "That verification code has expired. Send a new code to Second Life.",
      });
    }

    if (verification.status !== "sent") {
      return jsonResponse(409, {
        error: "Gridster is still waiting for Second Life delivery. Try again in a moment.",
      });
    }

    if (verification.code !== code) {
      return jsonResponse(400, { error: "That verification code is not correct." });
    }

    const { data: verified, error: updateError } = await supabaseAdmin
      .from("sl_verification_codes")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "sent")
      .select("id, status, verified_at")
      .single();

    if (updateError) {
      throw updateError;
    }

    if (verification.user_id) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            user_id: verification.user_id,
            sl_avatar_uuid: verification.avatar_uuid || null,
            sl_verified: true,
            sl_verified_at: verified.verified_at,
          },
          { onConflict: "user_id" }
        );

      if (profileError) {
        console.error("Failed to update profile after SL verification", profileError);
      }
    }

    return jsonResponse(200, {
      id: verified.id,
      status: verified.status,
      verifiedAt: verified.verified_at,
      message: "Second Life avatar verified.",
    });
  } catch (error) {
    console.error("Failed to verify SL verification code", error);

    return jsonResponse(500, {
      error: "Could not verify that code. Try again in a moment.",
    });
  }
};
