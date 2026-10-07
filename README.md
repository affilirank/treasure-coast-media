# Merit Media & Marketing

Responsive Next.js App Router site for property media and commercial production across Florida's Treasure Coast and Palm Beaches.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `?track=real-estate` or `?track=commercial` to open a service track directly.

## Production setup

Bookings are not accepted as successful previews. `/api/bookings` recalculates the quote on the server, saves an `awaiting_payment` record to private Vercel Blob, and returns Stripe Checkout only when the required production services are configured. It collects a 25% deposit, or 50% when the total is at least $5,000. The booking record is marked paid and the customer confirmation email is sent only after Stripe's signed webhook verifies payment.

The Vercel project already has a private Blob store connected. Vercel manages its store ID and OIDC access; do not expose or commit Blob credentials. To enable paid bookings, add these in the Vercel project’s Environment Variables for Production (and Preview if needed):

- `STRIPE_SECRET_KEY`: Stripe API secret key.
- `STRIPE_WEBHOOK_SECRET`: signing secret for `https://treasure-coast-media.vercel.app/api/stripe/webhook`.
- `RESEND_API_KEY`: Resend API key.
- `RESEND_FROM_EMAIL`: sender address on a domain verified with Resend.
- `NEXT_PUBLIC_SITE_URL`: `https://treasure-coast-media.vercel.app`.

Configure the Stripe webhook to send `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.expired` events to `/api/stripe/webhook`. Use Stripe test keys and a test webhook first; switch to live keys only when you are ready to accept real deposits. Without these settings, booking submissions return a clear configuration error and do not claim success.

The admin delivery hub is at `/admin`. Set `CLIENT_PORTAL_PASSWORD` to a strong admin password and `PORTAL_SESSION_SECRET` to a random secret of at least 32 characters. Generate the session secret locally with `openssl rand -hex 32`; do not commit it or send it in chat. The admin creates private customer projects and one-time share links. Uploads go to private Blob (up to 250 MB); customers can list and download files only through their project link. `/api/uploads` and project APIs require the signed admin session.

After adding environment variables in Vercel, redeploy Production. For local development, connect/pull the Vercel project environment with the CLI; never put production secrets in source control. `.env.example` lists the variable names. `BOOKING_WEBHOOK_URL` and `BOOKING_WEBHOOK_SECRET` are optional notifications sent after verified payment.

Replace the sample contact details before launch. The portfolio includes royalty-free Unsplash images and scene-matched Coverr stock footage; case-study performance figures are clearly marked as illustrative sample data.

## Media delivery & paywall

- Apply `supabase/migrations/20261007000000_delivery_platform.sql` (RLS is on; only the server's service-role key can read/write).
- Set the Supabase, R2, Stripe and Resend variables from `.env.example`.
- Add a Cloudflare R2 CORS rule for the site origin allowing `GET`, `PUT`, `HEAD` and the `Content-Type` header (browser uploads and client-side ZIP packaging fetch directly from R2).
- Add a Stripe webhook endpoint at `/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- Admin: `/admin/deliveries/new` (sign in via `/admin`). Public routes: `/delivery/[token]`, `/mls/[token]`, `/showcase/[token]` (the last two unlock after payment).
