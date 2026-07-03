-- Stores one-time codes used to verify Second Life avatars before Gridster login setup.
create extension if not exists pgcrypto;

create table if not exists public.sl_verification_codes (
  id uuid primary key default gen_random_uuid(),
  sl_username text not null,
  code text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  verified_at timestamptz,
  avatar_uuid uuid,
  constraint sl_verification_codes_status_check
    check (status in ('pending', 'sent', 'verified', 'expired', 'failed')),
  constraint sl_verification_codes_verified_at_check
    check ((status = 'verified' and verified_at is not null) or status <> 'verified')
);

alter table public.sl_verification_codes enable row level security;

create index if not exists sl_verification_codes_sl_username_status_idx
  on public.sl_verification_codes (lower(sl_username), status);

create index if not exists sl_verification_codes_expires_at_idx
  on public.sl_verification_codes (expires_at);

create index if not exists sl_verification_codes_avatar_uuid_idx
  on public.sl_verification_codes (avatar_uuid)
  where avatar_uuid is not null;

create unique index if not exists sl_verification_codes_active_code_idx
  on public.sl_verification_codes (code)
  where status in ('pending', 'sent');

comment on table public.sl_verification_codes is
  'One-time verification codes for connecting Second Life avatars to Gridster accounts.';
comment on column public.sl_verification_codes.sl_username is
  'Second Life legacy username, for example charliejo11.resident.';
comment on column public.sl_verification_codes.code is
  'Short one-time code shown in Gridster and sent privately in Second Life.';
comment on column public.sl_verification_codes.status is
  'Verification lifecycle: pending, sent, verified, expired, or failed.';
comment on column public.sl_verification_codes.avatar_uuid is
  'Second Life avatar UUID recorded after in-world verification succeeds.';

-- No public policies are added yet. Future Netlify Functions should use the
-- Supabase service-role key server-side to create and verify these records.
