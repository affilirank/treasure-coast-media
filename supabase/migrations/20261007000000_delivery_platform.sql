-- Real estate media delivery & paywall platform.
-- All access goes through server-side code using the service role key; anon/authenticated
-- roles get no policies, so RLS denies them everything.

create extension if not exists pgcrypto with schema extensions;

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  property_address text not null,
  city text not null default 'Vero Beach',
  state text not null default 'FL',
  zip_code text not null,
  agent_name text not null,
  agent_email text not null,
  agent_phone text,
  brokerage_name text,
  agent_headshot_url text,
  package_type text not null,
  invoice_amount numeric(10, 2) not null check (invoice_amount > 0),
  is_paid boolean not null default false,
  stripe_session_id text,
  stripe_payment_intent_id text,
  access_token text unique not null default encode(extensions.gen_random_bytes(16), 'hex')
);

create table public.listing_assets (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  asset_type text not null check (asset_type in ('hdr_still', 'drone_aerial', 'floor_plan_pdf', 'floor_plan_img', 'walkthrough_video')),
  full_res_url text not null,  -- R2 object key in the private bucket
  web_res_url text not null,   -- R2 object key, compressed < 2048px for MLS/web
  watermarked_url text,        -- R2 object key of the watermarked preview shown while unpaid
  sort_order int not null default 0
);

create index listing_assets_listing_id_sort_idx on public.listing_assets (listing_id, sort_order);

alter table public.listings enable row level security;
alter table public.listing_assets enable row level security;

revoke all on public.listings from anon, authenticated;
revoke all on public.listing_assets from anon, authenticated;
