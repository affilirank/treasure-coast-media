import Stripe from "stripe";
import Link from "next/link";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const id = Array.isArray(sessionId) ? sessionId[0] : sessionId;
  let confirmed = false;
  let referenceId = "";

  if (id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(id);
      confirmed = session.status === "complete" && session.payment_status === "paid";
      referenceId = session.metadata?.referenceId ?? "";
    } catch {
      confirmed = false;
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#111916", color: "#f5f1ea", padding: 24 }}>
      <section style={{ width: "min(100%, 560px)", border: "1px solid rgba(255,255,255,0.14)", borderTop: "3px solid #c4a16a", background: "#182320", padding: 34 }}>
        <span style={{ color: "#e1c697", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>Merit Media &amp; Marketing</span>
        <h1 style={{ margin: "14px 0", fontFamily: "Georgia,serif", fontSize: 38, fontWeight: 400 }}>{confirmed ? "Your deposit is confirmed." : "Payment status is being verified."}</h1>
        <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 15, lineHeight: 1.7 }}>{confirmed ? "Your production request is confirmed. A receipt and next steps will be emailed to you shortly." : "We have not yet received a verified payment confirmation. If you completed checkout, wait a moment for the payment provider to finish processing."}</p>
        {referenceId && <p style={{ color: "#e1c697", fontSize: 13 }}>Booking reference: {referenceId}</p>}
        <Link href="/" style={{ display: "inline-flex", marginTop: 16, border: "1px solid rgba(255,255,255,0.3)", padding: "12px 16px", color: "#fff" }}>Return to Merit Media</Link>
      </section>
    </main>
  );
}