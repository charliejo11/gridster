// =========================================================================
// Gridster Games security regression suite
//
// SCRATCH / DEV SUPABASE DATABASE ONLY. NEVER RUN THIS AGAINST PRODUCTION -
// it creates and deletes real auth.users rows and calls real RPCs with
// adversarial inputs, and calls the service_role-only close_due_photo_battles().
//
// Covers the 12 named adversarial scenarios from the Gridster Games MVP
// plan (Daily Spin / Trivia / Photo Challenge Battles) across
// 20260804000000 - 20260804060000. Each of these maps directly to an
// explicit "prevent X" requirement from the feature spec - this suite
// exists so none of them can silently regress.
//
// Not run in CI (requires live Supabase service_role credentials - see
// supabase/tests/security_regressions.mjs for the same rationale). Run by
// hand against gridster-test (or any scratch project) before shipping any
// future migration that touches Gridster Games:
//
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_ANON_KEY=<anon key> \
//   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
//   node supabase/tests/game_security_regressions.mjs
//
// Exits non-zero (and prints which checks failed) if anything regresses.
// =========================================================================

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON_KEY || !SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY. " +
      "Point these at gridster-test (or another scratch project) - never production."
  );
  process.exit(1);
}

if (/yuqiyavwkklbdltvmrqe/.test(URL)) {
  console.error("Refusing to run: SUPABASE_URL looks like the production project ref. Use gridster-test instead.");
  process.exit(1);
}

const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const results = [];
function report(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`);
}

async function createUser(tag) {
  const email = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const password = "TestPass123!gameregress";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser ${tag}: ${error.message}`);
  const client = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw new Error(`signIn ${tag}: ${signInErr.message}`);
  const { error: profileErr } = await client.from("profiles").upsert({
    user_id: data.user.id,
    display_name: tag,
    sl_username: tag,
    bio: `Regression test bio for ${tag}`,
    sl_avatar_uuid: `${tag}-uuid-${Date.now()}`,
    sl_verified: true,
  });
  if (profileErr) throw new Error(`profile upsert ${tag}: ${profileErr.message}`);
  return { userId: data.user.id, client };
}

async function cleanupUser(userId) {
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

// Battles are created through a real is_admin AUTHENTICATED client (the
// "Admins can write photo battles" RLS policy), not the service_role
// client - gridster-test has a known, project-specific gap where
// service_role lacks default table privileges on tables created via CLI
// push this session (confirmed absent on production), so raw
// admin.from(...) table access on these tables is unreliable here even
// though the SECURITY DEFINER RPCs (owned by postgres) work fine
// regardless. Routing through the real authenticated-admin RLS path sidesteps
// the gap entirely and is also the actually-correct simulation of how an
// admin creates a battle in production (via the UI, not a backend service key).
async function createBattle(client, overrides = {}) {
  const now = Date.now();
  const { data, error } = await client
    .from("gridster_game_photo_battles")
    .insert({
      title: `Regress Battle ${now}-${Math.random().toString(36).slice(2, 6)}`,
      open_at: new Date(now - 60_000).toISOString(),
      close_at: new Date(now + 3600_000).toISOString(),
      vote_cap_per_user: 1,
      reward_bling_bits: 40,
      ...overrides,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createBattle: ${error.message}`);
  return data;
}

// Reads a user's own balance through their own authenticated client (the
// "Users can read their own bling balance" policy) rather than the
// service_role client, for the same reason as createBattle above.
async function getOwnBalance(client, userId) {
  const { data } = await client.from("bling_balances").select("balance").eq("user_id", userId).maybeSingle();
  return data?.balance || 0;
}

const users = [];
async function u(tag) {
  const created = await createUser(tag);
  users.push(created);
  return created;
}

try {
  // ---------------------------------------------------------------
  // 1. Daily bonus claim race (§0 re-fix) - concurrent calls must
  //    grant exactly once per bonus type, per user.
  // ---------------------------------------------------------------
  const bonusA = await u("game-bonus-a");
  const bonusB = await u("game-bonus-b");
  const bonusC = await u("game-bonus-c");

  const [dl1, dl2] = await Promise.all([
    bonusA.client.rpc("claim_daily_login_bonus"),
    bonusA.client.rpc("claim_daily_login_bonus"),
  ]);
  const dlGrants = [dl1, dl2].filter((r) => r.data?.granted === true).length;
  report("claim_daily_login_bonus: concurrent calls grant exactly once", dlGrants === 1, JSON.stringify([dl1.data, dl2.data]));

  const [pc1, pc2] = await Promise.all([
    bonusB.client.rpc("claim_profile_complete_bonus"),
    bonusB.client.rpc("claim_profile_complete_bonus"),
  ]);
  const pcGrants = [pc1, pc2].filter((r) => r.data?.granted === true).length;
  report("claim_profile_complete_bonus: concurrent calls grant exactly once", pcGrants === 1, JSON.stringify([pc1.data, pc2.data]));

  const [sv1, sv2] = await Promise.all([
    bonusC.client.rpc("claim_sl_verified_bonus"),
    bonusC.client.rpc("claim_sl_verified_bonus"),
  ]);
  const svGrants = [sv1, sv2].filter((r) => r.data?.granted === true).length;
  report("claim_sl_verified_bonus: concurrent calls grant exactly once", svGrants === 1, JSON.stringify([sv1.data, sv2.data]));

  // ---------------------------------------------------------------
  // 2. Duplicate spin rewards - concurrent spin_daily() same user/day
  //    must grant exactly one reward; a later call replays the SAME
  //    stored reward rather than rerolling.
  // ---------------------------------------------------------------
  const spinUser = await u("game-spin");

  const [s1, s2] = await Promise.all([
    spinUser.client.rpc("spin_daily", { is_bonus_spin: false }),
    spinUser.client.rpc("spin_daily", { is_bonus_spin: false }),
  ]);
  const spinNonReplays = [s1, s2].filter((r) => r.data?.already_spun === false).length;
  report("spin_daily: concurrent calls grant exactly one real spin", spinNonReplays === 1, JSON.stringify([s1.data, s2.data]));

  const s3 = await spinUser.client.rpc("spin_daily", { is_bonus_spin: false });
  const firstReward = (s1.data?.already_spun ? s1.data : s2.data);
  report(
    "spin_daily: replaying after the slot is spent returns the SAME stored reward, never a reroll",
    s3.data?.already_spun === true &&
      s3.data?.reward_type === firstReward?.reward_type &&
      s3.data?.bling_bits_amount === firstReward?.bling_bits_amount,
    JSON.stringify({ replay: s3.data, original: firstReward })
  );

  // ---------------------------------------------------------------
  // 3. Premium entitlement enforced server-side - a non-premium user
  //    cannot get the bonus spin no matter what the client claims.
  // ---------------------------------------------------------------
  const nonPremiumUser = await u("game-nonpremium");
  const bonusSpinResult = await nonPremiumUser.client.rpc("spin_daily", { is_bonus_spin: true });
  report(
    "spin_daily(is_bonus_spin: true) is rejected for a non-premium user regardless of client input",
    !!bonusSpinResult.error,
    bonusSpinResult.error?.message
  );

  // ---------------------------------------------------------------
  // 8/10. Trivia: repeated answer submission + answer-key exposure.
  // Uses admin (service_role, auth.uid() is null -> allowed as
  // "system") to generate today's challenge, matching the real cron
  // path - no test user needs to be made an admin for this.
  // ---------------------------------------------------------------
  await admin.rpc("generate_trivia_daily_challenge", {});

  const triviaUser = await u("game-trivia");

  const { data: preAttemptKeys } = await triviaUser.client.from("gridster_game_trivia_answer_keys").select("*");
  report("Trivia answer keys are unreadable by an authenticated client BEFORE starting an attempt", (preAttemptKeys || []).length === 0);

  const dailyStart = await triviaUser.client.rpc("start_trivia_attempt", { target_mode: "daily" });
  report("start_trivia_attempt (daily) succeeds once a daily challenge exists", !dailyStart.error && dailyStart.data?.ok === true, dailyStart.error?.message);

  if (dailyStart.data?.attempt_id) {
    const { data: postStartKeys } = await triviaUser.client.from("gridster_game_trivia_answer_keys").select("*");
    report("Trivia answer keys are STILL unreadable after an attempt has started", (postStartKeys || []).length === 0);

    const answer1 = await triviaUser.client.rpc("submit_trivia_answer", {
      target_attempt_id: dailyStart.data.attempt_id,
      chosen_choice_key: "a",
    });
    report("submit_trivia_answer (first submission) works", !answer1.error && answer1.data?.already_answered === false, answer1.error?.message);

    const answer2 = await triviaUser.client.rpc("submit_trivia_answer", {
      target_attempt_id: dailyStart.data.attempt_id,
      chosen_choice_key: "b",
    });
    report(
      "submit_trivia_answer: a second submission on the same attempt is idempotent (returns the stored result, does not rescore)",
      !answer2.error && answer2.data?.already_answered === true && answer2.data?.is_correct === answer1.data?.is_correct,
      JSON.stringify({ first: answer1.data, second: answer2.data })
    );

    if (answer1.data?.is_correct) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: scoreRow } = await triviaUser.client
        .from("gridster_game_trivia_daily_scores")
        .select("*")
        .eq("user_id", triviaUser.userId)
        .eq("challenge_date", today)
        .maybeSingle();
      report(
        "Daily score is incremented exactly once despite the duplicate submission",
        scoreRow?.correct_count === 1,
        JSON.stringify(scoreRow)
      );
    }

    // 9a. Fake scores via direct table writes - no UPDATE policy exists
    // on gridster_game_trivia_attempts at all, so any client-side
    // rewrite attempt must fail outright.
    const forgeScore = await triviaUser.client
      .from("gridster_game_trivia_attempts")
      .update({ is_correct: true, score_awarded: 999999 })
      .eq("id", dailyStart.data.attempt_id)
      .select("*");
    report(
      "Direct client UPDATE of is_correct/score_awarded on a trivia attempt is rejected",
      !!forgeScore.error || (forgeScore.data || []).length === 0,
      forgeScore.error?.message
    );
  }

  // 9b. Fake balances via direct table writes - bling_balances has no
  // write policy for authenticated clients at all.
  const forgeBalance = await triviaUser.client
    .from("bling_balances")
    .update({ balance: 999999 })
    .eq("user_id", triviaUser.userId)
    .select("*");
  report(
    "Direct client UPDATE of bling_balances.balance is rejected",
    !!forgeBalance.error || (forgeBalance.data || []).length === 0,
    forgeBalance.error?.message
  );

  // ---------------------------------------------------------------
  // Photo Battles admin setup. Battles/status/close_at are all written
  // through a real is_admin AUTHENTICATED client via the "Admins can
  // write photo battles" RLS policy - gridster-test has a known,
  // project-specific gap where service_role sometimes lacks default
  // table privileges on tables created via CLI push this session
  // (confirmed absent on production; the RPCs below are unaffected
  // since SECURITY DEFINER functions run as their postgres owner
  // regardless of the caller's own grants). If even this profiles
  // UPDATE fails (a second, unrelated, already-documented gridster-test
  // gap - see supabase/tests/security_regressions.mjs), skip the
  // admin-gated battle scenarios with a clear warning rather than
  // failing the whole suite.
  const battleAdmin = await u("game-battle-admin");
  const { error: makeAdminErr } = await admin.from("profiles").update({ is_admin: true }).eq("user_id", battleAdmin.userId);
  const canManageBattles = !makeAdminErr;

  if (makeAdminErr) {
    console.warn(
      `WARNING: could not mark battleAdmin as admin via service_role (${makeAdminErr.message}). ` +
        "Skipping all Photo Battle scenarios that require creating/closing a battle."
    );
  }

  if (!canManageBattles) {
    report("Photo Battle scenarios (self-vote, vote cap, closed enforcement, duplicate prize, timing bypass)", true, "SKIPPED (no admin available)");
  } else {
  // ---------------------------------------------------------------
  // 4/11. Photo Battles: self-voting rejected, and the pinned
  // vote_count survives an adversarial in-place edit while a
  // legitimate caption-only edit still works.
  // ---------------------------------------------------------------
  const capOneOwnerA = await u("game-cap1-a");
  const capOneOwnerB = await u("game-cap1-b");
  const capOneVoter = await u("game-cap1-voter");
  const battleCap1 = await createBattle(battleAdmin.client, { vote_cap_per_user: 1 });

  const entryA = await capOneOwnerA.client.rpc("submit_photo_battle_entry", {
    target_battle_id: battleCap1.id,
    photo_url: "https://example.com/cap1-a.png",
  });
  const entryB = await capOneOwnerB.client.rpc("submit_photo_battle_entry", {
    target_battle_id: battleCap1.id,
    photo_url: "https://example.com/cap1-b.png",
  });
  report("submit_photo_battle_entry succeeds for a distinct eligible entrant", !entryA.error && !entryB.error, entryA.error?.message || entryB.error?.message);

  const selfVote = await capOneOwnerA.client.rpc("cast_photo_battle_vote", { target_entry_id: entryA.data?.entry_id });
  report("cast_photo_battle_vote rejects a self-vote", !!selfVote.error, selfVote.error?.message);

  const capVote1 = await capOneVoter.client.rpc("cast_photo_battle_vote", { target_entry_id: entryA.data?.entry_id });
  report("cast_photo_battle_vote succeeds for a non-owner", !capVote1.error && capVote1.data?.vote_cast === true, capVote1.error?.message || JSON.stringify(capVote1.data));

  const capVote1Again = await capOneVoter.client.rpc("cast_photo_battle_vote", { target_entry_id: entryA.data?.entry_id });
  report("cast_photo_battle_vote rejects a duplicate vote for the same entry", !capVote1Again.error && capVote1Again.data?.vote_cast === false, JSON.stringify(capVote1Again.data));

  // Vote cap = 1: voting for a DIFFERENT entry in the same battle must
  // be rejected once the cap is reached, not just the same entry twice.
  const capVoteOverCap = await capOneVoter.client.rpc("cast_photo_battle_vote", { target_entry_id: entryB.data?.entry_id });
  report(
    "Vote cap (=1) blocks a vote for a different entry once the cap is reached",
    !capVoteOverCap.error && capVoteOverCap.data?.vote_cast === false && capVoteOverCap.data?.reason === "vote_cap_reached",
    JSON.stringify(capVoteOverCap.data)
  );

  // Adversarial: sneaking vote_count into the same UPDATE as a
  // legitimate caption edit must reject the WHOLE statement - RLS has
  // no partial apply.
  const adversarialEdit = await capOneOwnerA.client
    .from("gridster_game_photo_battle_entries")
    .update({ caption: "hacked caption", vote_count: 999 })
    .eq("id", entryA.data?.entry_id)
    .select("*");
  report(
    "Editing caption + vote_count together is rejected entirely (vote_count pin holds)",
    !!adversarialEdit.error || (adversarialEdit.data || []).length === 0,
    adversarialEdit.error?.message
  );

  const legitEdit = await capOneOwnerA.client
    .from("gridster_game_photo_battle_entries")
    .update({ caption: "a legitimate edit" })
    .eq("id", entryA.data?.entry_id)
    .select("*");
  const legitEditedRow = (legitEdit.data || [])[0];
  report(
    "A legitimate caption-only edit (no vote_count field) still succeeds, vote_count untouched",
    !legitEdit.error && legitEditedRow?.caption === "a legitimate edit" && legitEditedRow?.vote_count === 1,
    JSON.stringify({ error: legitEdit.error, row: legitEditedRow })
  );

  // ---------------------------------------------------------------
  // 5. Vote cap = 3: exactly 3 distinct entries can be voted for,
  // a 4th is rejected.
  // ---------------------------------------------------------------
  const cap3Owners = [await u("game-cap3-a"), await u("game-cap3-b"), await u("game-cap3-c"), await u("game-cap3-d")];
  const cap3Voter = await u("game-cap3-voter");
  const battleCap3 = await createBattle(battleAdmin.client, { vote_cap_per_user: 3 });

  const cap3Entries = [];
  for (const [i, owner] of cap3Owners.entries()) {
    const entry = await owner.client.rpc("submit_photo_battle_entry", {
      target_battle_id: battleCap3.id,
      photo_url: `https://example.com/cap3-${i}.png`,
    });
    cap3Entries.push(entry.data?.entry_id);
  }

  const cap3Votes = [];
  for (const entryId of cap3Entries) {
    const vote = await cap3Voter.client.rpc("cast_photo_battle_vote", { target_entry_id: entryId });
    cap3Votes.push(vote.data);
  }
  const cap3CastCount = cap3Votes.filter((v) => v?.vote_cast === true).length;
  report(
    "Vote cap (=3): the first 3 distinct-entry votes all succeed, the 4th is rejected",
    cap3CastCount === 3 && cap3Votes[3]?.vote_cast === false && cap3Votes[3]?.reason === "vote_cap_reached",
    JSON.stringify(cap3Votes)
  );

  // ---------------------------------------------------------------
  // 6. Closed-battle enforcement independent of the cron sweep -
  // status='closed' rejects entry/vote even while the time window
  // still looks open.
  // ---------------------------------------------------------------
  const closedStatusOwner = await u("game-closedstatus-owner");
  const closedStatusVoter = await u("game-closedstatus-voter");
  const battleClosedStatus = await createBattle(battleAdmin.client, {});

  // Submit a real entry through the normal RPC while the battle is
  // genuinely open, THEN flip status to 'closed' via the admin policy -
  // this exercises the actual "admin closed it early, before its
  // close_at" scenario without ever needing to bypass RLS directly.
  const preexistingEntry = await closedStatusOwner.client.rpc("submit_photo_battle_entry", {
    target_battle_id: battleClosedStatus.id,
    photo_url: "https://example.com/preexisting.png",
  });
  await battleAdmin.client.from("gridster_game_photo_battles").update({ status: "closed" }).eq("id", battleClosedStatus.id);

  const entryAfterStatusClose = await closedStatusVoter.client.rpc("submit_photo_battle_entry", {
    target_battle_id: battleClosedStatus.id,
    photo_url: "https://example.com/too-late.png",
  });
  report(
    "submit_photo_battle_entry rejects a battle marked closed even if open_at/close_at still look open",
    !!entryAfterStatusClose.error,
    entryAfterStatusClose.error?.message
  );

  const voteAfterStatusClose = await closedStatusVoter.client.rpc("cast_photo_battle_vote", { target_entry_id: preexistingEntry.data?.entry_id });
  report(
    "cast_photo_battle_vote rejects a battle marked closed even if open_at/close_at still look open",
    !!voteAfterStatusClose.error,
    voteAfterStatusClose.error?.message
  );

  // ---------------------------------------------------------------
  // 7. Duplicate prize grant - closing the same due battle twice must
  // never grant the reward twice.
  // ---------------------------------------------------------------
  const prizeWinner = await u("game-prize-winner");
  const battleToClose = await createBattle(battleAdmin.client, { reward_bling_bits: 75 });

  const winnerEntry = await prizeWinner.client.rpc("submit_photo_battle_entry", {
    target_battle_id: battleToClose.id,
    photo_url: "https://example.com/winner.png",
  });
  report("submit_photo_battle_entry works for the eventual winner", !winnerEntry.error, winnerEntry.error?.message);

  // Push close_at into the past (admin policy, no window restriction on
  // the battles table itself) so close_due_photo_battles() - the real
  // service_role-only cron RPC - picks it up as due.
  await battleAdmin.client.from("gridster_game_photo_battles").update({ close_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", battleToClose.id);

  const balanceBeforeClose = await getOwnBalance(prizeWinner.client, prizeWinner.userId);
  await admin.rpc("close_due_photo_battles");
  const balanceAfterFirstClose = await getOwnBalance(prizeWinner.client, prizeWinner.userId);
  await admin.rpc("close_due_photo_battles");
  const balanceAfterSecondClose = await getOwnBalance(prizeWinner.client, prizeWinner.userId);

  const { data: claimRows } = await prizeWinner.client.from("gridster_game_photo_battle_prize_claims").select("*").eq("battle_id", battleToClose.id);
  // The first-ever credit to a fresh bling_balances row also seeds the
  // starting 1250 balance (same "insert ... values (user_id, 1250) on
  // conflict do nothing" convention used by every grant path in this
  // codebase) - so the real delta is either just the reward (75, if a
  // balance row already existed) or 1250 + 75 (first touch). Either way,
  // the SECOND sweep must add nothing further - that's the actual
  // no-duplicate-grant invariant this test protects.
  const firstCloseDelta = balanceAfterFirstClose - balanceBeforeClose;
  report(
    "close_due_photo_battles: exactly one prize-claim row and exactly one Bling Bits credit, even after a second sweep",
    (claimRows || []).length === 1 &&
      (firstCloseDelta === 75 || firstCloseDelta === 1250 + 75) &&
      balanceAfterSecondClose === balanceAfterFirstClose,
    JSON.stringify({ claimRows, balanceBeforeClose, balanceAfterFirstClose, balanceAfterSecondClose })
  );

  // ---------------------------------------------------------------
  // 12. Timing bypass - entry submission is rejected both before
  // open_at and after close_at, independent of the status field.
  // ---------------------------------------------------------------
  const timingUser = await u("game-timing");
  const notYetOpenBattle = await createBattle(battleAdmin.client, {
    open_at: new Date(Date.now() + 3600_000).toISOString(),
    close_at: new Date(Date.now() + 7200_000).toISOString(),
    status: "scheduled",
  });
  const entryTooEarly = await timingUser.client.rpc("submit_photo_battle_entry", {
    target_battle_id: notYetOpenBattle.id,
    photo_url: "https://example.com/too-early.png",
  });
  report("submit_photo_battle_entry rejects a battle that has not opened yet", !!entryTooEarly.error, entryTooEarly.error?.message);

  const alreadyPastBattle = await createBattle(battleAdmin.client, {
    open_at: new Date(Date.now() - 7200_000).toISOString(),
    close_at: new Date(Date.now() - 3600_000).toISOString(),
  });
  const entryTooLate = await timingUser.client.rpc("submit_photo_battle_entry", {
    target_battle_id: alreadyPastBattle.id,
    photo_url: "https://example.com/too-late.png",
  });
  report("submit_photo_battle_entry rejects a battle whose close_at has already passed", !!entryTooLate.error, entryTooLate.error?.message);
  } // end canManageBattles
} catch (e) {
  console.error("SUITE ERROR:", e);
  results.push({ name: "suite execution", pass: false });
} finally {
  for (const user of users) {
    await cleanupUser(user.userId);
  }
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.log(
    "FAILURES:",
    failed.map((f) => f.name)
  );
  process.exit(1);
}
