// Gridster Verification sender object.
// Drop this into an owned in-world object named "Gridster Verification".

string GET_PENDING_URL = "https://gridster-social.netlify.app/.netlify/functions/get-pending-sl-verification-code";
string MARK_SENT_URL = "https://gridster-social.netlify.app/.netlify/functions/mark-sl-verification-sent";
string SENDER_SECRET = "CHANGE_ME_TO_MATCH_GRIDSTER_SL_SENDER_SECRET";
float POLL_SECONDS = 30.0;
integer DEBUG = TRUE;

key pendingRequestId = NULL_KEY;
key markRequestId = NULL_KEY;
key userKeyRequestId = NULL_KEY;

integer isBusy = FALSE;
string currentVerificationId = "";
string currentSlUsername = "";
string currentCode = "";

log(string message)
{
    if (DEBUG)
    {
        llOwnerSay("[Gridster Verification] " + message);
    }
}

integer isConfigured()
{
    if (llSubStringIndex(GET_PENDING_URL, "REAL-SITE") != -1)
    {
        return FALSE;
    }

    if (llSubStringIndex(MARK_SENT_URL, "REAL-SITE") != -1)
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
    currentVerificationId = "";
    currentSlUsername = "";
    currentCode = "";
    userKeyRequestId = NULL_KEY;
    pendingRequestId = NULL_KEY;
    markRequestId = NULL_KEY;
    isBusy = FALSE;
}

pollForVerification()
{
    if (!isConfigured())
    {
        llSetTimerEvent(0.0);
        log("Set GET_PENDING_URL, MARK_SENT_URL, and SENDER_SECRET, then reset this script.");
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
    string body = llList2Json(
        JSON_OBJECT,
        [
            "id", currentVerificationId,
            "status", deliveryStatus
        ]
    );

    markRequestId = llHTTPRequest(
        MARK_SENT_URL,
        [
            HTTP_METHOD, "POST",
            HTTP_MIMETYPE, "application/json",
            HTTP_CUSTOM_HEADER, "X-Gridster-Sender-Secret", SENDER_SECRET
        ],
        body
    );
}

default
{
    state_entry()
    {
        log("Sender online.");
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
            log("Manual poll requested.");
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
                log("Pending-code request failed: HTTP " + (string)status + " " + body);
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

            if (currentVerificationId == "" || currentSlUsername == "" || currentCode == "")
            {
                log("Pending-code response was missing required fields.");
                clearCurrent();
                return;
            }

            log("Resolving " + currentSlUsername + " for " + currentCode + ".");
            userKeyRequestId = llRequestUserKey(currentSlUsername);
            return;
        }

        if (requestId == markRequestId)
        {
            markRequestId = NULL_KEY;

            if (status < 200 || status >= 300)
            {
                log("Delivery-status update failed: HTTP " + (string)status + " " + body);
            }
            else
            {
                log("Delivery status updated.");
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
            log("Could not resolve legacy username for " + currentSlUsername + ".");
            markDelivery("failed");
            return;
        }

        key resolvedAvatar = (key)data;
        string message =
            "Gridster Verification\n\n"
            + "Your Gridster verification code is: " + currentCode + "\n\n"
            + "Enter this code on Gridster to connect your Second Life avatar.";

        llInstantMessage(resolvedAvatar, message);
        log("Sent verification IM to " + currentSlUsername + ".");
        markDelivery("sent");
    }
}
