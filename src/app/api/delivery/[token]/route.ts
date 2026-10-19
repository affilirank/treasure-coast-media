import { getListingByToken, resolveHeadshotUrl } from "@/lib/delivery";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : undefined;
}

/**
 * The customer personalizes their branded tour page after paying:
 * headline, description and (via /headshot) an uploaded agent headshot.
 */
export async function PATCH(request: Request, ctx: RouteContext<"/api/delivery/[token]">) {
  const { token } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const found = await getListingByToken(token);
  if (!found) return Response.json({ error: "Delivery not found." }, { status: 404 });
  if (!found.listing.is_paid) return Response.json({ error: "Payment required." }, { status: 402 });

  const patch: Record<string, string | null> = {};
  const headline = clean(body.headline, 160);
  const description = clean(body.description, 4000);
  if (headline !== undefined) patch.headline = headline || null;
  if (description !== undefined) patch.description = description || null;
  // Written by the /headshot upload endpoint once the file is in storage.
  if (typeof body.headshotKey === "string" && /^listings\/[0-9a-f-]{36}\/agent-headshot\.jpg$/i.test(body.headshotKey)) {
    patch.agent_headshot_url = `r2:${body.headshotKey}`;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from("listings").update(patch).eq("id", found.listing.id);
  if (error) return Response.json({ error: "Could not save your changes." }, { status: 500 });

  const saved = { ...found.listing, ...patch };
  return Response.json({
    headline: saved.headline ?? null,
    description: saved.description ?? null,
    headshotUrl: await resolveHeadshotUrl(saved.agent_headshot_url),
  });
}
