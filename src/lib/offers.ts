import "server-only";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

export type OfferItem = { source_id?: string | null; name: string; price: number; qty: number; free?: boolean };

export type Service = {
  id: string;
  created_at: string;
  source_id: string | null;
  sort_order: number;
  category: string;
  name: string;
  description: string | null;
  price: number | string;
  unit: string | null;
  billing: "once" | "monthly";
  is_active: boolean;
};

export type Offer = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  headline: string | null;
  description: string | null;
  items: OfferItem[];
  subtotal: number | string;
  discount_type: "percent" | "amount" | null;
  discount_value: number | string;
  total: number | string;
  coupon_id: string | null;
  promotion_code: string | null;
  share_token: string;
  is_active: boolean;
  ai_generated: boolean;
  created_by: string | null;
};

export type OfferTotals = { subtotal: number; freeValue: number; paidSubtotal: number; discountAmount: number; total: number; savings: number };

export function normalizeItems(items: unknown): OfferItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((raw) => {
      const item = raw as Record<string, unknown>;
      const name = typeof item.name === "string" ? item.name.trim().slice(0, 160) : "";
      const price = Number(item.price);
      const qty = Number(item.qty);
      return {
        source_id: typeof item.source_id === "string" ? item.source_id : null,
        name,
        price: Number.isFinite(price) ? Math.max(0, price) : 0,
        qty: Number.isFinite(qty) && qty > 0 ? Math.min(99, Math.floor(qty)) : 1,
        free: item.free === true,
      };
    })
    .filter((item) => item.name.length > 0);
}

export function computeOfferTotals(items: OfferItem[], discountType: "percent" | "amount" | null | undefined, discountValue: number): OfferTotals {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const freeValue = items.reduce((sum, item) => (item.free ? sum + item.price * item.qty : sum), 0);
  const paidSubtotal = Math.max(0, subtotal - freeValue);
  const value = Number.isFinite(discountValue) ? Math.max(0, discountValue) : 0;
  const rawDiscount = discountType === "percent" ? paidSubtotal * (Math.min(100, value) / 100) : discountType === "amount" ? value : 0;
  const discountAmount = Math.min(paidSubtotal, Math.round(rawDiscount * 100) / 100);
  const total = Math.max(0, Math.round((paidSubtotal - discountAmount) * 100) / 100);
  return { subtotal, freeValue, paidSubtotal, discountAmount, total, savings: Math.round((freeValue + discountAmount) * 100) / 100 };
}

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured.");
  return new Stripe(key);
}

/** Create a one-time Stripe coupon (and optional public promotion code) for a discounted offer. */
export async function createOfferCoupon(input: { name: string; discountType: "percent" | "amount" | null; discountValue: number; code?: string | null }) {
  const value = Number(input.discountValue);
  if (!input.discountType || !Number.isFinite(value) || value <= 0) return { couponId: null as string | null, promotionCode: null as string | null };

  const client = stripe();
  const coupon = await client.coupons.create({
    name: `Offer: ${input.name}`.slice(0, 40),
    duration: "once",
    ...(input.discountType === "percent"
      ? { percent_off: Math.min(100, value) }
      : { amount_off: Math.round(value * 100), currency: "usd" }),
  });

  let promotionCode: string | null = null;
  const code = input.code?.trim().toUpperCase();
  if (code) {
    try {
      const promotion = await client.promotionCodes.create({ promotion: { type: "coupon", coupon: coupon.id }, code, active: true });
      promotionCode = promotion.code;
    } catch {
      promotionCode = null;
    }
  }

  return { couponId: coupon.id, promotionCode };
}

export async function listServices(activeOnly = false) {
  let query = supabaseAdmin().from("services").select("*").order("sort_order", { ascending: true });
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query.returns<Service[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listOffers() {
  const { data, error } = await supabaseAdmin().from("offers").select("*").order("created_at", { ascending: false }).limit(200).returns<Offer[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getOfferByToken(token: string) {
  if (!/^[0-9a-f]{24}$/.test(token)) return null;
  const { data } = await supabaseAdmin().from("offers").select("*").eq("share_token", token).eq("is_active", true).maybeSingle<Offer>();
  return data ?? null;
}
