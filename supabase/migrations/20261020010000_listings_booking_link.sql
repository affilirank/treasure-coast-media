-- Link a delivery listing to the booking it came from (fix list item 6b).
-- Lets the delivery paywall capture the card held on file at booking time,
-- falling back to hosted Stripe Checkout when the card needs authentication.

alter table public.listings
  add column if not exists booking_id uuid;

create index if not exists listings_booking_id_idx on public.listings (booking_id);
