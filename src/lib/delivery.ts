import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { getObjectUrl } from "@/lib/storage";

export const ASSET_TYPES = ["hdr_still", "drone_aerial", "floor_plan_pdf", "floor_plan_img", "walkthrough_video"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export type Listing = {
  id: string;
  created_at: string;
  property_address: string;
  city: string;
  state: string;
  zip_code: string;
  agent_name: string;
  agent_email: string;
  agent_phone: string | null;
  brokerage_name: string | null;
  agent_headshot_url: string | null;
  package_type: string;
  invoice_amount: number | string;
  is_paid: boolean;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  /** The booking this delivery came from, when it was created from one. */
  booking_id?: string | null;
  access_token: string;
  reminder_count: number;
  last_reminder_at: string | null;
  discount_amount?: number | string | null;
  promo_code?: string | null;
  is_comp?: boolean;
  admin_notes?: string | null;
  // One-time social upsell claimed from the delivery paywall: 'starter' ($99) | 'reels' ($169).
  social_package?: string | null;
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
  features?: string[] | null;
  agent_bio?: string | null;
  showing_url?: string | null;
};

export type ListingAsset = {
  id: string;
  listing_id: string;
  asset_type: AssetType;
  full_res_url: string;
  web_res_url: string;
  watermarked_url: string | null;
  sort_order: number;
};

const TOKEN_PATTERN = /^[0-9a-f]{32}$/;

export function isValidToken(token: string) {
  return TOKEN_PATTERN.test(token);
}

const HEADSHOT_KEY_PATTERN = /^listings\/[0-9a-f-]{36}\/agent-headshot\.jpg$/;

/**
 * Customer-uploaded headshots are stored as "r2:<key>" markers so the page can sign a
 * fresh URL on every load; admin-entered https URLs pass straight through.
 */
export async function resolveHeadshotUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (value.startsWith("r2:")) {
    const key = value.slice(3);
    if (!HEADSHOT_KEY_PATTERN.test(key)) return null;
    try {
      return await getObjectUrl(key, { expiresIn: 3600 });
    } catch {
      return null;
    }
  }
  return value;
}

export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? "https://meritmediafl.com";
  return configured.replace(/\/+$/, "");
}

export function deliveryLinks(token: string) {
  const base = siteUrl();
  return {
    delivery: `${base}/delivery/${token}`,
    mls: `${base}/mls/${token}`,
    showcase: `${base}/showcase/${token}`,
  };
}

export async function getListingByToken(token: string) {
  if (!isValidToken(token)) return null;
  const db = supabaseAdmin();
  const { data: listing, error } = await db.from("listings").select("*").eq("access_token", token).maybeSingle<Listing>();
  if (error) throw new Error(error.message);
  if (!listing) return null;
  const { data: assets, error: assetsError } = await db
    .from("listing_assets")
    .select("*")
    .eq("listing_id", listing.id)
    .order("sort_order", { ascending: true })
    .returns<ListingAsset[]>();
  if (assetsError) throw new Error(assetsError.message);
  return { listing, assets: assets ?? [] };
}

export function formatMoney(value: number | string) {
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function fileNameFromKey(key: string) {
  return key.split("/").pop() ?? "file";
}
