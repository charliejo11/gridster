-- The event-reminder cron (worker/routes/send-event-reminders.js) reads
-- gridster_events via the service-role client. Explicit grant rather than
-- relying on schema defaults - this project's service_role privileges on
-- pre-existing tables have been unreliable before (profiles, confirmed
-- earlier this session). Harmless no-op if already granted.
grant select on public.gridster_events to service_role;
