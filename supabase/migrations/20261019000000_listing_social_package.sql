-- One-time social media upsell purchased from the delivery paywall (under the tip section).
-- 'starter' = 30 days of FB/IG posts ($99); 'reels' = posts + 7 premium branded reels ($169).
-- Written once by the Stripe webhook; NULL means the offer is still available for this listing.
alter table public.listings add column if not exists social_package text;
