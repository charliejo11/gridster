import { createSupabaseAdminClient } from "../shared/gridster.js";

// Hourly sweep: finds gridster_event_invites (status going or pending,
// i.e. anyone who RSVP'd or was invited and hasn't declined) whose event
// starts within the next 90 minutes and hasn't been reminded yet, and
// fires one event_reminder notification each via the same
// create_or_group_notification RPC everything else uses. The 90-minute
// window against an hourly cron guarantees no event is skipped between
// runs; reminder_sent_at stops it from ever firing twice for the same invite.
export async function sendEventReminders(env) {
  const supabaseAdmin = createSupabaseAdminClient(env);

  if (!supabaseAdmin) {
    console.error("Skipping event reminder sweep - Supabase admin client is not configured.");
    return { ok: false, reminded: 0 };
  }

  const now = new Date().toISOString();
  const windowEnd = new Date(Date.now() + 90 * 60 * 1000).toISOString();

  const { data: upcomingEvents, error: eventsError } = await supabaseAdmin
    .from("gridster_events")
    .select("id")
    .gte("starts_at", now)
    .lte("starts_at", windowEnd);

  if (eventsError) {
    console.error("Event reminder sweep failed to load upcoming events", eventsError);
    return { ok: false, reminded: 0 };
  }

  const upcomingEventIds = (upcomingEvents || []).map((event) => event.id);

  if (!upcomingEventIds.length) {
    return { ok: true, reminded: 0 };
  }

  const { data: invites, error } = await supabaseAdmin
    .from("gridster_event_invites")
    .select("id, event_id, invitee_user_id")
    .in("event_id", upcomingEventIds)
    .in("status", ["going", "pending"])
    .is("reminder_sent_at", null);

  if (error) {
    console.error("Event reminder sweep failed to load invites", error);
    return { ok: false, reminded: 0 };
  }

  let remindedCount = 0;

  for (const invite of invites || []) {
    const { error: notifyError } = await supabaseAdmin.rpc("create_or_group_notification", {
      p_recipient_user_id: invite.invitee_user_id,
      p_actor_user_id: null,
      p_notification_type: "event_reminder",
      p_related_event_id: invite.event_id,
    });

    if (notifyError) {
      console.error("Event reminder sweep failed to notify", invite.id, notifyError);
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .from("gridster_event_invites")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", invite.id);

    if (updateError) {
      console.error("Event reminder sweep failed to mark reminded", invite.id, updateError);
      continue;
    }

    remindedCount += 1;
  }

  if (remindedCount > 0) {
    console.log("Event reminder sweep sent reminders", remindedCount);
  }

  return { ok: true, reminded: remindedCount };
}
