import { requireAdmin } from "@/lib/admin-guard";
import { geminiConfigured, geminiGenerate } from "@/lib/gemini";
import { computeOfferTotals, listServices, normalizeItems, type OfferItem, type Service } from "@/lib/offers";

export const runtime = "nodejs";

type AiDraft = {
  name?: string;
  headline?: string;
  description?: string;
  items?: { source_id?: string; qty?: number; free?: boolean }[];
  discount_type?: "percent" | "amount" | null;
  discount_value?: number;
  code?: string;
};

const SYSTEM = `You build promotional offers for Merit Media & Marketing, a Florida real estate media and commercial marketing agency.
Choose services ONLY from the provided catalog, referencing each by its source_id. Never invent services or prices.
Return strict JSON with this shape:
{"name": string, "headline": string, "description": string,
 "items": [{"source_id": string, "qty": number, "free": boolean}],
 "discount_type": "percent" | "amount" | null, "discount_value": number, "code": string}
Rules: qty is a small whole number (usually 1). Set free:true only for a bonus upgrade meant to be given away (shown with the price struck through and the word Free). Keep name under 8 words, headline under 12 words, description 1-2 sentences. If no discount is appropriate use discount_type null and discount_value 0. code is an uppercase promo code under 16 chars, or an empty string.`;

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  if (!geminiConfigured()) return Response.json({ error: "Set GEMINI_API_KEY to use the AI builder." }, { status: 503 });

  let prompt = "";
  let requestedIds: string[] = [];
  try {
    const body = (await request.json()) as { prompt?: unknown; sourceIds?: unknown };
    if (typeof body.prompt === "string") prompt = body.prompt.trim().slice(0, 800);
    if (Array.isArray(body.sourceIds)) requestedIds = body.sourceIds.filter((id): id is string => typeof id === "string");
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  let services: Service[];
  try {
    services = await listServices(true);
  } catch {
    return Response.json({ error: "Could not load the service catalog. Has the services migration been applied?" }, { status: 503 });
  }

  const catalog = services.map((service) => ({ source_id: service.source_id, name: service.name, price: Number(service.price), category: service.category, billing: service.billing }));
  const catalogText = catalog.map((item) => `- ${item.source_id} | ${item.name} | $${item.price} | ${item.category} | ${item.billing}`).join("\n");

  const userPrompt = [
    requestedIds.length ? `Prefer these services if relevant: ${requestedIds.join(", ")}` : "",
    prompt ? `Request: ${prompt}` : "Create a compelling seasonal promotional package.",
  ].filter(Boolean).join("\n");

  let draft: AiDraft;
  try {
    const text = await geminiGenerate(`${userPrompt}\n\nService catalog:\n${catalogText}`, { system: SYSTEM, json: true });
    draft = JSON.parse(text) as AiDraft;
  } catch {
    return Response.json({ error: "The AI builder could not generate an offer. Try again." }, { status: 502 });
  }

  // Rebuild items from the catalog so AI can never set arbitrary prices.
  const byId = new Map(services.filter((service) => service.source_id).map((service) => [service.source_id as string, service]));
  const items: OfferItem[] = [];
  for (const chosen of Array.isArray(draft.items) ? draft.items : []) {
    const service = chosen?.source_id ? byId.get(chosen.source_id) : undefined;
    if (!service) continue;
    items.push({ source_id: service.source_id, name: service.name, price: Number(service.price), qty: Number(chosen.qty) || 1, free: chosen.free === true });
  }
  const safeItems = normalizeItems(items);
  const discountType = draft.discount_type === "percent" || draft.discount_type === "amount" ? draft.discount_type : null;
  const discountValue = Number(draft.discount_value);
  const totals = computeOfferTotals(safeItems, discountType, Number.isFinite(discountValue) ? discountValue : 0);

  return Response.json(
    {
      draft: {
        name: typeof draft.name === "string" ? draft.name.slice(0, 120) : "Custom Offer",
        headline: typeof draft.headline === "string" ? draft.headline.slice(0, 160) : "",
        description: typeof draft.description === "string" ? draft.description.slice(0, 1000) : "",
        items: safeItems,
        discount_type: discountType,
        discount_value: Number.isFinite(discountValue) ? Math.max(0, discountValue) : 0,
        code: typeof draft.code === "string" ? draft.code.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 16) : "",
        ai_generated: true,
      },
      totals,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
