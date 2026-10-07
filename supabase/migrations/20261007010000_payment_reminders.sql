alter table public.listings
  add column if not exists reminder_count int not null default 0,
  add column if not exists last_reminder_at timestamptz;
