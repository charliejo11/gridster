import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { createSupabaseAdminClient, jsonResponse } from "../shared/gridster.js";

// Second Life's money() event does not hand scripts a transaction id, so the
// kiosk (second-life/gridster-plus-kiosk.lsl) generates its own idempotency
// key (paymentReference) once per payment attempt and reuses it verbatim
// across HTTP retries of that same attempt. transactionId is accepted and
// stored for forward-compatibility only - it is not currently populated by
// the kiosk and MUST NOT be relied on for idempotency. That job belongs to
// paymentReference, enforced by the unique constraint on
// gridster_plus_linden_payments.payment_reference.
//
// Stripe and Linden Plus are mutually exclusive: an active Stripe subscriber
// who pays the kiosk is rejected with reason=active_stripe_subscription by
// credit_gridster_plus_linden_payment() (checked atomically inside that
// function, not here) and the kiosk auto-refunds the payment - see
// second-life/gridster-plus-kiosk.lsl.

export const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "Content-Type, X-Gridster-Kiosk-Signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const PLUS_LINDEN_PRICE = 1750;
const PLUS_LINDEN_BONUS_BITS = 500;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Generous skew window: SL region clocks can drift and this is not the
// primary replay defense (the payment_reference uniqueness constraint is).
// This just keeps obviously-stale or clock-broken requests out of logs.
const MAX_TIMESTAMP_SKEW_MS = 24 * 60 * 60 * 1000;

function buildSignedMessage({ slAvatarUuid, objectUuid, amountLinden, paymentReference, transactionId, timestamp }) {
  return [slAvatarUuid, objectUuid, String(amountLinden), paymentReference, transactionId || "", timestamp].join("|");
}

function verifySignature(secret, message, providedSignatureBase64) {
  if (!providedSignatureBase64) {
    return false;
  }

  let provided;
  let expected;

  try {
    provided = Buffer.from(providedSignatureBase64, "base64");
    expected = createHmac("sha256", secret).update(message).digest();
  } catch {
    return false;
  }

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}

export async function handlePlusLindenPayment(request, env) {
  const supabaseAdmin = createSupabaseAdminClient(env);
  const kioskSecret = env.GRIDSTER_LINDEN_KIOSK_SECRET;

  if (!supabaseAdmin || !kioskSecret) {
    return jsonResponse(
      500,
      { ok: false, status: "server_error", error: "Gridster Plus Linden payments are not configured yet." },
      CORS_HEADERS
    );
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, status: "bad_request", error: "Request body must be valid JSON." }, CORS_HEADERS);
  }

  const slAvatarUuid = String(payload.slAvatarUuid || "").trim().toLowerCase();
  const objectUuid = String(payload.objectUuid || "").trim().toLowerCase();
  const paymentReference = String(payload.paymentReference || "").trim();
  const transactionId = String(payload.transactionId || "").trim();
  const timestamp = String(payload.timestamp || "").trim();
  const amountLinden = Number(payload.amountLinden);

  if (
    !UUID_PATTERN.test(slAvatarUuid) ||
    !UUID_PATTERN.test(objectUuid) ||
    !paymentReference ||
    paymentReference.length > 200 ||
    !timestamp ||
    !Number.isInteger(amountLinden)
  ) {
    return jsonResponse(
      400,
      { ok: false, status: "bad_request", error: "Missing or malformed payment fields." },
      CORS_HEADERS
    );
  }

  const parsedTimestamp = Date.parse(timestamp);

  if (!Number.isFinite(parsedTimestamp) || Math.abs(Date.now() - parsedTimestamp) > MAX_TIMESTAMP_SKEW_MS) {
    return jsonResponse(400, { ok: false, status: "bad_request", error: "Timestamp is missing or out of range." }, CORS_HEADERS);
  }

  const signedMessage = buildSignedMessage({ slAvatarUuid, objectUuid, amountLinden, paymentReference, transactionId, timestamp });
  const providedSignature = request.headers.get("X-Gridster-Kiosk-Signature");

  if (!verifySignature(kioskSecret, signedMessage, providedSignature)) {
    return jsonResponse(401, { ok: false, status: "unauthorized", error: "Invalid kiosk signature." }, CORS_HEADERS);
  }

  if (amountLinden !== PLUS_LINDEN_PRICE) {
    return jsonResponse(
      400,
      { ok: false, status: "invalid_amount", error: `Gridster Plus costs exactly L$${PLUS_LINDEN_PRICE}.` },
      CORS_HEADERS
    );
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("credit_gridster_plus_linden_payment", {
      target_sl_avatar_uuid: slAvatarUuid,
      target_amount_linden: amountLinden,
      target_payment_reference: paymentReference,
      target_object_uuid: objectUuid,
      target_bonus_amount: PLUS_LINDEN_BONUS_BITS,
    });

    if (error) {
      console.error("credit_gridster_plus_linden_payment failed", paymentReference, error);
      return jsonResponse(500, { ok: false, status: "server_error", error: "Could not process this payment. Try again in a moment." }, CORS_HEADERS);
    }

    if (data?.reason === "unlinked_avatar") {
      return jsonResponse(
        404,
        { ok: false, status: "unlinked_avatar", error: "No verified Gridster account is linked to this Second Life avatar." },
        CORS_HEADERS
      );
    }

    if (data?.reason === "active_stripe_subscription") {
      return jsonResponse(
        409,
        {
          ok: false,
          status: "active_stripe_subscription",
          error: "This Gridster account already has an active Stripe Gridster Plus subscription.",
        },
        CORS_HEADERS
      );
    }

    if (data?.duplicate) {
      return jsonResponse(200, { ok: true, status: "duplicate" }, CORS_HEADERS);
    }

    return jsonResponse(
      200,
      {
        ok: true,
        status: "success",
        plusCurrentPeriodEnd: data?.plus_current_period_end ?? null,
        blingBalance: data?.balance ?? null,
      },
      CORS_HEADERS
    );
  } catch (error) {
    console.error("Failed to process Plus Linden payment", paymentReference, error);
    return jsonResponse(500, { ok: false, status: "server_error", error: "Could not process this payment. Try again in a moment." }, CORS_HEADERS);
  }
}
