import Stripe from "stripe";
import { loadBooking, saveBooking } from "@/lib/booking-store";
import { confirmSlot, releaseSlot } from "@/lib/calendar";
import { sendBookingConfirmation } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secretKey || !webhookSecret) {
    return Response.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }
  if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });

  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded" && event.type !== "checkout.session.expired") {
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.listing_id) return Response.json({ received: true, ignored: true });
  const referenceId = session.metadata?.referenceId;
  if (!referenceId) return Response.json({ error: "Checkout session has no booking reference." }, { status: 400 });

  try {
    const booking = await loadBooking(referenceId);
    if (!booking) return Response.json({ error: "Booking record not found." }, { status: 404 });

    if (event.type === "checkout.session.expired") {
      if (booking.paymentStatus !== "paid") {
        await saveBooking({ ...booking, paymentStatus: "expired", stripeCheckoutSessionId: session.id });
        await releaseSlot(referenceId, true);
      }
      return Response.json({ received: true });
    }

    if (session.payment_status !== "paid") return Response.json({ received: true, paymentStatus: session.payment_status });
    if (booking.paymentStatus === "paid" && booking.confirmationEmailStatus === "sent") return Response.json({ received: true, duplicate: true });

    const paidBooking = {
      ...booking,
      paymentStatus: "paid" as const,
      stripeCheckoutSessionId: session.id,
      paidAt: booking.paidAt ?? new Date().toISOString(),
    };
    await saveBooking(paidBooking);
    await confirmSlot(referenceId, { referenceId, date: booking.booking.date, time: booking.booking.time, name: booking.booking.name, address: booking.booking.address });

    const email = await sendBookingConfirmation({
      to: booking.booking.email,
      name: booking.booking.name,
      referenceId,
      total: booking.total,
      recurring: booking.recurring,
      address: booking.booking.address,
      date: booking.booking.date,
      time: booking.booking.time,
      track: booking.track,
    });
    await saveBooking({ ...paidBooking, confirmationEmailStatus: email.status === "sent" ? "sent" : "not_configured" });

    const webhookUrl = process.env.BOOKING_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-booking-source": "merit-media-marketing",
          ...(process.env.BOOKING_WEBHOOK_SECRET ? { "x-booking-secret": process.env.BOOKING_WEBHOOK_SECRET } : {}),
        },
        body: JSON.stringify({ event: "booking.paid", referenceId, paidAt: paidBooking.paidAt, total: booking.total, booking }),
        signal: AbortSignal.timeout(10000),
      });
    }

    return Response.json({ received: true, emailStatus: email.status });
  } catch {
    return Response.json({ error: "Booking payment could not be recorded." }, { status: 500 });
  }
}