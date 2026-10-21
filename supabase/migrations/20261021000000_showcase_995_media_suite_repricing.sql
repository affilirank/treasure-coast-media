-- Pricing pass: Turnkey Showcase Suite to $995 and the Full Media Suite repriced.
--
-- The public site reads these from src/lib/site-data.ts; this migration keeps the
-- admin/offers `services` table in step.
--
--   Complete Showcase Suite: $895 -> $995 (base tier; per-tier from site-data)
--   Full Media Suite:        $275 -> $249 (base tier; per-tier from site-data)
--
-- Idempotent: each update only moves the previous value, so re-running is safe.

update public.services set price = 995.00 where source_id = 're-pkg:complete-showcase-suite'   and price = 895.00;
update public.services set price = 249.00 where source_id = 're-pkg:standard-mls-suite'       and price = 275.00;
