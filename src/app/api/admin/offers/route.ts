import { requireAdmin } from "@/lib/admin-guard";
import { computeOfferTotals, createOfferCoupon, listOffers, normalizeItems } from "@/lib/offers";
import { siteUrl } from "@/lib/delivery";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function offerShareUrl(token: string) {
  return `${siteUrl()}/offer/${token}`;
}

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const offers = (await listOffers()).map((offer) => ({ ...offer, shareUrl: offerShareUrl(offer.share_token) }));
    return Response.json({ offers }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not load offers. Has the offers migration been applied?" }, { status: 503 });
  }
}

type OfferBody = Record<string, unknown>;

export function parseOfferInput(body: OfferBody) {
  const name = clean(body.name, 120);
  if (!name) return { error: "An offer name is required." as const };
  const items = normalizeItems(body.items);
  if (items.length === 0) return { error: "Add at least one service to the offer." as const };
  const discountType: "percent" | "amount" | null = body.discount_type === "percent" ? "percent" : body.discount_type === "amount" ? "amount" : null;
  const discountValue = Number(body.discount_value);
  const totals = computeOfferTotals(items, discountType, Number.isFinite(discountValue) ? discountValue : 0);
  return {
    name,
    headline: clean(body.headline, 160) || null,
    description: clean(body.description, 1000) || null,
    items,
    discountType,
    discountValue: Number.isFinite(discountValue) ? Math.max(0, discountValue) : 0,
    totals,
    code: clean(body.code, 40).toUpperCase() || null,
    aiGenerated: body.ai_generated === true,
  };
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: OfferBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = parseOfferInput(body);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });

  let couponId: string | null = null;
  let promotionCode: string | null = null;
  try {
    const coupon = await createOfferCoupon({ name: parsed.name, discountType: parsed.discountType, discountValue: parsed.discountValue, code: parsed.code });
    couponId = coupon.couponId;
    promotionCode = coupon.promotionCode;
  } catch {
    // Offer still saves even if Stripe is unavailable; the discount shows on the share page.
  }

  const { data, error } = await supabaseAdmin()
    .from("offers")
    .insert({
      name: parsed.name,
      headline: parsed.headline,
      description: parsed.description,
      items: parsed.items,
      subtotal: parsed.totals.subtotal,
      discount_type: parsed.discountType,
      discount_value: parsed.discountValue,
      total: parsed.totals.total,
      coupon_id: couponId,
      promotion_code: promotionCode,
      ai_generated: parsed.aiGenerated,
    })
    .select("*")
    .single();
  if (error) return Response.json({ error: "Could not save the offer." }, { status: 500 });

  return Response.json(
    { offer: { ...data, shareUrl: offerShareUrl(data.share_token) }, totals: parsed.totals },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}
