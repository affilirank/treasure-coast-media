-- Turnkey package price raises (repricing pass).
-- Complete Showcase Suite: $795 -> $895
-- Waterfront & Estate Luxury Suite: $1,195 -> $1,575
-- Idempotent: only moves the old value, so re-running is safe.

update public.services set price = 895.00  where source_id = 're-pkg:complete-showcase-suite'    and price = 795.00;
update public.services set price = 1575.00 where source_id = 're-pkg:waterfront-estate-luxury-suite' and price = 1195.00;
