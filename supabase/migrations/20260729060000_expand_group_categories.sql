-- =========================================================
-- Expand gridster_groups.category to a fuller, more realistic set of
-- Second Life community categories (e.g. "Gridster's Squawk Box" had
-- nowhere sensible to go under the old 8-value list).
--
-- Widens the CHECK constraint to the union of the old values and the
-- new ones - existing rows are never touched, so every group already
-- saved under an old category (clubs, stores, rp_sims, bloggers,
-- photographers, adult_communities, music_scenes) stays exactly as it
-- is and continues to pass validation. The new values are what the
-- create-group form now offers going forward; the old ones remain
-- valid but are no longer offered as choices for new groups (see
-- GRIDSTER_GROUP_CATEGORIES in src/lib/gridsterGroups.js).
-- =========================================================

alter table public.gridster_groups
  drop constraint if exists valid_group_category;

alter table public.gridster_groups
  add constraint valid_group_category check (
    category in (
      -- legacy values, kept valid for existing groups
      'clubs', 'stores', 'rp_sims', 'fandoms', 'bloggers', 'photographers',
      'adult_communities', 'music_scenes',
      -- current selectable values
      'community', 'help_support', 'news_updates', 'social', 'clubs_venues',
      'music_djs', 'shopping', 'creators', 'photography', 'roleplay',
      'events', 'fashion', 'gaming', 'other'
    )
  );

alter table public.gridster_groups
  alter column category set default 'community';
