import { createSupabaseAdminClient, jsonResponse } from "../shared/gridster.js";
import { createStripeClient } from "../shared/stripe.js";

export const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function getBearerToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match ? match[1].trim() : "";
}

function getAppOrigin(request, env) {
  if (env.GRIDSTER_APP_URL) {
    return env.GRIDSTER_APP_URL.replace(/\/$/, "");
  }

  const referer = request.headers.get("Referer") || request.headers.get("Origin");

  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // fall through
    }
  }

  return new URL(request.url).origin;
}

export async function handleCreatePlusPortalSession(request, env) {
  const supabaseAdmin = createSupabaseAdminClient(env);
  const stripe = createStripeClient(env);

  if (!supabaseAdmin || !stripe) {
    return jsonResponse(500, { error: "Gridster Plus billing management is not configured yet." }, CORS_HEADERS);
  }

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return jsonResponse(401, { error: "Log in to Gridster to manage your subscription." }, CORS_HEADERS);
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !userData?.user) {
    return jsonResponse(401, { error: "Your Gridster session has expired. Log in again and retry." }, CORS_HEADERS);
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile?.stripe_customer_id) {
    return jsonResponse(400, { error: "No Gridster Plus subscription found for this account." }, CORS_HEADERS);
  }

  try {
    const appOrigin = getAppOrigin(request, env);

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appOrigin}/`,
    });

    return jsonResponse(200, { url: session.url }, CORS_HEADERS);
  } catch (error) {
    console.error("Failed to create Plus billing portal session", error);
    return jsonResponse(500, { error: "Could not open billing management. Try again in a moment." }, CORS_HEADERS);
  }
}
