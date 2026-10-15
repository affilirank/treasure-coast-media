import Stripe from "stripe";
import { getListingByToken, siteUrl } from "@/lib/delivery";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return Response.json({ error: "Payments are not configured." }, { status: 503 });

  let token: unknown;
  try {
    token = (await request.json()).token;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof token !== "string") return Response.json({ error: "Invalid request." }, { status: 400 });

  const found = await getListingByToken(token);
  if (!found) return Response.json({ error: "Delivery not found." }, { status: 404 });
  const { listing } = found;
  if (listing.is_paid) return Response.json({ error: "This invoice is already paid." }, { status: 409 });

  // The amount always comes from the database, never from the client.
  const discount = Math.max(0, Number(listing.discount_amount ?? 0));
  const amountCents = Math.max(0, Math.round((Number(listing.invoice_amount) - discount) * 100));
  if (amountCents <= 0) return Response.json({ error: "This delivery has no balance due. Ask the team to waive it." }, { status: 409 });
  const page = `${siteUrl()}/delivery/${listing.access_token}`;

  try {
    const session = await new Stripe(secretKey).checkout.sessions.create({
      mode: "payment",
      customer_email: listing.agent_email,
      client_reference_id: listing.id,
      metadata: { listing_id: listing.id },
      payment_intent_data: { metadata: { listing_id: listing.id } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: { name: `Real estate media: ${listing.property_address}`, description: listing.package_type },
          },
        },
      ],
      // A customer-entered promotion code (e.g. FIRST50, BLESSINGS) is validated by Stripe and flows through to the receipt.
      allow_promotion_codes: discount === 0,
      success_url: `${page}?paid=1`,
      cancel_url: page,
    });
    if (!session.url) throw new Error("No checkout URL");
    return Response.json({ url: session.url });
  } catch {
    return Response.json({ error: "Unable to start checkout." }, { status: 502 });
  }
}
