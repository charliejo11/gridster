# Gridster Plus Linden Dollar Kiosk

An in-world Second Life object that sells 30 days of Gridster Plus for
L$1,750, paid directly to the kiosk via the standard SL Pay dialog. This is
a separate, one-time payment path alongside (not a replacement for) the
existing Stripe monthly/annual/founding subscriptions.

## What one payment includes

- Gridster Plus status for 30 days
- Plus badge
- Gold profile glow
- 500 Bling Bits

There is no Linden-billed annual option yet, and the Linden price is
intentionally not cheaper than Stripe (L$1,750 is priced at parity with the
site's Stripe pricing, not as a discount).

## Membership rule: Stripe and Linden Plus are mutually exclusive

Gridster Plus has exactly one expiry clock per account
(`profiles.plus_current_period_end`), and it is either driven by Stripe or
by the Linden kiosk - never both at once. The rule, enforced atomically
inside `credit_gridster_plus_linden_payment()` in the database (not just in
the Worker or the kiosk script):

- **Active Stripe member** (`is_plus = true` and `plus_price_tier` is
  `monthly`, `annual`, or `founding`) pays the kiosk → **rejected and
  refunded**. Nothing is written to the database - no payment row, no
  period change, no Bling Bits, no change to Stripe fields.
- **Active Linden member** (`is_plus = true` and `plus_price_tier = 'linden'`)
  pays the kiosk → **extends another 30 days** from the existing
  `plus_current_period_end`, and grants another 500 Bling Bits.
- **Expired or non-member** pays the kiosk → **activates 30 days** from now.

A lapsed/canceled Stripe member (`is_plus = false`, even if `plus_price_tier`
still shows a stale `monthly`/`annual`/`founding` from before they canceled)
is treated as a non-member and can buy Linden Plus normally - the block only
applies while a Stripe subscription is currently active.

## Setup

1. Rez one object in Second Life, owned by your own avatar. **Do not deed it
   to a group.** Deeding transfers ownership to the group, and the kiosk must
   stay owned by your personal avatar.
2. Add a new script to the object and paste in `gridster-plus-kiosk.lsl`
   **exactly as committed** - it still has the `KIOSK_SECRET` placeholder.
3. Set the real secret **only inside Second Life** - see "Secret handling"
   immediately below before doing anything else. Do not reuse
   `GRIDSTER_SL_SENDER_SECRET` or any Stripe secret for this; it should be
   its own random value.
4. Confirm `WORKER_URL` points at your deployed Worker
   (`https://YOUR-CLOUDFLARE-DOMAIN/api/plus-linden-payment`).
5. Save/reset the script. On rez, the kiosk will:
   - Set its Pay dialog default price to L$1,750.
   - Show hover text with the price and offer.
   - Request `PERMISSION_DEBIT` from you (the owner) so it can auto-refund
     wrong-amount or failed payments. If you are not online/in the sim when
     it first requests this, touch the kiosk once while logged in to grant
     it (see "Refund limitations" below).
6. Set the matching Cloudflare Worker secret:
   ```
   wrangler secret put GRIDSTER_LINDEN_KIOSK_SECRET
   ```

## Secret handling - read this before uploading

`KIOSK_SECRET` in the committed `gridster-plus-kiosk.lsl` is a placeholder
(`CHANGE_ME_SET_TO_GRIDSTER_LINDEN_KIOSK_SECRET`) and it must **stay** a
placeholder in this repository. The real value is the shared secret behind
the HMAC signature the Worker uses to authenticate the kiosk - if it ever
lands in a commit, treat it as compromised, rotate it in Cloudflare, and
update the kiosk, even after removing it from the file, since it would still
be recoverable from git history.

Two safe ways to get the real secret onto the kiosk, in order of preference:

1. **Edit it in-world (recommended).** Upload/paste the script into the
   object exactly as committed, save it, then open the script again in the
   in-world script editor and change just the `KIOSK_SECRET` line there,
   using the real value. Save/reset. The real secret then only ever exists
   inside the Second Life object and in your Cloudflare Worker secret store -
   it never touches your local git checkout at all.
2. **Edit a local copy you never stage.** If you'd rather edit the file on
   your machine before uploading it, copy `gridster-plus-kiosk.lsl` to a
   file outside the repo (or somewhere covered by `.gitignore`) and edit the
   secret there. Do not edit the real, tracked `gridster-plus-kiosk.lsl` in
   place - `git status` should never show that file as modified once the
   real secret is in it. If it ever does, revert it before committing
   anything else.

Either way, before every `git add`/`git commit` touching this file, confirm
`KIOSK_SECRET` in the tracked copy still reads
`CHANGE_ME_SET_TO_GRIDSTER_LINDEN_KIOSK_SECRET`.

## How a payment flows

1. An avatar clicks Pay on the kiosk and pays L$1,750.
2. The `money()` event fires with the payer's avatar key and the amount.
3. The script verifies the amount is exactly 1,750. If not, it attempts an
   automatic refund (see limitations) and tells the payer to pay the exact
   amount.
4. For a correct amount, the script builds a JSON payload (payer UUID,
   object UUID, amount, a generated payment reference, an empty
   `transactionId`, and a timestamp), signs it with an HMAC-SHA256 signature
   computed from `KIOSK_SECRET`, and POSTs it to
   `/api/plus-linden-payment`.
5. The Worker verifies the signature, re-validates the amount server-side,
   looks up the Gridster profile by `sl_avatar_uuid` (requiring it to be
   SL-verified), and calls `credit_gridster_plus_linden_payment()`, which -
   inside one locked, atomic database transaction - rejects the payment if
   the profile already has an active Stripe subscription, otherwise credits
   Plus + Bling Bits idempotently.
6. The kiosk shows the payer a clear success, duplicate, already-on-Stripe,
   or failure message in local chat, and IMs the owner full details on any
   payment that could not be credited (including an already-on-Stripe
   rejection, which is always auto-refunded).

## The transaction id problem (read this before assuming anything)

Second Life's `money(key giver, integer amount)` event does **not** provide
a Linden Lab transaction id, and there is no other reliable LSL API that
hands a script that id at the moment a payment is received. Anything that
claims otherwise is hand-waving.

Because of that, this system does not attempt to use a real SL transaction
id as its idempotency key. Instead:

- The kiosk script generates its own `paymentReference` **once per payment
  attempt**, from the payer's key, the kiosk's own key, the amount, an
  ISO-8601 timestamp, and a fresh `llGenerateKey()` (a server-side random
  UUID generator).
- That exact same reference is cached and reused if the script has to retry
  the HTTP call for that same payment (e.g. the first request timed out
  before a response came back).
- A genuinely new payment (a second, separate L$1,750 payment) always gets
  a brand new reference, and is treated as a legitimate additional 30-day
  extension - it is not deduplicated against a prior purchase.
- The database enforces a unique constraint on `payment_reference`
  (`gridster_plus_linden_payments.payment_reference`), which is what
  actually guarantees a retried Worker call can never double-credit. The
  LSL-side caching is what makes retries use the constraint correctly; the
  constraint itself is what makes it safe.

`transactionId` is still included in the request/response schema for
forward compatibility (in case Linden Lab ever exposes one, or a future
version reconciles against SL's own transaction history some other way),
but it is currently always sent empty by the kiosk and must not be treated
as an idempotency key.

**Assumption to verify:** this design depends on `llGenerateKey()`,
`llHMAC()`, and `llTransferLindenDollars()`/`transaction_result()` being
available on the region's simulator version. All are official Second Life
LSL functions (not OpenSim-only or deprecated), but if any were ever
unavailable, the script simply fails to **compile** - there is no silent
runtime failure mode. Test-rez the kiosk in a sandbox region and confirm it
compiles cleanly before deploying it live.

## Refund limitations

- Refunds are sent with `llTransferLindenDollars`, not `llGiveMoney`.
  `llGiveMoney` is fire-and-forget - the script has no way to know whether
  it actually succeeded. `llTransferLindenDollars` returns a transaction id
  and later fires `transaction_result(transaction_id, success, data)`, so
  the kiosk only ever tells anyone a refund "succeeded" once SL has actually
  confirmed it - never optimistically at the moment it was requested.
- Auto-refunds still require the kiosk to hold `PERMISSION_DEBIT` from its
  owner (same requirement as `llGiveMoney` had). SL only grants financial
  permissions through an interactive dialog to the owner, so if you were not
  present/online when the script first requested it, no automatic refund is
  possible until you touch the kiosk (which re-requests the permission)
  while logged in.
- If `llTransferLindenDollars` cannot even start (no permission, or it
  returns `NULL_KEY`), or if `transaction_result` later reports failure, the
  payer and the kiosk owner are both messaged with a clear warning
  containing the payer's UUID, the amount, and the payment reference for
  that attempt, so it can be tracked down and refunded by hand.
- A refund is only attempted for payments the script can prove it did not
  credit (wrong amount, kiosk not configured, or a terminal Worker failure
  after one retry). It is never attempted for a `"duplicate"` result,
  because a duplicate result means the original payment already succeeded
  and granted Plus - refunding that would take back a benefit the payer
  legitimately received.
- If the script itself resets or the region restarts between taking a
  payment and getting a response (e.g. `on_rez`/`changed(CHANGED_OWNER)`
  fires, or the sim crashes), the in-flight payment (or in-flight refund)
  record is lost from memory. The payer's money was already taken by that
  point. There is no way for the script to reconcile against Second Life's
  own transaction ledger after the fact - the owner would need to check the
  Second Life transaction history (Second Life website / viewer transaction
  log) for that avatar and object, then manually credit or refund. This is a
  real gap; it is called out here rather than glossed over.
- Nothing in this system automatically reconciles against Linden Lab's own
  billing records. All automatic behavior is driven entirely by what the
  kiosk script itself observed in the `money()` and `transaction_result()`
  events.

## Testing

See the main report for exact test steps: successful payment, duplicate
payment, wrong amount, unlinked avatar, active Stripe monthly/annual/founding
member (each rejected + refunded), active Linden member (extends 30 days,
one more 500-Bit grant), and expired Linden member (reactivates). Test in a
sandbox/private region with a throwaway alt account before using a personal
or high-value avatar, since real L$ changes hands on every test.
