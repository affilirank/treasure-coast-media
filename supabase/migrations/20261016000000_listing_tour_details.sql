-- Listing tour details: facts + marketing copy that power the branded/unbranded landing pages.
alter table public.listings
  add column if not exists beds int,
  add column if not exists baths numeric(3, 1),
  add column if not exists sqft int,
  add column if not exists lot_size text,
  add column if not exists year_built int,
  add column if not exists list_price numeric(12, 2),
  add column if not exists property_type text,
  add column if not exists mls_number text,
  add column if not exists headline text,
  add column if not exists description text,
  add column if not exists features jsonb not null default '[]'::jsonb,
  add column if not exists agent_bio text,
  add column if not exists showing_url text,
  add column if not exists updated_at timestamptz;
