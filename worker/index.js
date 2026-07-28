import { CORS_HEADERS as CREATE_CORS_HEADERS, handleCreateSlVerificationCode } from "./routes/create-sl-verification-code.js";
import { handleGetPendingSlVerificationCode } from "./routes/get-pending-sl-verification-code.js";
import { handleMarkSlVerificationSent } from "./routes/mark-sl-verification-sent.js";
import { CORS_HEADERS as VERIFY_CORS_HEADERS, handleVerifySlVerificationCode } from "./routes/verify-sl-verification-code.js";
import { CORS_HEADERS as PLUS_CHECKOUT_CORS_HEADERS, handleCreatePlusCheckoutSession } from "./routes/create-plus-checkout-session.js";
import { CORS_HEADERS as PLUS_PORTAL_CORS_HEADERS, handleCreatePlusPortalSession } from "./routes/create-plus-portal-session.js";
import { handleStripeWebhook } from "./routes/stripe-webhook.js";
import { CORS_HEADERS as PLUS_LINDEN_CORS_HEADERS, handlePlusLindenPayment } from "./routes/plus-linden-payment.js";
import { expireLindenPlusMemberships } from "./routes/expire-linden-plus-memberships.js";
import { sendEventReminders } from "./routes/send-event-reminders.js";

const ROUTES = {
  "POST /api/create-sl-verification-code": handleCreateSlVerificationCode,
  "GET /api/get-pending-sl-verification-code": handleGetPendingSlVerificationCode,
  "POST /api/mark-sl-verification-sent": handleMarkSlVerificationSent,
  "POST /api/verify-sl-verification-code": handleVerifySlVerificationCode,
  "POST /api/create-plus-checkout-session": handleCreatePlusCheckoutSession,
  "POST /api/create-plus-portal-session": handleCreatePlusPortalSession,
  "POST /api/stripe-webhook": handleStripeWebhook,
  "POST /api/plus-linden-payment": handlePlusLindenPayment,
};

const OPTIONS_HEADERS_BY_PATH = {
  "/api/create-sl-verification-code": CREATE_CORS_HEADERS,
  "/api/verify-sl-verification-code": VERIFY_CORS_HEADERS,
  "/api/create-plus-checkout-session": PLUS_CHECKOUT_CORS_HEADERS,
  "/api/create-plus-portal-session": PLUS_PORTAL_CORS_HEADERS,
  "/api/plus-linden-payment": PLUS_LINDEN_CORS_HEADERS,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && OPTIONS_HEADERS_BY_PATH[url.pathname]) {
      return new Response(null, { status: 204, headers: OPTIONS_HEADERS_BY_PATH[url.pathname] });
    }

    const handler = ROUTES[`${request.method} ${url.pathname}`];

    if (handler) {
      return handler(request, env);
    }

    return new Response(JSON.stringify({ error: "Not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },

  // Runs on the schedule configured in wrangler.jsonc (triggers.crons).
  // Stripe-billed Plus is kept in sync by the Stripe webhook as
  // subscriptions renew/cancel, but a Linden kiosk payment is a one-time
  // credit with no recurring billing event to flip is_plus back off - so
  // this sweep is what actually expires it once plus_current_period_end
  // passes. Scoped to plus_price_tier = 'linden' only; it must never touch
  // Stripe-billed rows.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(expireLindenPlusMemberships(env));
    ctx.waitUntil(sendEventReminders(env));
  },
};
