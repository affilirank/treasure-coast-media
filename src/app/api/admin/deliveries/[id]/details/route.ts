import { requireAdmin } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase";
import { factsFromListing, updateListingDetails, type ListingRow } from "@/lib/listing-details";

export const runtime = "nodejs";

const ID = /^[0-9a-f-]{36}$/i;

export async function GET(request: Request, ctx: RouteContext<"/api/admin/deliveries/[id]/details">) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!ID.test(id)) return Response.json({ error: "Invalid id." }, { status: 400 });

  const { data } = await supabaseAdmin().from("listings").select("*").eq("id", id).maybeSingle<ListingRow>();
  if (!data) return Response.json({ error: "Delivery not found." }, { status: 404 });
  return Response.json({ details: factsFromListing(data), address: data.property_address, accessToken: data.access_token }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/deliveries/[id]/details">) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!ID.test(id)) return Response.json({ error: "Invalid id." }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const updated = await updateListingDetails(id, body);
    if (!updated) return Response.json({ error: "Delivery not found." }, { status: 404 });
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not save the tour details." }, { status: 500 });
  }
}
