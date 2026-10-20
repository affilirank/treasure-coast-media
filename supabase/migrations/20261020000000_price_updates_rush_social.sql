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

--  7. The Complete Realtor Growth Partner: $995 -> $1,295/mo. Its included services
--     total ~$2,165 à la carte ($595 posts + $450 lead page/CRM + $650 campaign
--     management + $245 newsletters + $225 shoot/credit), so the bundle moves to $1,295.
update public.services
set price = 1295.00
where source_id = 're-ret:complete-realtor-growth-partner' and price = 995.00;
