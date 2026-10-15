-- Admin-applied discounts and pro bono ("Blessings") waivers for deliveries.
-- discount_amount reduces the amount charged at checkout; is_comp records a fully waived delivery.

alter table public.listings
  add column if not exists discount_amount numeric(10, 2) not null default 0,
  add column if not exists promo_code text,
  add column if not exists is_comp boolean not null default false,
  add column if not exists admin_notes text;
