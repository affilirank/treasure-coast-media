import "server-only";

export type LoyaltyTierId = "Silver" | "Gold" | "Platinum" | "Black Label";

export type LoyaltyTier = {
  id: LoyaltyTierId;
  min: number;
  max: number;
  percentOff: number;
  couponId: string | null;
  perk: string;
};

/**
 * The Merit Club — annual partner rewards.
 *
 * Rewards are earned on shoots completed within the *current calendar year* and
 * reset every January 1. The percentage applies to one-time shoot/media services
 * only (monthly growth retainers are excluded — they carry the base shoot credit
 * instead), and is capped at 10% across every tier.
 *
 * Note: because the count resets each year, `tierForShootCount` must be given a
 * *current-year* shoot count, not a lifetime total.
 */
export const LOYALTY_TIERS: LoyaltyTier[] = [
  { id: "Silver", min: 1, max: 4, percentOff: 0, couponId: null, perk: "Next-morning 9:00 AM MLS delivery & dedicated scheduling." },
  { id: "Gold", min: 5, max: 9, percentOff: 5, couponId: "LOYALTY5", perk: "5% off one-time shoots for the rest of the year + 1 free virtual twilight per 5 shoots." },
  { id: "Platinum", min: 10, max: 19, percentOff: 7, couponId: "LOYALTY7", perk: "7% off one-time shoots for the rest of the year + free 2D floor plans." },
  { id: "Black Label", min: 20, max: Number.POSITIVE_INFINITY, percentOff: 10, couponId: "LOYALTY10", perk: "10% off one-time shoots for the rest of the year + 2 rush credits + one annual agent branding/headshot session + first-priority scheduling." },
];

/** January 1 of the current year, used to scope the annual shoot count. */
export function loyaltyYearStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}

export function tierForShootCount(shootCount: number): LoyaltyTier {
  const count = Number.isFinite(shootCount) ? Math.max(0, Math.floor(shootCount)) : 0;
  return LOYALTY_TIERS.find((tier) => count >= tier.min && count <= tier.max) ?? LOYALTY_TIERS[0];
}

export function loyaltyCouponForShootCount(shootCount: number): string | null {
  return tierForShootCount(shootCount).couponId;
}

/**
 * Resolve a Stripe coupon id for a loyalty percentage, creating it if missing.
 *
 * The club coupons were originally created by hand in Stripe, so a new tier (7%)
 * would silently fall back to full price. This provisions the coupon on demand so
 * every tier is guaranteed to have a working discount.
 */
export async function resolveLoyaltyCouponId(couponId: string | null, percentOff: number): Promise<string | null> {
  if (!couponId) return null;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  try {
    const Stripe = (await import("stripe")).default;
    const client = new Stripe(secretKey);
    try {
      const existing = await client.coupons.retrieve(couponId);
      if (existing && !existing.deleted) return existing.id;
    } catch {
      // Coupon is missing; fall through and create it.
    }
    if (percentOff <= 0) return null;
    const created = await client.coupons.create({
      id: couponId,
      name: `Merit Club ${percentOff}%`,
      percent_off: percentOff,
      duration: "once",
    });
    return created.id;
  } catch {
    // Never block a customer: fall back to no discount.
    return null;
  }
}
