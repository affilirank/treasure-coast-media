import "server-only";
import { getPrivateJson, listPrivateBlobs } from "@/lib/private-blob";
import type { StoredBooking } from "@/lib/booking-store";
import { supabaseAdmin } from "@/lib/supabase";
import { loyaltyProgress, loyaltyWindow, tierForShootCount, type LoyaltyTierId } from "@/lib/loyalty";

export type Customer = {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  shoot_count: number;
  lifetime_value: number | string;
  tier: LoyaltyTierId;
  window_shoot_count?: number;
  window_renews_at?: string | null;
  last_activity_at: string | null;
  notes: string | null;
  marketing_opt_in: boolean;
};

type CustomerStats = {
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  shootCount: number;
  /** Shoots in the current 12-month window — drives the Merit Club tier. */
  yearShootCount: number;
  /** When the current reward window renews. */
  windowRenewsAt: string | null;
  lifetimeValue: number;
  lastActivityAt: string | null;
};

type ListingRow = {
  agent_email: string | null;
  agent_name: string | null;
  agent_phone: string | null;
  brokerage_name: string | null;
  invoice_amount: number | string | null;
  is_paid: boolean | null;
  created_at: string | null;
};

function isEmail(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Merge deliveries and bookings into one record per customer email. */
export async function computeCustomerStats(): Promise<Map<string, CustomerStats>> {
  const stats = new Map<string, CustomerStats>();
  const shotsByEmail = new Map<string, string[]>();
  const bump = (email: string, patch: Partial<CustomerStats> & { shoot?: boolean; paid?: number }) => {
    const existing = stats.get(email) ?? { email, name: null, phone: null, company: null, shootCount: 0, yearShootCount: 0, windowRenewsAt: null, lifetimeValue: 0, lastActivityAt: null };
    if (patch.name) existing.name = patch.name;
    if (patch.phone) existing.phone = patch.phone;
    if (patch.company) existing.company = patch.company;
    if (patch.shoot) {
      existing.shootCount += 1;
      if (patch.lastActivityAt) {
        const list = shotsByEmail.get(email) ?? [];
        list.push(patch.lastActivityAt);
        shotsByEmail.set(email, list);
      }
    }
    if (patch.paid) existing.lifetimeValue += patch.paid;
    if (patch.lastActivityAt && (!existing.lastActivityAt || patch.lastActivityAt > existing.lastActivityAt)) existing.lastActivityAt = patch.lastActivityAt;
    stats.set(email, existing);
  };

  try {
    const { data } = await supabaseAdmin().from("listings").select("agent_email, agent_name, agent_phone, brokerage_name, invoice_amount, is_paid, created_at").limit(5000).returns<ListingRow[]>();
    for (const row of data ?? []) {
      const email = row.agent_email?.trim().toLowerCase();
      if (!isEmail(email)) continue;
      bump(email, {
        name: row.agent_name ?? null,
        phone: row.agent_phone ?? null,
        company: row.brokerage_name ?? null,
        shoot: true,
        paid: row.is_paid ? Number(row.invoice_amount ?? 0) : 0,
        lastActivityAt: row.created_at ?? null,
      });
    }
  } catch {
    // Listings may be unavailable (e.g. migration not yet applied); bookings still contribute.
  }

  try {
    const entries = (await listPrivateBlobs("bookings/")).filter((entry) => entry.pathname.endsWith(".json"));
    const records = await Promise.all(entries.map((entry) => getPrivateJson<StoredBooking>(entry.pathname).catch(() => null)));
    for (const record of records) {
      if (!record || (record.paymentStatus !== "paid" && record.paymentStatus !== "confirmed")) continue;
      const email = record.booking.email?.trim().toLowerCase();
      if (!isEmail(email)) continue;
      bump(email, {
        name: record.booking.name ?? null,
        phone: record.booking.phone ?? null,
        company: record.booking.company ?? null,
        shoot: true,
        paid: record.paymentStatus === "paid" ? Number(record.total ?? 0) : 0,
        lastActivityAt: record.submittedAt ?? null,
      });
    }
  } catch {
    // Booking storage may be unavailable; listings still contribute.
  }

  // Compute each member's current-window count from their first-ever shoot.
  for (const [email, stat] of stats) {
    const stamps = shotsByEmail.get(email) ?? [];
    if (stamps.length === 0) continue;
    const first = new Date(stamps.reduce((min, value) => (value < min ? value : min), stamps[0]));
    const window = loyaltyWindow(first);
    if (!window) continue;
    const startISO = window.start.toISOString();
    const renewsISO = window.renews.toISOString();
    stat.yearShootCount = stamps.filter((value) => value >= startISO && value < renewsISO).length;
    stat.windowRenewsAt = renewsISO;
  }

  return stats;
}

/**
 * The Merit Club reward window for one member: counts shoots within the 12 months
 * since the anniversary of their first-ever shoot. Returns the count, the tier
 * reached, and the window dates for progress display. Scopes to the member and to
 * their window so the tier is re-earned each year.
 */
export async function memberRewardWindow(
  email: string,
  now: Date = new Date(),
): Promise<{ shootCount: number; window: { start: Date; renews: Date } | null }> {
  const normalized = email.trim().toLowerCase();
  if (!isEmail(normalized)) return { shootCount: 0, window: null };

  // Collect this member's shoot timestamps from both sources.
  const stamps: string[] = [];

  try {
    const { data } = await supabaseAdmin()
      .from("listings")
      .select("agent_email, created_at")
      .eq("agent_email", normalized)
      .limit(5000)
      .returns<{ agent_email: string | null; created_at: string | null }[]>();
    for (const row of data ?? []) if (row.created_at) stamps.push(row.created_at);
  } catch {
    // Listings unavailable; bookings may still count.
  }

  try {
    const entries = (await listPrivateBlobs("bookings/")).filter((entry) => entry.pathname.endsWith(".json"));
    const records = await Promise.all(entries.map((entry) => getPrivateJson<StoredBooking>(entry.pathname).catch(() => null)));
    for (const record of records) {
      if (!record || (record.paymentStatus !== "paid" && record.paymentStatus !== "confirmed")) continue;
      if (record.booking.email?.trim().toLowerCase() !== normalized) continue;
      if (record.submittedAt) stamps.push(record.submittedAt);
    }
  } catch {
    // Booking storage unavailable; listings still count.
  }

  if (stamps.length === 0) return { shootCount: 0, window: null };

  const first = new Date(stamps.reduce((min, value) => (value < min ? value : min), stamps[0]));
  const window = loyaltyWindow(first, now);
  if (!window) return { shootCount: 0, window: null };

  const startISO = window.start.toISOString();
  const renewsISO = window.renews.toISOString();
  const shootCount = stamps.filter((value) => value >= startISO && value < renewsISO).length;
  return { shootCount, window };
}

/**
 * The customer-facing Merit Club line shown on the pages a member opens via
 * their emailed link (delivery + tour). Returns null for non-members (no shoots
 * yet) so the UI can simply hide the block.
 *
 * This is why there is no customer login: members see their standing on the
 * links they already receive. See the note in src/lib/portal-auth.ts.
 */
export async function memberBadge(email: string | null | undefined): Promise<{
  tier: LoyaltyTierId;
  percentOff: number;
  perk: string;
  shootCount: number;
  toNext: number;
  nextTier: LoyaltyTierId | null;
  renewsAt: string;
} | null> {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  if (!isEmail(normalized)) return null;

  const { shootCount, window } = await memberRewardWindow(normalized);
  if (shootCount <= 0 || !window) return null;

  const { tier, next, toNext } = loyaltyProgress(shootCount);

  return {
    tier: tier.id,
    percentOff: tier.percentOff,
    perk: tier.perk,
    shootCount,
    toNext,
    nextTier: next?.id ?? null,
    renewsAt: window.renews.toISOString(),
  };
}

export async function syncCustomers() {
  const stats = await computeCustomerStats();
  const rows = [...stats.values()].map((stat) => ({
    email: stat.email,
    name: stat.name,
    phone: stat.phone,
    company: stat.company,
    shoot_count: stat.shootCount,
    lifetime_value: Math.round(stat.lifetimeValue * 100) / 100,
    tier: tierForShootCount(stat.yearShootCount).id,
    window_shoot_count: stat.yearShootCount,
    window_renews_at: stat.windowRenewsAt,
    last_activity_at: stat.lastActivityAt,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length === 0) return { synced: 0 };
  const { error } = await supabaseAdmin().from("customers").upsert(rows, { onConflict: "email" });
  if (error) throw new Error(error.message);
  return { synced: rows.length };
}

export async function listCustomers() {
  const { data, error } = await supabaseAdmin().from("customers").select("*").order("lifetime_value", { ascending: false }).limit(1000).returns<Customer[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCustomerByEmail(email: string) {
  if (!isEmail(email)) return null;
  const { data } = await supabaseAdmin().from("customers").select("*").ilike("email", email.trim()).maybeSingle<Customer>();
  return data ?? null;
}

export async function upsertCustomer(email: string, patch: Partial<Customer>) {
  if (!isEmail(email)) throw new Error("Invalid email.");
  const { error } = await supabaseAdmin()
    .from("customers")
    .upsert({ email: email.trim().toLowerCase(), ...patch, updated_at: new Date().toISOString() }, { onConflict: "email" });
  if (error) throw new Error(error.message);
}
