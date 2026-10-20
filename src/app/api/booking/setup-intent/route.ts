import Stripe from "stripe";

export const runtime = "nodejs";

// Creates a Stripe SetupIntent in no-amount mode: the booking form collects and
// authorizes a card on file with zero charge today. The real shoot total is captured
// later through the media-delivery paywall (and, for the invoice, can reuse this
// payment method). Amount is never set here, so nothing is ever authorized or
// charged at booking time.

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return Response.json({ error: "Payments are not configured." }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const email =
    typeof (body as { email?: unknown })?.email === "string"
      ? ((body as { email: string }).email).trim().slice(0, 200)
      : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email to hold your card on file." }, { status: 400 });
  }

  try {
    const stripe = new Stripe(secretKey);
    // No `amount`: a SetupIntent stores a PaymentMethod for later off-session capture.
    const intent = await stripe.setupIntents.create({
      usage: "off_session",
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: { purpose: "booking_card_on_file", agent_email: email },
    });
    if (!intent.client_secret) throw new Error("No client secret");
    return Response.json({ clientSecret: intent.client_secret });
  } catch {
    return Response.json({ error: "Unable to start card setup. Please try again." }, { status: 502 });
  }
}
