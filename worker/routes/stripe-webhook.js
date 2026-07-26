import { createSupabaseAdminClient, jsonResponse } from "../shared/gridster.js";
import { createStripeClient } from "../shared/stripe.js";

const PLUS_MONTHLY_BONUS_BITS = 500;
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

async function findProfileByCustomerId(supabaseAdmin, customerId) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error("Failed to look up profile by Stripe customer id", error);
    return null;
  }

  return data;
}

async function syncSubscriptionToProfile(supabaseAdmin, userId, subscription) {
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const update = {
    is_plus: ACTIVE_STATUSES.has(subscription.status),
    plus_status: subscription.status,
    plus_current_period_end: periodEnd,
    stripe_subscription_id: subscription.id,
  };

  if (subscription.metadata?.plus_price_tier) {
    update.plus_price_tier = subscription.metadata.plus_price_tier;
  }

  await supabaseAdmin
    .from("profiles")
    .update(update)
    .eq("user_id", userId);
}

async function handleCheckoutCompleted(stripe, supabaseAdmin, session) {
  if (session.mode !== "subscription" || !session.subscription) {
    return;
  }

  const userId = session.client_reference_id;

  if (!userId) {
    console.error("Checkout session completed with no client_reference_id", session.id);
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  await syncSubscriptionToProfile(supabaseAdmin, userId, subscription);
}

async function handleSubscriptionUpdated(supabaseAdmin, subscription) {
  const userId = subscription.metadata?.supabase_user_id
    || (await findProfileByCustomerId(supabaseAdmin, subscription.customer))?.user_id;

  if (!userId) {
    console.error("Subscription update with no resolvable Gridster user", subscription.id);
    return;
  }

  await syncSubscriptionToProfile(supabaseAdmin, userId, subscription);
}

async function handleSubscriptionDeleted(supabaseAdmin, subscription) {
  const profile = await findProfileByCustomerId(supabaseAdmin, subscription.customer);

  if (!profile) {
    return;
  }

  await supabaseAdmin
    .from("profiles")
    .update({ is_plus: false, plus_status: "canceled" })
    .eq("user_id", profile.user_id);
}

async function handleInvoicePaid(supabaseAdmin, invoice) {
  if (!invoice.subscription) {
    return;
  }

  const profile = await findProfileByCustomerId(supabaseAdmin, invoice.customer);

  if (!profile) {
    console.error("Paid invoice with no resolvable Gridster user", invoice.id);
    return;
  }

  const { error } = await supabaseAdmin.rpc("grant_plus_monthly_bonus", {
    target_user_id: profile.user_id,
    invoice_id: invoice.id,
    bonus_amount: PLUS_MONTHLY_BONUS_BITS,
  });

  if (error) {
    console.error("Failed to grant Plus monthly bonus", error);
  }
}

export async function handleStripeWebhook(request, env) {
  const stripe = createStripeClient(env);
  const supabaseAdmin = createSupabaseAdminClient(env);

  if (!stripe || !supabaseAdmin || !env.STRIPE_WEBHOOK_SECRET) {
    return jsonResponse(500, { error: "Gridster Plus webhook is not configured yet." });
  }

  const signature = request.headers.get("Stripe-Signature");
  const payload = await request.text();

  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return jsonResponse(400, { error: "Invalid signature." });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(stripe, supabaseAdmin, event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(supabaseAdmin, event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabaseAdmin, event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(supabaseAdmin, event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`Failed to process Stripe webhook event ${event.type}`, error);
    return jsonResponse(500, { error: "Webhook processing failed." });
  }

  return jsonResponse(200, { received: true });
}
