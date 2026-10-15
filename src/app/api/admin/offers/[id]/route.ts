import { requireAdmin } from "@/lib/admin-guard";
import { createOfferCoupon } from "@/lib/offers";
import { offerShareUrl, parseOfferInput } from "@/app/api/admin/offers/route";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/offers/[id]">) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Invalid id." }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // A full update goes through the same validation as creation.
  if (body.items !== undefined || body.name !== undefined) {
    const parsed = parseOfferInput(body);
    if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });

    let couponId: string | null | undefined;
    let promotionCode: string | null | undefined;
    try {
      const coupon = await createOfferCoupon({ name: parsed.name, discountType: parsed.discountType, discountValue: parsed.discountValue, code: parsed.code });
      couponId = coupon.couponId;
      promotionCode = coupon.promotionCode;
    } catch {
      couponId = undefined;
    }

    const patch: Record<string, unknown> = {
      name: parsed.name,
      headline: parsed.headline,
      description: parsed.description,
      items: parsed.items,
      subtotal: parsed.totals.subtotal,
      discount_type: parsed.discountType,
      discount_value: parsed.discountValue,
      total: parsed.totals.total,
      updated_at: new Date().toISOString(),
    };
    if (couponId) patch.coupon_id = couponId;
    if (promotionCode) patch.promotion_code = promotionCode;

    const { data, error } = await supabaseAdmin().from("offers").update(patch).eq("id", id).select("*").single();
    if (error) return Response.json({ error: "Could not update the offer." }, { status: 500 });
    return Response.json({ offer: { ...data, shareUrl: offerShareUrl(data.share_token) }, totals: parsed.totals }, { headers: { "cache-control": "no-store" } });
  }

  // Lightweight toggle for activation.
  if (typeof body.is_active === "boolean") {
    const { data, error } = await supabaseAdmin().from("offers").update({ is_active: body.is_active, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
    if (error) return Response.json({ error: "Could not update the offer." }, { status: 500 });
    return Response.json({ offer: data }, { headers: { "cache-control": "no-store" } });
  }

  return Response.json({ error: "Nothing to update." }, { status: 400 });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/offers/[id]">) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Invalid id." }, { status: 400 });

  const { error } = await supabaseAdmin().from("offers").delete().eq("id", id);
  if (error) return Response.json({ error: "Could not delete the offer." }, { status: 500 });
  return Response.json({ deleted: true }, { headers: { "cache-control": "no-store" } });
}
