import { requireAdmin } from "@/lib/admin-guard";
import type { Listing } from "@/lib/delivery";
import { sendPaymentEmail } from "@/lib/reminders";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/deliveries/[id]/remind">) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Invalid id." }, { status: 400 });

  const kind = new URL(request.url).searchParams.get("kind") === "request" ? "request" : "reminder";
  const { data: listing } = await supabaseAdmin().from("listings").select("*").eq("id", id).maybeSingle<Listing>();
  if (!listing) return Response.json({ error: "Delivery not found." }, { status: 404 });
  if (listing.is_paid) return Response.json({ error: "Already paid." }, { status: 409 });

  try {
    const status = await sendPaymentEmail(listing, kind);
    if (status !== "sent") return Response.json({ error: "Email is not configured." }, { status: 503 });
    return Response.json({ sent: true });
  } catch {
    return Response.json({ error: "Email failed to send." }, { status: 502 });
  }
}
