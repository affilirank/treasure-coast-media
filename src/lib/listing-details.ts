import "server-only";
import { geminiGenerate } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase";

export type ListingFacts = {
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSize: string | null;
  yearBuilt: number | null;
  listPrice: number | null;
  propertyType: string | null;
  mlsNumber: string | null;
  headline: string | null;
  description: string | null;
  features: string[];
  agentBio: string | null;
  showingUrl: string | null;
};

export type ListingRow = {
  id: string;
  property_address: string;
  city: string;
  state: string;
  zip_code: string;
  access_token: string;
  agent_name: string;
  agent_email: string;
  agent_phone: string | null;
  brokerage_name: string | null;
  agent_headshot_url: string | null;
  beds?: number | null;
  baths?: number | string | null;
  sqft?: number | null;
  lot_size?: string | null;
  year_built?: number | null;
  list_price?: number | string | null;
  property_type?: string | null;
  mls_number?: string | null;
  headline?: string | null;
  description?: string | null;
  features?: unknown;
  agent_bio?: string | null;
  showing_url?: string | null;
};

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function featuresOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      return value.split(/\n|,/).map((v) => v.trim()).filter(Boolean);
    }
  }
  return [];
}

/** Normalizes a listings row into the facts the landing pages render. */
export function factsFromListing(listing: ListingRow): ListingFacts {
  return {
    beds: num(listing.beds),
    baths: num(listing.baths),
    sqft: num(listing.sqft),
    lotSize: str(listing.lot_size),
    yearBuilt: num(listing.year_built),
    listPrice: num(listing.list_price),
    propertyType: str(listing.property_type),
    mlsNumber: str(listing.mls_number),
    headline: str(listing.headline),
    description: str(listing.description),
    features: featuresOf(listing.features),
    agentBio: str(listing.agent_bio),
    showingUrl: str(listing.showing_url),
  };
}

/** Applies an admin-edited patch to a listing's tour columns. */
export async function updateListingDetails(id: string, patch: Record<string, unknown>) {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("beds" in patch) update.beds = num(patch.beds);
  if ("baths" in patch) update.baths = num(patch.baths);
  if ("sqft" in patch) update.sqft = num(patch.sqft);
  if ("lot_size" in patch) update.lot_size = str(patch.lot_size);
  if ("year_built" in patch) update.year_built = num(patch.year_built);
  if ("list_price" in patch) update.list_price = num(patch.list_price);
  if ("property_type" in patch) update.property_type = str(patch.property_type);
  if ("mls_number" in patch) update.mls_number = str(patch.mls_number);
  if ("headline" in patch) update.headline = str(patch.headline);
  if ("description" in patch) update.description = str(patch.description);
  if ("features" in patch) update.features = featuresOf(patch.features);
  if ("agent_bio" in patch) update.agent_bio = str(patch.agent_bio);
  if ("showing_url" in patch) update.showing_url = str(patch.showing_url);

  const { data, error } = await supabaseAdmin().from("listings").update(update).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function coerceExtraction(raw: string): Partial<ListingFacts> {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return {};
  }
  return {
    beds: num(parsed.beds),
    baths: num(parsed.baths),
    sqft: num(parsed.sqft),
    lotSize: str(parsed.lot_size),
    yearBuilt: num(parsed.year_built),
    listPrice: num(parsed.list_price),
    propertyType: str(parsed.property_type),
    mlsNumber: str(parsed.mls_number),
    headline: str(parsed.headline),
  };
}

/** Pulls structured facts out of pasted MLS remarks / a listing description. */
export async function extractListingFacts(text: string) {
  const system = [
    "You extract real estate listing facts from MLS remarks or a property description.",
    "Return ONLY strict JSON with these keys (use null when unknown, never guess):",
    '{"beds": number|null, "baths": number|null, "sqft": number|null, "lot_size": string|null, "year_built": number|null, "list_price": number|null, "property_type": string|null, "mls_number": string|null, "headline": string|null}',
    "baths may be a decimal (e.g. 2.5). lot_size is a short string like '0.42 acres'. headline is a punchy 6-10 word marketing title.",
  ].join(" ");
  const out = await geminiGenerate(`Listing text:\n"""\n${text.slice(0, 6000)}\n"""`, { system, json: true });
  return coerceExtraction(out);
}

/** Writes an engaging marketing description from the known facts, plus a headline. */
export async function writeListingCopy(facts: ListingFacts & { address: string }) {
  const details = [
    `Address: ${facts.address}`,
    facts.propertyType && `Type: ${facts.propertyType}`,
    facts.beds != null && `Beds: ${facts.beds}`,
    facts.baths != null && `Baths: ${facts.baths}`,
    facts.sqft != null && `Interior: ${facts.sqft} sqft`,
    facts.lotSize && `Lot: ${facts.lotSize}`,
    facts.yearBuilt != null && `Year built: ${facts.yearBuilt}`,
    facts.features.length > 0 && `Features: ${facts.features.join(", ")}`,
  ].filter(Boolean).join("\n");

  const system = [
    "You are a top luxury real estate copywriter in Florida.",
    "Return ONLY strict JSON: {\"headline\": string, \"description\": string, \"features\": string[]}.",
    "The headline is 6-10 words and evocative. The description is 2-3 short paragraphs (about 90-140 words), vivid and specific, never inventing facts that were not provided. features is a list of 6-10 short selling points derived only from the provided facts (short noun phrases).",
  ].join(" ");
  const out = await geminiGenerate(`Property facts:\n${details}`, { system, json: true });
  const cleaned = out.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as { headline?: unknown; description?: unknown; features?: unknown };
    return {
      headline: str(parsed.headline),
      description: str(parsed.description),
      features: featuresOf(parsed.features),
    };
  } catch {
    return { headline: null, description: null, features: [] as string[] };
  }
}
