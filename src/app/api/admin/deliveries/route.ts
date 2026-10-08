import { requireAdmin } from "@/lib/admin-guard";
import { ASSET_TYPES, deliveryLinks, type AssetType, type Listing } from "@/lib/delivery";
import { sendPaymentEmail } from "@/lib/reminders";
import { objectExists, UPLOAD_KEY_PATTERN } from "@/lib/storage";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type AssetInput = { asset_type: AssetType; full_key: string; web_key: string; preview_key?: string | null };

function text(value: unknown, max: number, required = false) {
  if (typeof value !== "string") return required ? null : "";
  const trimmed = value.trim();
  if (required && !trimmed) return null;
  return trimmed.slice(0, max);
}

function isKey(value: unknown): value is string {
  return typeof value === "string" && UPLOAD_KEY_PATTERN.test(value);
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: { listing?: Record<string, unknown>; assets?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = body.listing ?? {};
  const property_address = text(input.property_address, 200, true);
  const zip_code = text(input.zip_code, 10, true);
  const agent_name = text(input.agent_name, 120, true);
  const agent_email = text(input.agent_email, 200, true);
  const package_type = text(input.package_type, 120, true);
  const invoice_amount = Number(input.invoice_amount);
  if (!property_address || !zip_code || !agent_name || !agent_email || !package_type) {
    return Response.json({ error: "Address, ZIP, agent name, agent email and package are required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agent_email)) return Response.json({ error: "Enter a valid agent email." }, { status: 400 });
  if (!Number.isFinite(invoice_amount) || invoice_amount <= 0 || invoice_amount > 99999999) {
    return Response.json({ error: "Invoice total must be greater than zero." }, { status: 400 });
  }

  const headshot: string | null = text(input.agent_headshot_url, 500) || null;
  if (headshot) {
    try {
      if (new URL(headshot).protocol !== "https:") throw new Error();
    } catch {
      return Response.json({ error: "Headshot must be an https URL." }, { status: 400 });
    }
  }

  const assets = body.assets;
  if (!Array.isArray(assets) || assets.length === 0 || assets.length > 500) {
    return Response.json({ error: "Upload at least one asset." }, { status: 400 });
  }
  for (const asset of assets as AssetInput[]) {
    const valid =
      asset &&
      ASSET_TYPES.includes(asset.asset_type) &&
      isKey(asset.full_key) &&
      isKey(asset.web_key) &&
      (asset.preview_key == null || (isKey(asset.preview_key) && asset.preview_key.split("/")[2].startsWith("preview-")));
    if (!valid) return Response.json({ error: "Invalid asset payload." }, { status: 400 });
  }
  const typed = assets as AssetInput[];
  if (!typed.some((asset) => asset.asset_type === "hdr_still")) {
    return Response.json({ error: "At least one HDR still is required." }, { status: 400 });
  }

  const keys = [...new Set(typed.flatMap((a) => [a.full_key, a.web_key, a.preview_key].filter((k): k is string => Boolean(k))))];
  for (let i = 0; i < keys.length; i += 20) {
    const results = await Promise.all(keys.slice(i, i + 20).map(objectExists));
    if (results.includes(false)) return Response.json({ error: "Some uploaded files are missing from storage. Re-upload and try again." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: listing, error } = await db
    .from("listings")
    .insert({
      property_address,
      city: text(input.city, 80) || "Vero Beach",
      state: text(input.state, 2) || "FL",
      zip_code,
      agent_name,
      agent_email,
      agent_phone: text(input.agent_phone, 40) || null,
      brokerage_name: text(input.brokerage_name, 120) || null,
      agent_headshot_url: headshot,
      package_type,
      invoice_amount: Math.round(invoice_amount * 100) / 100,
    })
    .select("*")
    .single<Listing>();
  if (error || !listing) return Response.json({ error: "Could not create the listing." }, { status: 500 });

  const { error: assetError } = await db.from("listing_assets").insert(
    typed.map((asset, index) => ({
      listing_id: listing.id,
      asset_type: asset.asset_type,
      full_res_url: asset.full_key,
      web_res_url: asset.web_key,
      watermarked_url: asset.preview_key ?? null,
      sort_order: index,
    })),
  );
  if (assetError) {
    await db.from("listings").delete().eq("id", listing.id);
    return Response.json({ error: "Could not save the listing assets." }, { status: 500 });
  }

  const links = deliveryLinks(listing.access_token);
  let emailStatus: "sent" | "preview" | "failed" | "skipped" = "skipped";
  if (body.listing?.send_email !== false) {
    try {
      const result = await sendPaymentEmail(listing, "request");
      emailStatus = result;
    } catch (cause) {
      console.error("Payment request email failed", cause);
      emailStatus = "failed";
    }
  }

  return Response.json({ listingId: listing.id, links, emailStatus }, { status: 201, headers: { "cache-control": "no-store" } });
}

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { data, error } = await supabaseAdmin()
    .from("listings")
    .select("id, created_at, property_address, agent_name, agent_email, invoice_amount, is_paid, access_token, reminder_count, last_reminder_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return Response.json({ error: "Could not load deliveries." }, { status: 500 });
  return Response.json(
    { deliveries: (data ?? []).map(({ access_token, ...rest }) => ({ ...rest, links: deliveryLinks(access_token) })) },
    { headers: { "cache-control": "no-store" } },
  );
}
