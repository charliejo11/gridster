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

export async function handleCreatePlusCheckoutSession(request, env) {
  const supabaseAdmin = createSupabaseAdminClient(env);
  const stripe = createStripeClient(env);

  if (!supabaseAdmin || !stripe || !env.STRIPE_PLUS_PRICE_ID) {
    return jsonResponse(500, { error: "Gridster Plus checkout is not configured yet." }, CORS_HEADERS);
  }

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return jsonResponse(401, { error: "Log in to Gridster before upgrading to Plus." }, CORS_HEADERS);
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !userData?.user) {
    return jsonResponse(401, { error: "Your Gridster session has expired. Log in again and retry." }, CORS_HEADERS);
  }

  const user = userData.user;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("user_id, is_plus, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load profile for Plus checkout", profileError);
    return jsonResponse(500, { error: "Could not start checkout. Try again in a moment." }, CORS_HEADERS);
  }

  if (profile?.is_plus) {
    return jsonResponse(400, { error: "You're already a Gridster Plus member." }, CORS_HEADERS);
  }

  try {
    let customerId = profile?.stripe_customer_id || null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    const appOrigin = getAppOrigin(request, env);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: env.STRIPE_PLUS_PRICE_ID, quantity: 1 }],
      success_url: `${appOrigin}/?plus=success`,
      cancel_url: `${appOrigin}/?plus=cancelled`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });

    return jsonResponse(200, { url: session.url }, CORS_HEADERS);
  } catch (error) {
    console.error("Failed to create Plus checkout session", error);
    return jsonResponse(500, { error: "Could not start checkout. Try again in a moment." }, CORS_HEADERS);
  }
}
