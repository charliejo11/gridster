alter table public.sl_verification_codes
add column if not exists user_id uuid references auth.users(id) on delete cascade,
add column if not exists avatar_uuid text;

create index if not exists sl_verification_codes_user_id_idx
  on public.sl_verification_codes (user_id);

alter table public.profiles
add column if not exists sl_avatar_uuid text,
add column if not exists sl_verified boolean not null default false,
add column if not exists sl_verified_at timestamptz;

comment on column public.sl_verification_codes.user_id is
  'Gridster account that requested this Second Life verification code.';
comment on column public.sl_verification_codes.avatar_uuid is
  'Second Life avatar key resolved in-world via llRequestUserKey, reported by the sender object.';
comment on column public.profiles.sl_avatar_uuid is
  'Second Life avatar key confirmed through SL verification.';
comment on column public.profiles.sl_verified is
  'True once the profile owner has completed Second Life avatar verification.';
comment on column public.profiles.sl_verified_at is
  'Timestamp when Second Life avatar verification was completed.';
