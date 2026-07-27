import { createSupabaseAdminClient, jsonResponse } from "../shared/gridster.js";
import { createStripeClient } from "../shared/stripe.js";

const PLUS_MONTHLY_BONUS_BITS = 500;
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

// Stripe API versions from 2025-03-31 onward moved these fields:
//   Invoice.subscription        -> Invoice.parent.subscription_details.subscription
//   Subscription.current_period_end -> Subscription.items.data[0].current_period_end
// We don't pin an apiVersion (see shared/stripe.js), so the account's
// current default applies. Read both the old and new shapes so this
// keeps working regardless of which version is active on the account.

function extractId(value) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id ?? null;
}

function extractInvoiceSubscriptionId(invoice) {
  const legacy = extractId(invoice.subscription);

  if (legacy) {
    return legacy;
  }

  return extractId(invoice.parent?.subscription_details?.subscription);
}

function extractCurrentPeriodEnd(subscription) {
  if (subscription.current_period_end) {
    return subscription.current_period_end;
  }

  return subscription.items?.data?.[0]?.current_period_end ?? null;
}

async function findProfileByCustomerId(supabaseAdmin, customerId) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error("Failed to look up profile by Stripe customer id", customerId, error);
    return null;
  }

  console.log("Profile lookup by customer id", { customerId, found: Boolean(data), userId: data?.user_id ?? null });

  return data;
}

async function syncSubscriptionToProfile(supabaseAdmin, userId, subscription) {
  const rawPeriodEnd = extractCurrentPeriodEnd(subscription);
  const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null;

  console.log("Subscription current_period_end extraction", {
    subscriptionId: subscription.id,
    topLevelValue: subscription.current_period_end ?? null,
    firstItemValue: subscription.items?.data?.[0]?.current_period_end ?? null,
    resolved: rawPeriodEnd,
    resolvedIso: periodEnd,
  });

  const update = {
    is_plus: ACTIVE_STATUSES.has(subscription.status),
    plus_status: subscription.status,
    plus_current_period_end: periodEnd,
    stripe_subscription_id: subscription.id,
  };

  if (subscription.metadata?.plus_price_tier) {
    update.plus_price_tier = subscription.metadata.plus_price_tier;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(update)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to sync subscription to profile", userId, error);
  }
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
    || (await findProfileByCustomerId(supabaseAdmin, extractId(subscription.customer)))?.user_id;

  if (!userId) {
    console.error("Subscription update with no resolvable Gridster user", subscription.id);
    return;
  }

  await syncSubscriptionToProfile(supabaseAdmin, userId, subscription);
}

async function handleSubscriptionDeleted(supabaseAdmin, subscription) {
  const profile = await findProfileByCustomerId(supabaseAdmin, extractId(subscription.customer));

  if (!profile) {
    return;
  }

  await supabaseAdmin
    .from("profiles")
    .update({ is_plus: false, plus_status: "canceled" })
    .eq("user_id", profile.user_id);
}

// Revokes Plus on a refund/dispute without touching the underlying Stripe
// subscription - that's a deliberate, separate decision left to whoever
// issues the refund. This means if the subscription is refunded but not
// also cancelled, the next successful invoice.paid will legitimately
// re-grant Plus (they paid again, they get access again) - not a bug,
// just worth knowing rather than a hidden gap.

async function handleChargeRefunded(supabaseAdmin, charge) {
  // charge.refunded is only true once the charge is refunded in full - a
  // partial/goodwill refund leaves it false, and we deliberately do not
  // revoke Plus for a partial refund since the customer is still
  // substantially paying for continued access.
  if (!charge.refunded) {
    console.log("charge.refunded was a partial refund - not revoking Plus", charge.id);
    return;
  }

  const profile = await findProfileByCustomerId(supabaseAdmin, extractId(charge.customer));

  if (!profile) {
    console.log("Refunded charge with no resolvable Gridster user", charge.id);
    return;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_plus: false, plus_status: "refunded" })
    .eq("user_id", profile.user_id);

  if (error) {
    console.error("Failed to revoke Plus after full refund", profile.user_id, charge.id, error);
    return;
  }

  console.log("Revoked Plus after full refund", profile.user_id, charge.id);
}

async function handleChargeDisputeCreated(stripe, supabaseAdmin, dispute) {
  // The dispute object itself doesn't carry the customer id - only the
  // charge id, so the charge has to be fetched to resolve who this is.
  const charge = await stripe.charges.retrieve(extractId(dispute.charge));
  const profile = await findProfileByCustomerId(supabaseAdmin, extractId(charge.customer));

  if (!profile) {
    console.log("Disputed charge with no resolvable Gridster user", dispute.id, charge.id);
    return;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_plus: false, plus_status: "disputed" })
    .eq("user_id", profile.user_id);

  if (error) {
    console.error("Failed to revoke Plus after dispute", profile.user_id, dispute.id, error);
    return;
  }

  console.log("Revoked Plus after dispute", profile.user_id, dispute.id);
}

async function handleInvoicePaid(supabaseAdmin, invoice) {
  const customerId = extractId(invoice.customer);
  const subscriptionId = extractInvoiceSubscriptionId(invoice);

  console.log("invoice.paid fields", {
    invoiceId: invoice.id,
    rawCustomer: invoice.customer,
    rawSubscription: invoice.subscription,
    parentSubscriptionDetails: invoice.parent?.subscription_details ?? null,
    resolvedCustomerId: customerId,
    resolvedSubscriptionId: subscriptionId,
  });

  if (!subscriptionId) {
    console.log("invoice.paid has no resolvable subscription id - not a Plus renewal, skipping bonus", invoice.id);
    return;
  }

  const profile = await findProfileByCustomerId(supabaseAdmin, customerId);

  if (!profile) {
    console.error("Paid invoice with no resolvable Gridster user", invoice.id, customerId);
    return;
  }

  console.log("Calling grant_plus_monthly_bonus", {
    targetUserId: profile.user_id,
    invoiceId: invoice.id,
    bonusAmount: PLUS_MONTHLY_BONUS_BITS,
  });

  const { data, error } = await supabaseAdmin.rpc("grant_plus_monthly_bonus", {
    target_user_id: profile.user_id,
    invoice_id: invoice.id,
    bonus_amount: PLUS_MONTHLY_BONUS_BITS,
  });

  if (error) {
    console.error("Failed to grant Plus monthly bonus", invoice.id, error);
    return;
  }

  console.log("grant_plus_monthly_bonus result", invoice.id, data);
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

  console.log("Stripe webhook event received", event.type, event.id);

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
      case "charge.refunded":
        await handleChargeRefunded(supabaseAdmin, event.data.object);
        break;
      case "charge.dispute.created":
        await handleChargeDisputeCreated(stripe, supabaseAdmin, event.data.object);
        break;
      default:
        console.log("Unhandled Stripe webhook event type", event.type);
        break;
    }
  } catch (error) {
    console.error(`Failed to process Stripe webhook event ${event.type}`, error);
    return jsonResponse(500, { error: "Webhook processing failed." });
  }

  return jsonResponse(200, { received: true });
}
