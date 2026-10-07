import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

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
  access_token: string;
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
