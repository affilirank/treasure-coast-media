import { getListingByToken } from "@/lib/delivery";
import { getHeadshotUploadUrl } from "@/lib/storage";

export const runtime = "nodejs";

/** Returns a short-lived PUT URL for the agent headshot; the browser uploads image/jpeg directly. */
export async function POST(request: Request, ctx: RouteContext<"/api/delivery/[token]/headshot">) {
  const { token } = await ctx.params;

  let contentType = "";
  try {
    contentType = String(((await request.json()) as { contentType?: unknown }).contentType ?? "");
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (contentType !== "image/jpeg") return Response.json({ error: "Headshots must be JPEG images." }, { status: 400 });

  const found = await getListingByToken(token);
  if (!found) return Response.json({ error: "Delivery not found." }, { status: 404 });
  if (!found.listing.is_paid) return Response.json({ error: "Payment required." }, { status: 402 });

  try {
    const { key, url } = await getHeadshotUploadUrl(found.listing.id);
    return Response.json({ key, url, expiresIn: 900 }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Uploads are unavailable right now." }, { status: 503 });
  }
}
