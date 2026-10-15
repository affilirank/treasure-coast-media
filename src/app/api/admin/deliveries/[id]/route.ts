import { requireAdmin } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase";
import { deleteObjects } from "@/lib/storage";

export const runtime = "nodejs";

type AssetRow = { full_res_url: string; web_res_url: string; watermarked_url: string | null };

/** Waive payment (pro bono / "Blessings") or apply an admin discount to an unpaid delivery. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/deliveries/[id]">) {
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

  const db = supabaseAdmin();
  const { data: listing } = await db.from("listings").select("id, invoice_amount, is_paid").eq("id", id).maybeSingle<{ id: string; invoice_amount: number | string; is_paid: boolean }>();
  if (!listing) return Response.json({ error: "Delivery not found." }, { status: 404 });
  if (listing.is_paid) return Response.json({ error: "This delivery is already marked paid." }, { status: 409 });

  const action = body.action;

  if (action === "waive") {
    const { error } = await db
      .from("listings")
      .update({ is_paid: true, is_comp: true, stripe_payment_intent_id: null, discount_amount: Number(listing.invoice_amount) })
      .eq("id", id);
    if (error) return Response.json({ error: "Could not waive the delivery. Has the discounts migration been applied?" }, { status: 500 });
    return Response.json({ waived: true }, { headers: { "cache-control": "no-store" } });
  }

  if (action === "discount") {
    const discountAmount = Number(body.discountAmount);
    const invoice = Number(listing.invoice_amount);
    if (!Number.isFinite(discountAmount) || discountAmount < 0) return Response.json({ error: "Enter a valid discount amount." }, { status: 400 });
    if (discountAmount > invoice) return Response.json({ error: "Discount cannot exceed the invoice total." }, { status: 400 });
    const promoCode = typeof body.promoCode === "string" ? body.promoCode.trim().slice(0, 40).toUpperCase() || null : null;
    const adminNotes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) || null : null;
    const { error } = await db.from("listings").update({ discount_amount: discountAmount, promo_code: promoCode, admin_notes: adminNotes }).eq("id", id);
    if (error) return Response.json({ error: "Could not apply the discount. Has the discounts migration been applied?" }, { status: 500 });
    return Response.json({ discountAmount, promoCode }, { headers: { "cache-control": "no-store" } });
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
}


export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/deliveries/[id]">) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Invalid id." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: assets } = await db
    .from("listing_assets")
    .select("full_res_url, web_res_url, watermarked_url")
    .eq("listing_id", id)
    .returns<AssetRow[]>();

  const { error: assetError } = await db.from("listing_assets").delete().eq("listing_id", id);
  if (assetError) return Response.json({ error: "Could not delete the delivery assets." }, { status: 500 });

  const { error } = await db.from("listings").delete().eq("id", id);
  if (error) return Response.json({ error: "Could not delete the delivery." }, { status: 500 });

  const keys = (assets ?? []).flatMap((asset) => [asset.full_res_url, asset.web_res_url, asset.watermarked_url]).filter((key): key is string => Boolean(key));
  await deleteObjects(keys);

  return Response.json({ deleted: true }, { headers: { "cache-control": "no-store" } });
}
