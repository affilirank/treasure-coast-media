import Stripe from "stripe";
import { deliveryLinks } from "@/lib/delivery";
import { sendDeliveryReadyEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_DELIVERY_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secretKey || !webhookSecret) return Response.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = new Stripe(secretKey).webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const listingId = session.metadata?.listing_id;
  // Sessions without a listing belong to other flows (e.g. booking deposits).
  if (!listingId) return Response.json({ received: true, ignored: true });
  if (session.payment_status !== "paid") return Response.json({ received: true, paymentStatus: session.payment_status });

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  // Only the first delivery of the event flips is_paid, so retries never send duplicate emails.
  const { data: updated, error } = await supabaseAdmin()
    .from("listings")
    .update({ is_paid: true, stripe_session_id: session.id, stripe_payment_intent_id: paymentIntentId })
    .eq("id", listingId)
    .eq("is_paid", false)
    .select("property_address, agent_name, agent_email, access_token");
  if (error) return Response.json({ error: "Payment could not be recorded." }, { status: 500 });
  const listing = updated?.[0];
  if (!listing) return Response.json({ received: true, duplicate: true });

  try {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    await sendDeliveryReadyEmail({
      to: adminEmail ? [listing.agent_email, adminEmail] : [listing.agent_email],
      agentName: listing.agent_name,
      propertyAddress: listing.property_address,
      deliveryUrl: deliveryLinks(listing.access_token).delivery,
    });
  } catch (cause) {
    // The payment is recorded; a failed email must not make Stripe retry.
    console.error("Delivery email failed", cause);
  }

  return Response.json({ received: true });
}
