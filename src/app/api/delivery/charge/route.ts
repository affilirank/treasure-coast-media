import Stripe from "stripe";
import { getListingByToken, isValidToken, siteUrl } from "@/lib/delivery";
import { loadBooking } from "@/lib/booking-store";
import { sendDeliveryReadyEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// Captures the card held on file at booking time (item 6b).
//
// Returns { captured: true } when the saved card was charged off-session and the
// listing is marked paid. Returns { fallback: true } when the card needs
// authentication or is unusable, so the client can start hosted Checkout instead.
// A missing/settled card or an unlinked booking is also a fallback, never an error.

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return Response.json({ error: "Payments are not configured." }, { status: 503 });

  let token: unknown;
  try {
    token = (await request.json()).token;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof token !== "string" || !isValidToken(token)) return Response.json({ error: "Invalid request." }, { status: 400 });

  const found = await getListingByToken(token);
  if (!found) return Response.json({ error: "Delivery not found." }, { status: 404 });
  const { listing } = found;
  if (listing.is_paid) return Response.json({ error: "This invoice is already paid." }, { status: 409 });
  if (!listing.booking_id) return Response.json({ fallback: true });

  const booking = await loadBooking(listing.booking_id).catch(() => null);
  const setupIntentId = booking?.stripeSetupIntentId ?? null;
  if (!setupIntentId) return Response.json({ fallback: true });

  const discount = Math.max(0, Number(listing.discount_amount ?? 0));
  const amountCents = Math.max(0, Math.round((Number(listing.invoice_amount) - discount) * 100));
  if (amountCents <= 0) return Response.json({ error: "This delivery has no balance due. Ask the team to waive it." }, { status: 409 });

  const client = new Stripe(secretKey);

  // Resolve the saved payment method from the booking's SetupIntent.
  let paymentMethodId: string | null = null;
  try {
    const intent = await client.setupIntents.retrieve(setupIntentId);
    if (intent.status === "succeeded" && typeof intent.payment_method === "string") paymentMethodId = intent.payment_method;
  } catch {
    return Response.json({ fallback: true });
  }
  if (!paymentMethodId) return Response.json({ fallback: true });

  try {
    const intent = await client.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      description: `Real estate media: ${listing.property_address}`,
      metadata: { listing_id: listing.id, booking_id: listing.booking_id, paid_via: "card_on_file" },
    });

    if (intent.status !== "succeeded") return Response.json({ fallback: true });

    // Mirror the webhook's paid state; gated on is_paid=false so it can only happen once.
    const { data: updated } = await supabaseAdmin()
      .from("listings")
      .update({ is_paid: true, stripe_payment_intent_id: intent.id, stripe_session_id: null })
      .eq("id", listing.id)
      .eq("is_paid", false)
      .select("property_address, agent_name, agent_email, access_token");
    const paid = updated?.[0];
    if (paid) {
      try {
        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
        await sendDeliveryReadyEmail({
          to: adminEmail ? [paid.agent_email, adminEmail] : [paid.agent_email],
          agentName: paid.agent_name,
          propertyAddress: paid.property_address,
          deliveryUrl: `${siteUrl()}/delivery/${paid.access_token}`,
        });
      } catch (cause) {
        // Payment is recorded; a failed email must not fail the capture.
        console.error("Delivery email failed", cause);
      }
    }
    return Response.json({ captured: true });
  } catch (error) {
    // authentication_required / card_declined / expired → let the visitor pay via Checkout.
    if (error instanceof Stripe.errors.StripeError) {
      return Response.json({ fallback: true, reason: error.code ?? "card_error" });
    }
    return Response.json({ fallback: true });
  }
}
