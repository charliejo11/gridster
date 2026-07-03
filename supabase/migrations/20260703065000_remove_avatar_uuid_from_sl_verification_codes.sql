-- Keep SL verification username-based for now.
drop index if exists public.sl_verification_codes_avatar_uuid_idx;

alter table public.sl_verification_codes
  drop column if exists avatar_uuid;
