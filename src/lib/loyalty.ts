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
 * Rewards are earned on shoots completed within the member's 12-month reward
 * window, which starts on the anniversary of their first-ever shoot and rolls
 * forward each year. The percentage applies to one-time shoot/media services
 * only (monthly growth retainers are excluded — they carry the base shoot credit
 * instead), and is capped at 10% across every tier.
 *
 * Note: because the window rolls, `tierForShootCount` must be given a
 * *current-window* shoot count, not a lifetime total.
 */
export const LOYALTY_TIERS: LoyaltyTier[] = [
  { id: "Silver", min: 1, max: 4, percentOff: 0, couponId: null, perk: "Next-morning 9:00 AM MLS delivery & dedicated scheduling." },
  { id: "Gold", min: 5, max: 9, percentOff: 5, couponId: "LOYALTY5", perk: "5% off one-time shoots for the rest of the year + 1 free virtual twilight per 5 shoots." },
  { id: "Platinum", min: 10, max: 19, percentOff: 7, couponId: "LOYALTY7", perk: "7% off one-time shoots for the rest of the year + free 2D floor plans." },
  { id: "Black Label", min: 20, max: Number.POSITIVE_INFINITY, percentOff: 10, couponId: "LOYALTY10", perk: "10% off one-time shoots for the rest of the year + 2 rush credits + one annual agent branding/headshot session + first-priority scheduling." },
];

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

/**
 * The reward window for a member runs 12 months from the anniversary of their
 * first-ever shoot, then rolls forward each year. Returns the start of the
 * *current* window (and the next renewal), or null when they have no shoots yet.
 */
export function loyaltyWindow(firstShootAt: Date | null, now: Date = new Date()): { start: Date; renews: Date } | null {
  if (!firstShootAt || Number.isNaN(firstShootAt.getTime())) return null;
  if (now.getTime() < firstShootAt.getTime()) return { start: firstShootAt, renews: new Date(firstShootAt.getTime() + YEAR_MS) };
  const elapsedYears = Math.floor((now.getTime() - firstShootAt.getTime()) / YEAR_MS);
  const start = new Date(firstShootAt.getTime() + elapsedYears * YEAR_MS);
  return { start, renews: new Date(start.getTime() + YEAR_MS) };
}

/** The tier a member reaches at a given shoot count, and how far the next one is. */
export function loyaltyProgress(shootCount: number): { tier: LoyaltyTier; next: LoyaltyTier | null; toNext: number } {
  const count = Number.isFinite(shootCount) ? Math.max(0, Math.floor(shootCount)) : 0;
  const index = LOYALTY_TIERS.findIndex((tier) => count >= tier.min && count <= tier.max);
  const tier = index >= 0 ? LOYALTY_TIERS[index] : LOYALTY_TIERS[0];
  const next = LOYALTY_TIERS[index + 1] ?? null;
  return { tier, next, toNext: next ? Math.max(0, next.min - count) : 0 };
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
