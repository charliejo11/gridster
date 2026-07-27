// Gridster Plus Linden dollar kiosk.
// Rez ONE of these owned by your personal avatar (NOT deeded to a group)
// and set KIOSK_SECRET below to match the GRIDSTER_LINDEN_KIOSK_SECRET
// Cloudflare Worker secret. Avatars pay this object L$1,750 via the
// standard SL Pay dialog to buy 30 days of Gridster Plus.
//
// SECRET HANDLING - READ BEFORE UPLOADING:
// KIOSK_SECRET below is an intentional placeholder and must stay that way
// in this repository. Never replace it here and commit the result. Set the
// real value only in the copy that lives inside Second Life - either paste
// it directly into the in-world script editor after uploading this file
// unmodified, or edit a local scratch copy that you never `git add`. See
// second-life/gridster-plus-kiosk-README.md, "Secret handling", for the
// exact steps.
//
// IMPORTANT - read second-life/gridster-plus-kiosk-README.md before use.
// In particular: Second Life's money() event does NOT provide a
// transaction id. There is no reliable in-world API that hands scripts
// Linden Lab's own ledger transaction id at the moment a payment is
// received. To make retries safe without a real transaction id, this
// script generates its own unique paymentReference once per payment
// (payer key + this object's key + amount + timestamp + a fresh
// llGenerateKey()), caches it, and reuses the EXACT SAME reference if it
// has to retry the HTTP call for that same payment. A brand new payment
// always gets a brand new reference. The Worker/DB unique constraint on
// that reference - not this script - is what actually guarantees a
// retried request can never double-credit membership. See the README for
// the full threat model (including refunds and what happens if the
// script resets mid-payment).

string WORKER_URL = "https://gridster.elfavina89.workers.dev/api/plus-linden-payment";
string KIOSK_SECRET = "CHANGE_ME_SET_TO_GRIDSTER_LINDEN_KIOSK_SECRET";

integer PLUS_PRICE = 1750;
integer DEBUG = TRUE;

integer gHasDebitPermission = FALSE;

// Parallel lists tracking in-flight payment requests. A kiosk can receive
// more than one payment before the first one's HTTP response comes back
// (money() and http_response() are separate events), so state is tracked
// per in-flight llHTTPRequest rather than with a single "busy" flag.
list gPendingRequestId;
list gPendingReference;
list gPendingGiver;
list gPendingAmount;
list gPendingTimestamp;
list gPendingRetry;

// Parallel lists tracking in-flight refund attempts. llTransferLindenDollars
// is asynchronous - it only returns a transaction id, and the actual
// success/failure is reported later via transaction_result(). This is why
// it replaces llGiveMoney here: llGiveMoney is fire-and-forget and the
// script would otherwise have no way to know a "refund" silently failed.
list gPendingRefundTxnId;
list gPendingRefundGiver;
list gPendingRefundAmount;
list gPendingRefundReference;
list gPendingRefundReason;

debugLog(string message)
{
    if (DEBUG)
    {
        llOwnerSay("[Gridster Plus Kiosk] " + message);
    }
}

integer isMissing(string value)
{
    return value == "" || value == JSON_INVALID;
}

integer isConfigured()
{
    if (WORKER_URL == "")
    {
        return FALSE;
    }

    if (llSubStringIndex(KIOSK_SECRET, "CHANGE_ME") != -1)
    {
        return FALSE;
    }

    return TRUE;
}

integer indexOfRequest(key requestId)
{
    return llListFindList(gPendingRequestId, [requestId]);
}

pushPending(key requestId, string reference, key giver, integer amount, string timestamp, integer retryCount)
{
    gPendingRequestId += [requestId];
    gPendingReference += [reference];
    gPendingGiver += [giver];
    gPendingAmount += [amount];
    gPendingTimestamp += [timestamp];
    gPendingRetry += [retryCount];
}

removePendingAt(integer index)
{
    gPendingRequestId = llDeleteSubList(gPendingRequestId, index, index);
    gPendingReference = llDeleteSubList(gPendingReference, index, index);
    gPendingGiver = llDeleteSubList(gPendingGiver, index, index);
    gPendingAmount = llDeleteSubList(gPendingAmount, index, index);
    gPendingTimestamp = llDeleteSubList(gPendingTimestamp, index, index);
    gPendingRetry = llDeleteSubList(gPendingRetry, index, index);
}

replaceRequestIdAt(integer index, key newRequestId, integer newRetryCount)
{
    gPendingRequestId = llListReplaceList(gPendingRequestId, [newRequestId], index, index);
    gPendingRetry = llListReplaceList(gPendingRetry, [newRetryCount], index, index);
}

string buildSignedMessage(key giver, key objectKey, integer amount, string reference, string timestamp)
{
    // Field order and separators MUST match the Worker's canonicalization
    // exactly (worker/routes/plus-linden-payment.js buildSignedMessage).
    // transactionId is always empty from this script - see header comment.
    return (string)giver + "|" + (string)objectKey + "|" + (string)amount + "|" + reference + "|" + "" + "|" + timestamp;
}

key sendPaymentRequest(key giver, integer amount, string reference, string timestamp)
{
    string message = buildSignedMessage(giver, llGetKey(), amount, reference, timestamp);
    string signature = llHMAC(KIOSK_SECRET, message, "SHA256");

    string body = llList2Json(JSON_OBJECT, [
        "slAvatarUuid", giver,
        "objectUuid", llGetKey(),
        "amountLinden", amount,
        "paymentReference", reference,
        "transactionId", "",
        "timestamp", timestamp
    ]);

    return llHTTPRequest(
        WORKER_URL,
        [
            HTTP_METHOD, "POST",
            HTTP_MIMETYPE, "application/json",
            HTTP_CUSTOM_HEADER, "X-Gridster-Kiosk-Signature", signature
        ],
        body
    );
}

// IMs the owner a warning containing the payer UUID, amount, and generated
// payment reference for any refund that did not (or might not) succeed.
warnOwnerRefundFailed(key giver, integer amount, string reference, string detail)
{
    llInstantMessage(llGetOwner(),
        "Gridster Plus kiosk REFUND WARNING - manual refund may be required.\n"
        + "Payer: " + (string)giver + "\n"
        + "Amount: L$" + (string)amount + "\n"
        + "Reference: " + reference + "\n"
        + "Detail: " + detail);
}

// Starts a refund via llTransferLindenDollars (the confirmed-delivery
// replacement for llGiveMoney - it reports real success/failure through
// transaction_result() instead of firing and forgetting). messagePrefix is
// a complete sentence explaining why the refund is happening, used as-is in
// the messages below.
attemptRefund(key giver, integer amount, string reference, string messagePrefix)
{
    if (!gHasDebitPermission)
    {
        llRegionSayTo(giver, 0,
            messagePrefix + " This kiosk could not auto-refund L$" + (string)amount
            + " - please contact the kiosk owner for a manual refund. (Reference: " + reference + ")");
        warnOwnerRefundFailed(giver, amount, reference, messagePrefix + " No debit permission - refund was not attempted.");
        return;
    }

    key refundTxnId = llTransferLindenDollars(giver, amount);

    if (refundTxnId == NULL_KEY)
    {
        llRegionSayTo(giver, 0,
            messagePrefix + " Your L$" + (string)amount
            + " refund could not be started - please contact the kiosk owner. (Reference: " + reference + ")");
        warnOwnerRefundFailed(giver, amount, reference, messagePrefix + " llTransferLindenDollars did not return a transaction id.");
        return;
    }

    gPendingRefundTxnId += [refundTxnId];
    gPendingRefundGiver += [giver];
    gPendingRefundAmount += [amount];
    gPendingRefundReference += [reference];
    gPendingRefundReason += [messagePrefix];

    llRegionSayTo(giver, 0, messagePrefix + " Attempting to refund your L$" + (string)amount + "...");
}

// A payment that reached the Worker but could not be credited (unlinked
// avatar, server error, or an exhausted retry). The payer's money was
// already taken, so this always both alerts the owner with the full audit
// trail and attempts a refund via attemptRefund().
handleUnprocessedPayment(key giver, integer amount, string reference, string reasonText)
{
    llInstantMessage(llGetOwner(),
        "Gridster Plus kiosk payment NOT credited.\n"
        + "Payer: " + (string)giver + "\n"
        + "Amount: L$" + (string)amount + "\n"
        + "Reference: " + reference + "\n"
        + "Reason: " + reasonText);

    attemptRefund(giver, amount, reference, "Gridster Plus: your payment could not be completed (" + reasonText + ").");
}

default
{
    state_entry()
    {
        // Only ever presents the fixed L$1,750 price - all four quick-pick
        // buttons are hidden, so there is no lower/custom quick-pick option
        // in the Pay dialog. This is a client-side UI default only; some
        // viewers still let an avatar type a different amount in, which is
        // exactly why money() below re-validates the amount independently
        // and never trusts what llSetPayPrice suggested.
        llSetPayPrice(PLUS_PRICE, [PAY_HIDE, PAY_HIDE, PAY_HIDE, PAY_HIDE]);
        llSetText("Gridster Plus Kiosk\nL$" + (string)PLUS_PRICE + " = 30 Days\nClick Pay to activate!", <1.0, 1.0, 1.0>, 1.0);
        llRequestPermissions(llGetOwner(), PERMISSION_DEBIT);

        gPendingRequestId = [];
        gPendingReference = [];
        gPendingGiver = [];
        gPendingAmount = [];
        gPendingTimestamp = [];
        gPendingRetry = [];

        gPendingRefundTxnId = [];
        gPendingRefundGiver = [];
        gPendingRefundAmount = [];
        gPendingRefundReference = [];
        gPendingRefundReason = [];

        if (!isConfigured())
        {
            debugLog("Set KIOSK_SECRET to match the GRIDSTER_LINDEN_KIOSK_SECRET Cloudflare Worker secret, then reset this script.");
        }

        // Best-effort advisory only - not a guaranteed API contract. When an
        // object is deeded to a group, llGetOwner() returns the group's key
        // instead of an avatar key, which is what this compares against. The
        // real requirement ("owned by your avatar, not deeded to a group")
        // must still be confirmed manually in Object > General.
        key objectGroup = llList2Key(llGetObjectDetails(llGetKey(), [OBJECT_GROUP]), 0);

        if (objectGroup != NULL_KEY && llGetOwner() == objectGroup)
        {
            llOwnerSay("WARNING: this kiosk appears to be deeded to a group. Gridster Plus requires the kiosk to be owned by your personal avatar. Un-deed it (Object > General > uncheck Deed) and reset this script.");
        }

        debugLog("Kiosk online. Pay price set to L$" + (string)PLUS_PRICE + ".");
    }

    on_rez(integer startParameter)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER)
        {
            llResetScript();
        }
    }

    run_time_permissions(integer perm)
    {
        if (perm & PERMISSION_DEBIT)
        {
            gHasDebitPermission = TRUE;
            debugLog("Debit permission granted - wrong-amount/failed payments can be auto-refunded.");
        }
        else
        {
            gHasDebitPermission = FALSE;
            debugLog("Debit permission NOT granted - wrong-amount/failed payments will need a manual refund from the owner.");
        }
    }

    touch_start(integer totalNumber)
    {
        key toucher = llDetectedKey(0);

        if (toucher == llGetOwner() && !gHasDebitPermission)
        {
            llRequestPermissions(llGetOwner(), PERMISSION_DEBIT);
        }

        llRegionSayTo(toucher, 0, "Gridster Plus: pay L$" + (string)PLUS_PRICE + " here for 30 days of Gridster Plus, the Plus badge, gold profile glow, and 500 Bling Bits.");
        llRegionSayTo(toucher, 0, "Already subscribed online? Manage your plan on Gridster instead - this kiosk can't be used on top of an active Stripe subscription.");
    }

    money(key giver, integer amount)
    {
        // Generated for every payment attempt, even ones rejected below, so
        // every owner/payer message about this specific attempt can point at
        // a stable reference - not just the ones that reach the Worker.
        string timestamp = llGetTimestamp();
        string reference = (string)giver + "-" + (string)llGetKey() + "-" + (string)amount + "-" + timestamp + "-" + (string)llGenerateKey();

        if (!isConfigured())
        {
            attemptRefund(giver, amount, reference, "Gridster Plus kiosk is not fully set up yet.");
            llInstantMessage(llGetOwner(), "Gridster Plus kiosk received L$" + (string)amount + " from " + (string)giver + " but KIOSK_SECRET is not configured yet. Reference: " + reference);
            return;
        }

        // The Pay dialog only offers L$1,750 (see state_entry), but the
        // amount here is still whatever the paying viewer actually sent -
        // never assume it matches just because of the button configuration.
        if (amount != PLUS_PRICE)
        {
            attemptRefund(giver, amount, reference, "Gridster Plus costs exactly L$" + (string)PLUS_PRICE + " - you paid L$" + (string)amount + ".");
            return;
        }

        key requestId = sendPaymentRequest(giver, amount, reference, timestamp);
        pushPending(requestId, reference, giver, amount, timestamp, 0);

        llRegionSayTo(giver, 0, "Gridster Plus: payment of L$" + (string)amount + " received. Activating your membership...");
        debugLog("Payment received from " + (string)giver + ", reference " + reference);
    }

    http_response(key requestId, integer status, list metadata, string body)
    {
        integer idx = indexOfRequest(requestId);

        if (idx == -1)
        {
            return;
        }

        string reference = llList2String(gPendingReference, idx);
        key giver = llList2Key(gPendingGiver, idx);
        integer amount = llList2Integer(gPendingAmount, idx);
        string timestamp = llList2String(gPendingTimestamp, idx);
        integer retryCount = llList2Integer(gPendingRetry, idx);

        if (status >= 200 && status < 300)
        {
            string resultStatus = llJsonGetValue(body, ["status"]);
            removePendingAt(idx);

            if (resultStatus == "success")
            {
                string periodEnd = llJsonGetValue(body, ["plusCurrentPeriodEnd"]);
                string balance = llJsonGetValue(body, ["blingBalance"]);

                llRegionSayTo(giver, 0,
                    "Gridster Plus activated! You're set for 30 days (until " + periodEnd
                    + "). +500 Bling Bits credited (balance: " + balance + ").");
                debugLog("Payment confirmed, reference " + reference);
            }
            else if (resultStatus == "duplicate")
            {
                llRegionSayTo(giver, 0, "Gridster Plus: this payment was already processed - your membership is already active. No further action needed.");
                debugLog("Duplicate no-op, reference " + reference);
            }
            else
            {
                handleUnprocessedPayment(giver, amount, reference, "unexpected server response");
            }

            return;
        }

        string nonSuccessStatus = llJsonGetValue(body, ["status"]);

        // Stripe and Linden Plus are mutually exclusive (HTTP 409). This is
        // not a transient failure and not "unprocessed" in the generic
        // sense - the payer is a legitimate active member already, just on
        // the other billing path - so it gets its own message and always
        // triggers a refund attempt, never a retry.
        if (nonSuccessStatus == "active_stripe_subscription")
        {
            removePendingAt(idx);

            llInstantMessage(llGetOwner(),
                "Gridster Plus kiosk payment rejected - payer already has an active Stripe subscription.\n"
                + "Payer: " + (string)giver + "\n"
                + "Amount: L$" + (string)amount + "\n"
                + "Reference: " + reference);

            attemptRefund(giver, amount, reference, "You already have an active Stripe Gridster Plus subscription. Your Linden payment is being refunded.");
            return;
        }

        // status == 0 means the HTTP request itself failed (timeout, DNS,
        // sim-side networking) rather than the Worker returning an error -
        // both are worth exactly one retry since they may be transient.
        integer retryable = (status == 0 || status >= 500);

        if (retryable && retryCount == 0)
        {
            key newRequestId = sendPaymentRequest(giver, amount, reference, timestamp);
            replaceRequestIdAt(idx, newRequestId, 1);
            debugLog("Retrying payment request, reference " + reference + ", previous HTTP status " + (string)status);
            return;
        }

        string errorMessage = llJsonGetValue(body, ["error"]);

        if (isMissing(errorMessage))
        {
            errorMessage = "Gridster could not confirm this payment (HTTP " + (string)status + ")";
        }

        removePendingAt(idx);
        handleUnprocessedPayment(giver, amount, reference, errorMessage);
    }

    // Reports the real outcome of an llTransferLindenDollars refund. success
    // is only ever a reliable TRUE/FALSE here - it must not be assumed at
    // the point the transfer was requested.
    transaction_result(key transaction_id, integer success, string data)
    {
        integer idx = llListFindList(gPendingRefundTxnId, [transaction_id]);

        if (idx == -1)
        {
            return;
        }

        key giver = llList2Key(gPendingRefundGiver, idx);
        integer amount = llList2Integer(gPendingRefundAmount, idx);
        string reference = llList2String(gPendingRefundReference, idx);
        string reasonText = llList2String(gPendingRefundReason, idx);

        gPendingRefundTxnId = llDeleteSubList(gPendingRefundTxnId, idx, idx);
        gPendingRefundGiver = llDeleteSubList(gPendingRefundGiver, idx, idx);
        gPendingRefundAmount = llDeleteSubList(gPendingRefundAmount, idx, idx);
        gPendingRefundReference = llDeleteSubList(gPendingRefundReference, idx, idx);
        gPendingRefundReason = llDeleteSubList(gPendingRefundReason, idx, idx);

        if (success)
        {
            llInstantMessage(giver, "Gridster Plus: your L$" + (string)amount + " refund was successful. Reference: " + reference);
            debugLog("Refund confirmed, reference " + reference);
        }
        else
        {
            llInstantMessage(giver,
                "Gridster Plus: your L$" + (string)amount + " refund FAILED. Please contact the kiosk owner. Reference: " + reference);
            warnOwnerRefundFailed(giver, amount, reference, "llTransferLindenDollars reported failure (" + data + "). Original issue: " + reasonText);
            debugLog("Refund FAILED, reference " + reference + ", data " + data);
        }
    }
}
