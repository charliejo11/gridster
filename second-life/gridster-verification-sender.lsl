// Gridster Verification sender object.
// Rez one official object in Second Life and name it "Gridster Verification".
// Users do not rez this. They only enter their SL legacy username on Gridster.

string GET_PENDING_URL = "https://gridster.elfavina89.workers.dev/api/get-pending-sl-verification-code";
string MARK_SENT_URL = "https://gridster.elfavina89.workers.dev/api/mark-sl-verification-sent";
string SENDER_SECRET = "6IFERpNwCf1pDJ-NLsGxEtxDQ2Z2GisQ";

float POLL_SECONDS = 30.0;
integer DEBUG = TRUE;

key pendingRequestId = NULL_KEY;
key markRequestId = NULL_KEY;
key userKeyRequestId = NULL_KEY;

integer isBusy = FALSE;
string currentVerificationId = "";
string currentSlUsername = "";
string currentCode = "";
string currentAvatarUuid = "";

debugLog(string message)
{
    if (DEBUG)
    {
        llOwnerSay("[Gridster Verification] " + message);
    }
}

integer isMissing(string value)
{
    return value == "" || value == JSON_INVALID;
}

integer isConfigured()
{
    if (GET_PENDING_URL == "" || MARK_SENT_URL == "")
    {
        return FALSE;
    }

    if (llSubStringIndex(SENDER_SECRET, "CHANGE_ME") != -1)
    {
        return FALSE;
    }

    return TRUE;
}

clearCurrent()
{
    pendingRequestId = NULL_KEY;
    markRequestId = NULL_KEY;
    userKeyRequestId = NULL_KEY;
    currentVerificationId = "";
    currentSlUsername = "";
    currentCode = "";
    currentAvatarUuid = "";
    isBusy = FALSE;
}

pollForVerification()
{
    if (!isConfigured())
    {
        llSetTimerEvent(0.0);
        debugLog("Set SENDER_SECRET to match the GRIDSTER_SL_SENDER_SECRET Cloudflare Worker secret, then reset this script.");
        return;
    }

    if (isBusy)
    {
        return;
    }

    isBusy = TRUE;
    pendingRequestId = llHTTPRequest(
        GET_PENDING_URL,
        [
            HTTP_METHOD, "GET",
            HTTP_CUSTOM_HEADER, "X-Gridster-Sender-Secret", SENDER_SECRET
        ],
        ""
    );
}

markDelivery(string deliveryStatus)
{
    if (currentVerificationId == "")
    {
        clearCurrent();
        return;
    }

    list requestFields = [
        "id", currentVerificationId,
        "status", deliveryStatus
    ];

    if (deliveryStatus == "sent" && currentAvatarUuid != "")
    {
        requestFields += ["avatarUuid", currentAvatarUuid];
    }

    string requestBody = llList2Json(JSON_OBJECT, requestFields);

    markRequestId = llHTTPRequest(
        MARK_SENT_URL,
        [
            HTTP_METHOD, "POST",
            HTTP_MIMETYPE, "application/json",
            HTTP_CUSTOM_HEADER, "X-Gridster-Sender-Secret", SENDER_SECRET
        ],
        requestBody
    );
}

default
{
    state_entry()
    {
        debugLog("Sender online.");
        llSetTimerEvent(POLL_SECONDS);
        pollForVerification();
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

    touch_start(integer totalNumber)
    {
        if (llDetectedKey(0) == llGetOwner())
        {
            debugLog("Manual poll requested.");
            pollForVerification();
        }
    }

    timer()
    {
        pollForVerification();
    }

    http_response(key requestId, integer status, list metadata, string body)
    {
        if (requestId == pendingRequestId)
        {
            pendingRequestId = NULL_KEY;

            if (status < 200 || status >= 300)
            {
                debugLog("Pending-code request failed: HTTP " + (string)status + " " + body);
                clearCurrent();
                return;
            }

            if ((integer)llJsonGetValue(body, ["hasPending"]) != 1)
            {
                clearCurrent();
                return;
            }

            currentVerificationId = llJsonGetValue(body, ["id"]);
            currentSlUsername = llJsonGetValue(body, ["slUsername"]);
            currentCode = llJsonGetValue(body, ["code"]);

            if (isMissing(currentVerificationId) || isMissing(currentSlUsername) || isMissing(currentCode))
            {
                debugLog("Pending-code response was missing id, slUsername, or code.");
                clearCurrent();
                return;
            }

            debugLog("Resolving " + currentSlUsername + ".");
            userKeyRequestId = llRequestUserKey(currentSlUsername);
            return;
        }

        if (requestId == markRequestId)
        {
            markRequestId = NULL_KEY;

            if (status < 200 || status >= 300)
            {
                debugLog("Delivery-status update failed: HTTP " + (string)status + " " + body);
            }
            else
            {
                debugLog("Delivery status updated.");
            }

            clearCurrent();
        }
    }

    dataserver(key queryId, string data)
    {
        if (queryId != userKeyRequestId)
        {
            return;
        }

        userKeyRequestId = NULL_KEY;

        if ((key)data == NULL_KEY)
        {
            debugLog("Could not resolve legacy username: " + currentSlUsername + ".");
            markDelivery("failed");
            return;
        }

        key resolvedAvatar = (key)data;
        currentAvatarUuid = (string)resolvedAvatar;
        string message =
            "Gridster Verification\n\n"
            + "Your Gridster verification code is: " + currentCode + "\n\n"
            + "Enter this code on Gridster to connect your Second Life avatar.";

        llInstantMessage(resolvedAvatar, message);
        debugLog("Sent verification IM to " + currentSlUsername + ".");

        // LSL does not provide an IM delivery receipt, so this marks the send attempt.
        markDelivery("sent");
    }
}
