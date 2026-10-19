import { requireAdmin } from "@/lib/admin-guard";
import { supabaseAdmin } from "@/lib/supabase";
import { extractListingFacts, factsFromListing, writeListingCopy, type ListingRow } from "@/lib/listing-details";
import { geminiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";

const ID = /^[0-9a-f-]{36}$/i;

/** AI helpers for the tour editor: extract facts from MLS text, or write marketing copy. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/deliveries/[id]/details/ai">) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!ID.test(id)) return Response.json({ error: "Invalid id." }, { status: 400 });
  if (!geminiConfigured()) return Response.json({ error: "AI is not configured (GEMINI_API_KEY missing)." }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const mode = body.mode;

  try {
    if (mode === "extract") {
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (text.length < 20) return Response.json({ error: "Paste the MLS remarks or property description first." }, { status: 400 });
      const facts = await extractListingFacts(text);
      return Response.json({ facts }, { headers: { "cache-control": "no-store" } });
    }

    if (mode === "write") {
      const { data } = await supabaseAdmin().from("listings").select("*").eq("id", id).maybeSingle<ListingRow>();
      if (!data) return Response.json({ error: "Delivery not found." }, { status: 404 });
      // Merge any unsaved facts sent from the editor so the copy reflects the latest edits.
      const current = factsFromListing(data);
      const merged = {
        ...current,
        ...(typeof body.facts === "object" && body.facts ? (body.facts as Partial<typeof current>) : {}),
        address: data.property_address,
      };
      const copy = await writeListingCopy(merged);
      return Response.json({ copy }, { headers: { "cache-control": "no-store" } });
    }

    return Response.json({ error: "Unknown mode." }, { status: 400 });
  } catch {
    return Response.json({ error: "The AI request failed. Please try again." }, { status: 502 });
  }
}
