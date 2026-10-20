-- Pricing updates (fix list items 3 & 4). These correct live `services` rows
-- and keep the seed in sync (see 20261015000000 seed edits).
--
--  3. Same-Day Rush Delivery: $75 -> $125 per property.
--  4. 30-Day Automated Social Post Pack: $125 -> $195 per property.
--
-- The unique key on public.services is source_id (not code). Idempotent so
-- re-running is safe; each UPDATE only touches the row while it holds the old price.

update public.services
set price = 125.00
where source_id = 're-addon:rush-delivery' and price = 75.00;

update public.services
set price = 195.00
where source_id = 're-addon:social-post-pack' and price = 125.00;
