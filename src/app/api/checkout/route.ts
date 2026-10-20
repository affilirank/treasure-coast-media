import Stripe from "stripe";
import { getListingByToken, siteUrl } from "@/lib/delivery";
import { memberRewardWindow } from "@/lib/customers";
import { resolveLoyaltyCouponId, tierForShootCount } from "@/lib/loyalty";

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

  // Merit Club: auto-apply the member's annual discount when no manual discount is set.
  // Rewards are earned on shoots within the member's 12-month window (which starts on the
  // anniversary of their first-ever shoot and rolls forward each year). The percentage
  // applies to one-time shoot/media services only — never to monthly retainer lines.
  let loyaltyCoupon: string | null = null;
  const isMonthlyInvoice = /retainer|monthly|per month|\/mo\b|growth partner/i.test(
    `${listing.package_type ?? ""}`,
  );
  if (discount === 0 && !isMonthlyInvoice) {
    try {
      const { shootCount } = await memberRewardWindow(listing.agent_email);
      const tier = tierForShootCount(shootCount);
      loyaltyCoupon = await resolveLoyaltyCouponId(tier.couponId, tier.percentOff);
    } catch {
      // Customers table may not be provisioned yet; checkout still works without loyalty.
    }
  }

  const client = new Stripe(secretKey);
  const buildSession = (coupon: string | null) =>
    client.checkout.sessions.create({
      mode: "payment",
      customer_email: listing.agent_email,
      client_reference_id: listing.id,
      metadata: { listing_id: listing.id, ...(coupon ? { loyalty_coupon: coupon } : {}) },
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
      // Loyalty coupon and customer-entered promo codes are mutually exclusive in Stripe Checkout.
      ...(coupon
        ? { discounts: [{ coupon }] }
        : { allow_promotion_codes: discount === 0 }),
      success_url: `${page}?paid=1`,
      cancel_url: page,
    });

  try {
    let session;
    try {
      session = await buildSession(loyaltyCoupon);
    } catch (error) {
      // A stale/missing loyalty coupon must never block a customer from paying.
      if (!loyaltyCoupon) throw error;
      session = await buildSession(null);
    }
    if (!session.url) throw new Error("No checkout URL");
    return Response.json({ url: session.url });
  } catch {
    return Response.json({ error: "Unable to start checkout." }, { status: 502 });
  }
}
