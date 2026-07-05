import { createSupabaseAdminClient, jsonResponse, randomFourDigitCode } from "../_shared/gridster.js";

const CODE_TTL_MINUTES = 15;
const MAX_INSERT_ATTEMPTS = 5;
const SL_USERNAME_PATTERN = /^[a-z0-9][a-z0-9.]{2,63}$/;

const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function normalizeSlUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidSlUsername(value) {
  return SL_USERNAME_PATTERN.test(value) && value.includes(".") && !value.includes("..");
}

function getBearerToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match ? match[1].trim() : "";
}

async function insertVerificationCode(supabaseAdmin, slUsername, userId) {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt += 1) {
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();
    const code = randomFourDigitCode();
    const { data, error } = await supabaseAdmin
      .from("sl_verification_codes")
      .insert({
        sl_username: slUsername,
        code,
        status: "pending",
        expires_at: expiresAt,
        user_id: userId,
      })
      .select("id, sl_username, status, expires_at")
      .single();

    if (!error) {
      return data;
    }

    lastError = error;

    if (error.code !== "23505") {
      break;
    }
  }

  throw lastError;
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

  const slUsername = normalizeSlUsername(payload.slUsername || payload.sl_username);

  if (!isValidSlUsername(slUsername)) {
    return jsonResponse(
      400,
      { error: "Enter a valid Second Life legacy username, like charliejo11.resident." },
      CORS_HEADERS
    );
  }

  const supabaseAdmin = createSupabaseAdminClient(env);

  if (!supabaseAdmin) {
    return jsonResponse(500, { error: "Gridster avatar verification is not configured yet." }, CORS_HEADERS);
  }

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return jsonResponse(
      401,
      { error: "Log in to Gridster before verifying your Second Life avatar." },
      CORS_HEADERS
    );
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !userData?.user) {
    return jsonResponse(
      401,
      { error: "Your Gridster session has expired. Log in again and retry." },
      CORS_HEADERS
    );
  }

  try {
    const verification = await insertVerificationCode(supabaseAdmin, slUsername, userData.user.id);

    return jsonResponse(
      200,
      {
        id: verification.id,
        slUsername: verification.sl_username,
        status: verification.status,
        expiresAt: verification.expires_at,
        message:
          "We queued a private verification message for your Second Life avatar. Log into Second Life and check your IMs from Gridster Verification.",
      },
      CORS_HEADERS
    );
  } catch (error) {
    console.error("Failed to create SL verification code", error);

    return jsonResponse(500, { error: "Could not create a verification code. Try again in a moment." }, CORS_HEADERS);
  }
}
