import { requireAdmin } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/services/[id]">) {
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

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = clean(body.name, 160);
    if (!name) return Response.json({ error: "A service name is required." }, { status: 400 });
    patch.name = name;
  }
  if (typeof body.description === "string") patch.description = clean(body.description, 400) || null;
  if (body.price !== undefined) {
    const price = Number(body.price);
    patch.price = Number.isFinite(price) ? Math.max(0, price) : 0;
  }
  if (typeof body.unit === "string") patch.unit = clean(body.unit, 40) || null;
  if (body.billing === "once" || body.billing === "monthly") patch.billing = body.billing;
  if (typeof body.category === "string") patch.category = clean(body.category, 40) || "custom";
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (Object.keys(patch).length === 0) return Response.json({ error: "Nothing to update." }, { status: 400 });

  const { data, error } = await supabaseAdmin().from("services").update(patch).eq("id", id).select("*").single();
  if (error) return Response.json({ error: "Could not update the service." }, { status: 500 });
  return Response.json({ service: data }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/services/[id]">) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Invalid id." }, { status: 400 });

  // Soft-delete so existing offers keep their line items intact.
  const { error } = await supabaseAdmin().from("services").update({ is_active: false }).eq("id", id);
  if (error) return Response.json({ error: "Could not archive the service." }, { status: 500 });
  return Response.json({ archived: true }, { headers: { "cache-control": "no-store" } });
}
