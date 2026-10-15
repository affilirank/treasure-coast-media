import { requireAdmin } from "@/lib/admin-guard";
import { listServices } from "@/lib/offers";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    return Response.json({ services: await listServices() }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not load services. Has the services migration been applied?" }, { status: 503 });
  }
}

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

  const name = clean(body.name, 160);
  if (!name) return Response.json({ error: "A service name is required." }, { status: 400 });
  const price = Number(body.price);
  const billing = body.billing === "monthly" ? "monthly" : "once";

  const db = supabaseAdmin();
  const { data: last } = await db.from("services").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle<{ sort_order: number }>();

  const { data, error } = await db
    .from("services")
    .insert({
      name,
      description: clean(body.description, 400) || null,
      price: Number.isFinite(price) ? Math.max(0, price) : 0,
      unit: clean(body.unit, 40) || null,
      billing,
      category: clean(body.category, 40) || "custom",
      sort_order: (last?.sort_order ?? 0) + 10,
    })
    .select("*")
    .single();
  if (error) return Response.json({ error: "Could not create the service." }, { status: 500 });
  return Response.json({ service: data }, { status: 201, headers: { "cache-control": "no-store" } });
}
