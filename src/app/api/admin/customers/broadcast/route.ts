import { requireAdmin } from "@/lib/admin-guard";
import { listCustomers } from "@/lib/customers";
import { getOfferByToken } from "@/lib/offers";
import { sendPromoEmail } from "@/lib/email";
import { siteUrl } from "@/lib/delivery";

export const runtime = "nodejs";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const subject = clean(body.subject, 160);
  const heading = clean(body.heading, 120) || subject;
  const text = clean(body.body, 3000);
  const code = clean(body.code, 40).toUpperCase() || null;
  const tiers = Array.isArray(body.tiers) ? body.tiers.filter((tier): tier is string => typeof tier === "string") : [];
  const directEmails = Array.isArray(body.emails) ? body.emails.filter((email): email is string => typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) : [];

  if (!subject || !text) return Response.json({ error: "Add a subject and message." }, { status: 400 });

  let offerUrl: string | null = null;
  if (typeof body.offerToken === "string" && body.offerToken) {
    const offer = await getOfferByToken(body.offerToken);
    if (offer) offerUrl = `${siteUrl()}/offer/${offer.share_token}`;
  }

  let recipients = directEmails;
  if (recipients.length === 0) {
    try {
      const customers = await listCustomers();
      recipients = customers
        .filter((customer) => customer.marketing_opt_in !== false)
        .filter((customer) => tiers.length === 0 || tiers.includes(customer.tier))
        .map((customer) => customer.email);
    } catch {
      return Response.json({ error: "Could not load customers." }, { status: 503 });
    }
  }

  recipients = [...new Set(recipients.map((email) => email.toLowerCase()))].slice(0, 500);
  if (recipients.length === 0) return Response.json({ error: "No recipients matched." }, { status: 400 });

  try {
    const result = await sendPromoEmail({ to: recipients, subject, heading, body: text, code, offerUrl });
    if (result.status !== "sent") return Response.json({ error: "Email is not configured." }, { status: 503 });
    return Response.json({ sent: result.sent, recipients: recipients.length }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not send the promo." }, { status: 502 });
  }
}
