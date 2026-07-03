# Gridster Second Life Verification Sender

This folder contains the official in-world sender bridge for Gridster avatar
verification.

Only the Gridster owner/admin needs to rez this object in Second Life. Users do
not rez anything, install anything, or provide any technical identifier. A user
only enters their Second Life legacy username on the Gridster website, then the
official Gridster sender object sends that avatar a private IM containing the
verification code.

## Netlify environment variables

Set these in Netlify before using the sender:

- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GRIDSTER_SL_SENDER_SECRET`

`GRIDSTER_SL_SENDER_SECRET` should be a new random shared secret used only by the
Second Life sender object. Do not use the Supabase service-role key in Second Life.

## Sender URLs and secret

Put these values in `gridster-verification-sender.lsl`:

- `GET_PENDING_URL`:
  `https://gridster-social.netlify.app/.netlify/functions/get-pending-sl-verification-code`
- `MARK_SENT_URL`:
  `https://gridster-social.netlify.app/.netlify/functions/mark-sl-verification-sent`
- `SENDER_SECRET`: the same value as `GRIDSTER_SL_SENDER_SECRET` in Netlify

The browser never receives `GRIDSTER_SL_SENDER_SECRET` and never calls the
pending-code sender endpoint.

## Second Life setup

1. Create an in-world object named `Gridster Verification`.
2. Add a new script to the object.
3. Paste `gridster-verification-sender.lsl` into the script.
4. Confirm `GET_PENDING_URL` and `MARK_SENT_URL` match the deployed Gridster site.
5. Set `SENDER_SECRET` to match `GRIDSTER_SL_SENDER_SECRET` in Netlify.
6. Save/reset the script.

The sender object polls Gridster for pending codes, resolves the SL legacy username
with `llRequestUserKey`, sends the avatar a private IM, and then marks the code as
sent. If username resolution fails, it marks the request as failed.

## Current bridge flow

1. AuthPage creates a verification request through Netlify.
2. Supabase stores the code with `status = 'pending'`.
3. The in-world sender fetches one pending code.
4. The sender IMs the avatar.
5. The sender marks the row as `sent`.
6. AuthPage verifies the user-entered code through Netlify.
7. Supabase marks the row as `verified`.
