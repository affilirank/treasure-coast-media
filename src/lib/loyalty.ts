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

/** Mirrors the Merit Club tiers shown on the site. */
export const LOYALTY_TIERS: LoyaltyTier[] = [
  { id: "Silver", min: 1, max: 4, percentOff: 0, couponId: null, perk: "Next-morning 9:00 AM MLS delivery & dedicated scheduling." },
  { id: "Gold", min: 5, max: 9, percentOff: 5, couponId: "LOYALTY5", perk: "5% lifetime account discount + 1 free virtual twilight per listing." },
  { id: "Platinum", min: 10, max: 19, percentOff: 10, couponId: "LOYALTY10", perk: "10% lifetime discount + free 2D floor plans + 2 rush credits." },
  { id: "Black Label", min: 20, max: Number.POSITIVE_INFINITY, percentOff: 15, couponId: "LOYALTY15", perk: "15% discount + free quarterly agent branding/headshot session." },
];

export function tierForShootCount(shootCount: number): LoyaltyTier {
  const count = Number.isFinite(shootCount) ? Math.max(0, Math.floor(shootCount)) : 0;
  return LOYALTY_TIERS.find((tier) => count >= tier.min && count <= tier.max) ?? LOYALTY_TIERS[0];
}

export function loyaltyCouponForShootCount(shootCount: number): string | null {
  return tierForShootCount(shootCount).couponId;
}
