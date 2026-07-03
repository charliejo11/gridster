-- =========================================================
-- Add seasonal/limited-edition fields to bling_items
-- =========================================================

alter table public.bling_items
add column if not exists season text,
add column if not exists limited boolean not null default false,
add column if not exists available_from timestamptz,
add column if not exists available_until timestamptz;