import { createSupabaseAdminClient, jsonResponse } from "../_shared/gridster.js";

const CODE_PATTERN = /^GRID-[0-9]{4}$/;

const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

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

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  let payload = {};

  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Request body must be valid JSON." }, CORS_HEADERS);
  }

  const id = String(payload.id || "").trim();
  const code = normalizeCode(payload.code);

  if (!id || !CODE_PATTERN.test(code)) {
    return jsonResponse(400, { error: "Enter the GRID-#### code from Second Life." }, CORS_HEADERS);
  }

  const supabaseAdmin = createSupabaseAdminClient(env);

  if (!supabaseAdmin) {
    return jsonResponse(500, { error: "Gridster avatar verification is not configured yet." }, CORS_HEADERS);
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
      return jsonResponse(404, { error: "Verification request was not found." }, CORS_HEADERS);
    }

    if (verification.status === "verified") {
      return jsonResponse(
        200,
        {
          id: verification.id,
          status: verification.status,
          message: "Second Life avatar is already verified.",
        },
        CORS_HEADERS
      );
    }

    if (Date.parse(verification.expires_at) <= Date.now()) {
      await markExpired(supabaseAdmin, id);

      return jsonResponse(
        410,
        { error: "That verification code has expired. Send a new code to Second Life." },
        CORS_HEADERS
      );
    }

    if (verification.status !== "sent") {
      return jsonResponse(
        409,
        { error: "Gridster is still waiting for Second Life delivery. Try again in a moment." },
        CORS_HEADERS
      );
    }

    if (verification.code !== code) {
      return jsonResponse(400, { error: "That verification code is not correct." }, CORS_HEADERS);
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

    return jsonResponse(
      200,
      {
        id: verified.id,
        status: verified.status,
        verifiedAt: verified.verified_at,
        message: "Second Life avatar verified.",
      },
      CORS_HEADERS
    );
  } catch (error) {
    console.error("Failed to verify SL verification code", error);

    return jsonResponse(500, { error: "Could not verify that code. Try again in a moment." }, CORS_HEADERS);
  }
}
