import { createClient } from "@supabase/supabase-js";

export function jsonResponse(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export function createSupabaseAdminClient(env) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

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

export function authorizeSender(request, env) {
  const expectedSecret = env.GRIDSTER_SL_SENDER_SECRET;

  if (!expectedSecret) {
    return { ok: false, status: 500, error: "Gridster SL sender bridge is not configured." };
  }

  if (request.headers.get("X-Gridster-Sender-Secret") !== expectedSecret) {
    return { ok: false, status: 401, error: "Unauthorized sender." };
  }

  return { ok: true };
}

export function randomFourDigitCode() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return `GRID-${1000 + (array[0] % 9000)}`;
}
