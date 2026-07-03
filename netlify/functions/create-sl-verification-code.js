import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const CODE_TTL_MINUTES = 15;
const MAX_INSERT_ATTEMPTS = 5;
const SL_USERNAME_PATTERN = /^[a-z0-9][a-z0-9.]{2,63}$/;

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

function normalizeSlUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidSlUsername(value) {
  return (
    SL_USERNAME_PATTERN.test(value) &&
    value.includes(".") &&
    !value.includes("..")
  );
}

function createVerificationCode() {
  return `GRID-${randomInt(1000, 10000)}`;
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

async function insertVerificationCode(supabaseAdmin, slUsername) {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt += 1) {
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();
    const code = createVerificationCode();
    const { data, error } = await supabaseAdmin
      .from("sl_verification_codes")
      .insert({
        sl_username: slUsername,
        code,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id, sl_username, code, status, expires_at")
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

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Use POST to create a verification code." });
  }

  let payload = {};

  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Request body must be valid JSON." });
  }

  const slUsername = normalizeSlUsername(payload.slUsername || payload.sl_username);

  if (!isValidSlUsername(slUsername)) {
    return jsonResponse(400, {
      error: "Enter a valid Second Life legacy username, like charliejo11.resident.",
    });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (!supabaseAdmin) {
    return jsonResponse(500, {
      error: "Gridster avatar verification is not configured yet.",
    });
  }

  try {
    const verification = await insertVerificationCode(supabaseAdmin, slUsername);

    return jsonResponse(200, {
      id: verification.id,
      slUsername: verification.sl_username,
      code: verification.code,
      status: verification.status,
      expiresAt: verification.expires_at,
      message:
        "Verification code created and stored. Second Life private-message delivery is the next bridge step.",
    });
  } catch (error) {
    console.error("Failed to create SL verification code", error);

    return jsonResponse(500, {
      error: "Could not create a verification code. Try again in a moment.",
    });
  }
};
