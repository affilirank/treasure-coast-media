-- Phase 2: service catalog, offers builder, and customer database (Merit Club loyalty).
-- Server-side only: anon/authenticated get no policies (RLS denies all).

-- ---------------------------------------------------------------------------
-- Service catalog: every service on the site, plus blank "custom" blocks that
-- can be renamed/repriced in the admin Offers builder.
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source_id text unique,
  sort_order int not null default 0,
  category text not null default 'custom',
  name text not null,
  description text,
  price numeric(10, 2) not null default 0,
  unit text,
  billing text not null default 'once' check (billing in ('once', 'monthly')),
  is_active boolean not null default true
);

insert into public.services (source_id, sort_order, category, name, description, price, unit, billing) values
  -- Real estate base media
  ('re-pkg:essentials', 10, 'real-estate', 'Photo-Only Essentials', 'Next-day HDR interior and exterior stills for a polished listing.', 195, 'starting', 'once'),
  ('re-pkg:standard-mls-suite', 20, 'real-estate', 'Full Media Suite (Photos + Drone + 2D Floor Plan)', 'A complete listing-ready media foundation.', 275, 'starting', 'once'),
  ('re-pkg:complete-showcase-suite', 30, 'real-estate', 'The Complete Showcase Suite', 'A complete listing launch in one package.', 795, 'starting', 'once'),
  ('re-pkg:waterfront-estate-luxury-suite', 40, 'real-estate', 'The Waterfront & Estate Luxury Suite', 'Waterfront estates, acreage, and signature luxury listings.', 1195, 'starting', 'once'),
  -- Real estate video
  ('re-video:cinematic-b-roll-reel', 50, 'real-estate', '60-Sec Cinematic B-Roll Reel (9:16)', 'Fast-paced vertical property walkthrough with aerial cuts.', 275, 'per property', 'once'),
  ('re-video:realtor-hosted-branding-reel', 60, 'real-estate', '60-Sec Realtor-Hosted Branding Reel (9:16)', 'Agent on-camera hook and outro with an unbranded MLS cut.', 395, 'per property', 'once'),
  ('re-video:cinematic-showcase-film', 70, 'real-estate', 'Up to 2-Minute Cinematic Showcase Film (16:9 + Drone)', 'Full architectural narrative tour with aerial storytelling.', 645, 'per property', 'once'),
  ('re-video:ai-presenter-30', 80, 'real-estate', 'AI Presenter Listing Promo (30 sec, 9:16)', 'Consent-based AI presenter using an approved likeness and voice.', 495, 'per promo', 'once'),
  ('re-video:ai-presenter-90', 90, 'real-estate', 'AI Presenter Listing Promo (up to 90 sec)', 'Longer scripted AI presenter walkthrough with property b-roll.', 695, 'per promo', 'once'),
  -- Real estate add-ons
  ('re-addon:amenities-suite', 100, 'real-estate', 'Neighborhood, Waterfront & HOA Amenities Suite', 'Dedicated coverage of clubhouse, pool, golf, marina, or beach access.', 65, 'per property', 'once'),
  ('re-addon:boundary-outline', 110, 'real-estate', 'Drone Property Boundary Line Graphic', 'Lot line overlay on an aerial still.', 25, 'per property', 'once'),
  ('re-addon:virtual-twilight', 120, 'real-estate', 'Virtual Twilight Conversion', 'Dusk conversion for a distinctive first impression.', 25, 'per photo', 'once'),
  ('re-addon:virtual-staging', 130, 'real-estate', 'Virtual Staging', 'Furnishing concept to help buyers understand scale.', 35, 'per room', 'once'),
  ('re-addon:decluttering', 140, 'real-estate', 'Virtual Decluttering / Object Removal', 'Remove clutter from listing photos.', 20, 'per photo', 'once'),
  ('re-addon:zillow-tour', 150, 'real-estate', 'Zillow 3D Home Tour + Interactive Floor Plan', 'Interactive 3D tour for the listing.', 85, 'per property', 'once'),
  ('re-addon:rush-delivery', 160, 'real-estate', 'Same-Day Rush Delivery (by 9:00 PM)', 'Priority same-day turnaround.', 75, 'per property', 'once'),
  ('re-addon:social-post-pack', 170, 'real-estate', '30-Day Automated Social Post Pack', 'Pre-scheduled via GoHighLevel CSV over 30 days.', 125, 'per property', 'once'),
  ('re-addon:social-syndication-engine', 180, 'real-estate', '30-Day Premium Social Syndication Engine', '4 vertical reels + 8 branded posts, automated via GHL.', 250, 'per property', 'once'),
  -- Commercial production packages
  ('co-pkg:brand-story', 200, 'commercial', 'Brand Story Film', '60-90 second widescreen 4K film.', 1495, null, 'once'),
  ('co-pkg:ad-suite', 210, 'commercial', 'Direct-Response Ad Suite', 'One master brand film plus three vertical ads.', 2495, null, 'once'),
  ('co-pkg:market-dominance', 220, 'commercial', 'Market Dominance Production', 'Half-day, multi-camera production.', 3950, null, 'once'),
  -- Commercial growth retainers
  ('co-ret:maps-review-growth', 300, 'commercial', 'Google Maps 3-Pack & Review Growth', 'Local SEO audit, weekly media uploads, citation sync, review capture.', 275, null, 'monthly'),
  ('co-ret:short-form-ad-engine', 310, 'commercial', 'Short-Form Social Video Ad Engine', 'Eight vertical commercial reels for Meta and TikTok.', 450, null, 'monthly'),
  ('co-ret:database-reactivation', 320, 'commercial', 'Database Reactivation Sprint', 'Re-engage old customer lists via SMS and email.', 495, null, 'once'),
  ('co-ret:paid-ad-management', 330, 'commercial', 'Meta & TikTok Paid Ad Campaign Management', 'Creative testing, targeting, and weekly optimization.', 650, null, 'monthly'),
  ('co-ret:social-media-management', 340, 'commercial', 'Social Media Management', 'Branded posts, publishing, calendar, and engagement.', 650, null, 'monthly'),
  ('co-ret:ai-call-receptionist', 350, 'commercial', 'AI Calling & Virtual Receptionist', 'AI phone assistant answers, captures, and routes inquiries.', 399, null, 'monthly'),
  ('co-ret:email-campaigns', 360, 'commercial', 'Email Campaigns & Customer Newsletter', 'Branded promotional and educational email campaigns.', 350, null, 'monthly'),
  ('co-ret:crm-lead-nurture', 370, 'commercial', 'CRM Lead Nurture Automation', 'Fast SMS and email follow-up with lead routing.', 450, null, 'monthly'),
  ('co-ret:google-search-management', 380, 'commercial', 'Google Search Lead Campaigns', 'High-intent local search campaign setup and optimization.', 650, null, 'monthly'),
  ('co-ret:ai-clone-voice-promo', 390, 'commercial', 'AI Clone + Voice Promo Video (30 sec)', 'Consent-based 30-second customer-acquisition video.', 495, null, 'once'),
  ('co-ret:ai-clone-voice-promo-90', 400, 'commercial', 'AI Clone + Voice Promo Video (90 sec)', 'Consent-based 90-second customer-acquisition video.', 695, null, 'once'),
  ('co-ret:turnkey-growth-engine', 410, 'commercial', 'The Turnkey Business Growth Engine', 'Full customer-acquisition system, managed monthly.', 1250, null, 'monthly'),
  -- Real estate growth retainers
  ('re-ret:open-house-lead-surge', 500, 'real-estate-marketing', 'Open House Lead Surge Sprint', '7-day geo-fenced Meta listing ad campaign.', 195, 'per property', 'once'),
  ('re-ret:sphere-email-engine', 510, 'real-estate-marketing', 'Sphere of Influence & Past-Client Email Engine', 'Two branded email newsletters per month.', 245, null, 'monthly'),
  ('re-ret:google-local-reviews', 520, 'real-estate-marketing', 'Google Local & 5-Star Review Automation', 'Weekly citation maintenance and automated reviews.', 225, null, 'monthly'),
  ('re-ret:reel-cutdown-sprint', 530, 'real-estate-marketing', 'Short-Form Reel Cutdown Sprint', 'Eight vertical reels with kinetic captions.', 350, null, 'monthly'),
  ('re-ret:agent-social-management', 540, 'real-estate-marketing', 'Agent Social Media Management', 'Consistent branded social presence.', 495, null, 'monthly'),
  ('re-ret:agent-ai-receptionist', 550, 'real-estate-marketing', 'AI Calling & Listing Receptionist', 'AI phone assistant for listing and buyer inquiries.', 299, null, 'monthly'),
  ('re-ret:agent-email-campaign-launch', 560, 'real-estate-marketing', 'Listing & Open House Email Campaigns', 'Branded email campaign for a listing or open house.', 195, null, 'once'),
  ('re-ret:agent-paid-search', 570, 'real-estate-marketing', 'Google Buyer & Seller Lead Campaigns', 'Local Google Search campaigns for buyers and sellers.', 450, null, 'monthly'),
  ('re-ret:agent-crm-automation', 580, 'real-estate-marketing', 'AI Lead Follow-Up & CRM Automation', 'Fast SMS and email responses connected to your CRM.', 350, null, 'monthly'),
  ('re-ret:complete-realtor-growth-partner', 590, 'real-estate-marketing', 'The Complete Realtor Growth Partner', 'Connected monthly marketing system for listing leads.', 995, null, 'monthly'),
  -- Blank custom blocks to create new services
  ('custom:blank-1', 900, 'custom', 'Custom Service Block', 'Rename and price this as a brand-new service to combine into offers.', 0, null, 'once'),
  ('custom:blank-2', 910, 'custom', 'Custom Service Block', 'Rename and price this as a brand-new service to combine into offers.', 0, null, 'once'),
  ('custom:blank-3', 920, 'custom', 'Custom Service Block', 'Rename and price this as a brand-new service to combine into offers.', 0, null, 'once')
on conflict (source_id) do nothing;

-- ---------------------------------------------------------------------------
-- Customers / past users: powers promos and the Merit Club loyalty tiers.
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text unique not null,
  name text,
  phone text,
  company text,
  shoot_count int not null default 0,
  lifetime_value numeric(12, 2) not null default 0,
  tier text not null default 'Silver' check (tier in ('Silver', 'Gold', 'Platinum', 'Black Label')),
  last_activity_at timestamptz,
  notes text,
  marketing_opt_in boolean not null default true
);

create index if not exists customers_tier_idx on public.customers (tier);

-- ---------------------------------------------------------------------------
-- Offers: custom, combinable service bundles with optional discounts.
-- ---------------------------------------------------------------------------
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  headline text,
  description text,
  items jsonb not null default '[]'::jsonb,      -- [{ source_id?, name, price, qty, free? }]
  subtotal numeric(10, 2) not null default 0,
  discount_type text check (discount_type in ('percent', 'amount')),
  discount_value numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  coupon_id text,                                -- Stripe coupon id (for discounted offers)
  promotion_code text,                           -- Stripe promotion code (public offers)
  share_token text unique not null default encode(extensions.gen_random_bytes(12), 'hex'),
  is_active boolean not null default true,
  ai_generated boolean not null default false,
  created_by text
);

create index if not exists offers_active_idx on public.offers (is_active, created_at desc);

alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.offers enable row level security;

revoke all on public.services from anon, authenticated;
revoke all on public.customers from anon, authenticated;
revoke all on public.offers from anon, authenticated;
