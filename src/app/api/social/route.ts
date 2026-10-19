import Stripe from "stripe";
import { isValidToken, siteUrl } from "@/lib/delivery";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const PACKAGES = {
  starter: {
    amount: 9900,
    name: "30-Day Social Plan",
    description: "30 days of Facebook & Instagram posts for this listing",
  },
  reels: {
    amount: 16900,
    name: "30-Day Social Plan + 7 Premium Reels",
    description: "30 days of Facebook & Instagram posts plus 7 premium branded reels",
  },
} as const;

export type SocialPackageId = keyof typeof PACKAGES;

/**
 * One-time social media upsell on the delivery paywall (offered under the tip section).
 * Claimable exactly once per listing, and only after the invoice is paid.
 */
export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return Response.json({ error: "Payments are not configured." }, { status: 503 });

  let token: unknown;
  let plan: unknown;
  try {
    const body = await request.json();
    token = body.token;
    plan = body.package;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof token !== "string" || !isValidToken(token)) return Response.json({ error: "Invalid request." }, { status: 400 });
  if (typeof plan !== "string" || !(plan in PACKAGES)) return Response.json({ error: "Unknown package." }, { status: 400 });
  const pkg = PACKAGES[plan as SocialPackageId];

  const { data: listing } = await supabaseAdmin()
    .from("listings")
    .select("id, property_address, agent_email, agent_name, is_paid, social_package")
    .eq("access_token", token)
    .maybeSingle<{ id: string; property_address: string; agent_email: string; agent_name: string; is_paid: boolean; social_package: string | null }>();
  if (!listing) return Response.json({ error: "Delivery not found." }, { status: 404 });
  if (!listing.is_paid) return Response.json({ error: "Payment required." }, { status: 402 });
  if (listing.social_package) return Response.json({ error: "This offer is already claimed for this listing." }, { status: 409 });

  const page = `${siteUrl()}/delivery/${token}`;

  try {
    const session = await new Stripe(secretKey).checkout.sessions.create({
      mode: "payment",
      customer_email: listing.agent_email,
      client_reference_id: listing.id,
      metadata: {
        kind: "social",
        package: plan,
        listing_id: listing.id,
        property_address: listing.property_address,
        agent_name: listing.agent_name,
        agent_email: listing.agent_email,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pkg.amount,
            product_data: {
              name: pkg.name,
              description: `${pkg.description} — ${listing.property_address}`,
            },
          },
        },
      ],
      success_url: `${page}?social=1`,
      cancel_url: page,
    });
    if (!session.url) throw new Error("No checkout URL");
    return Response.json({ url: session.url });
  } catch {
    return Response.json({ error: "Unable to start checkout." }, { status: 502 });
  }
}
