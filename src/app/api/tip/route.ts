import Stripe from "stripe";
import { isValidToken, siteUrl } from "@/lib/delivery";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const MIN_TIP = 1;
const MAX_TIP = 500;

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return Response.json({ error: "Payments are not configured." }, { status: 503 });

  let token: unknown;
  let amount: unknown;
  try {
    const body = await request.json();
    token = body.token;
    amount = body.amount;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof token !== "string" || !isValidToken(token)) return Response.json({ error: "Invalid request." }, { status: 400 });

  const dollars = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(dollars) || dollars < MIN_TIP || dollars > MAX_TIP) {
    return Response.json({ error: `Choose a thank-you between $${MIN_TIP} and $${MAX_TIP}.` }, { status: 400 });
  }

  const { data: listing } = await supabaseAdmin()
    .from("listings")
    .select("id, property_address, agent_email, agent_name")
    .eq("access_token", token)
    .maybeSingle<{ id: string; property_address: string; agent_email: string; agent_name: string }>();
  if (!listing) return Response.json({ error: "Delivery not found." }, { status: 404 });

  const page = `${siteUrl()}/delivery/${token}`;

  try {
    const session = await new Stripe(secretKey).checkout.sessions.create({
      mode: "payment",
      customer_email: listing.agent_email,
      client_reference_id: listing.id,
      metadata: { kind: "tip", listing_id: listing.id, tip_amount: dollars.toFixed(2), property_address: listing.property_address, agent_name: listing.agent_name, agent_email: listing.agent_email },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(dollars * 100),
            product_data: {
              name: "A thank-you to Merit Media",
              description: `Optional gratuity — ${listing.property_address}`,
            },
          },
        },
      ],
      success_url: `${page}?tipped=1`,
      cancel_url: page,
    });
    if (!session.url) throw new Error("No checkout URL");
    return Response.json({ url: session.url });
  } catch {
    return Response.json({ error: "Unable to start the thank-you checkout." }, { status: 502 });
  }
}
