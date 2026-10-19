import Stripe from "stripe";
import { deliveryLinks } from "@/lib/delivery";
import { sendDeliveryReadyEmail, sendSocialPackageConfirmationEmail, sendSocialPackageNotificationEmail, sendTipNotificationEmail } from "@/lib/email";
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

  // Optional gratuities are recorded in Stripe only; they must never touch the invoice state.
  if (session.metadata?.kind === "tip") {
    if (session.payment_status === "paid") {
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
      if (adminEmail) {
        const amount = session.amount_total ? `$${(session.amount_total / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "a thank-you";
        try {
          await sendTipNotificationEmail({
            to: [adminEmail],
            agentName: session.metadata?.agent_name ?? session.customer_details?.name ?? "A client",
            agentEmail: session.customer_details?.email ?? session.metadata?.agent_email ?? "",
            propertyAddress: session.metadata?.property_address ?? "a delivery",
            amount,
          });
        } catch (cause) {
          console.error("Tip notification email failed", cause);
        }
      }
    }
    return Response.json({ received: true, tip: true });
  }

  // Social media packages are one-time upsells; they must never touch the invoice state.
  if (session.metadata?.kind === "social") {
    const socialListingId = session.metadata?.listing_id;
    if (session.payment_status === "paid" && socialListingId) {
      const plan = session.metadata?.package === "reels" ? "reels" : "starter";
      const planLabel = plan === "reels" ? "30-Day Social Plan + 7 Premium Reels" : "30-Day Social Plan";
      const amount = session.amount_total ? `$${(session.amount_total / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "";
      // Gated on social_package IS NULL so Stripe retries never double-claim or double-email.
      const { data: updated } = await supabaseAdmin()
        .from("listings")
        .update({ social_package: plan })
        .eq("id", socialListingId)
        .is("social_package", null)
        .select("property_address, agent_name, agent_email, access_token");
      const listing = updated?.[0];
      if (listing) {
        try {
          await sendSocialPackageConfirmationEmail({
            to: [listing.agent_email],
            agentName: listing.agent_name,
            propertyAddress: listing.property_address,
            planLabel,
            deliveryUrl: deliveryLinks(listing.access_token).delivery,
          });
        } catch (cause) {
          console.error("Social confirmation email failed", cause);
        }
        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
        if (adminEmail) {
          try {
            await sendSocialPackageNotificationEmail({
              to: [adminEmail],
              agentName: listing.agent_name,
              agentEmail: listing.agent_email,
              propertyAddress: listing.property_address,
              planLabel,
              amount,
            });
          } catch (cause) {
            console.error("Social notification email failed", cause);
          }
        }
      }
    }
    return Response.json({ received: true, social: true });
  }

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
