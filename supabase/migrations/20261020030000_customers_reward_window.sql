-- Merit Club: per-member annual reward window.
-- Stores how many shoots count toward the current 12-month window (starting on the
-- anniversary of the member's first-ever shoot) and when that window renews, so the
-- admin can show progress without recomputing on every page load.

alter table public.customers
  add column if not exists window_shoot_count integer not null default 0;

alter table public.customers
  add column if not exists window_renews_at timestamp with time zone;
