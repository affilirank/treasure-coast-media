import "server-only";
import { getPrivateJson, listPrivateBlobs } from "@/lib/private-blob";
import type { StoredBooking } from "@/lib/booking-store";
import { supabaseAdmin } from "@/lib/supabase";
import { tierForShootCount, type LoyaltyTierId } from "@/lib/loyalty";

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
  const bump = (email: string, patch: Partial<CustomerStats> & { shoot?: boolean; paid?: number }) => {
    const existing = stats.get(email) ?? { email, name: null, phone: null, company: null, shootCount: 0, lifetimeValue: 0, lastActivityAt: null };
    if (patch.name) existing.name = patch.name;
    if (patch.phone) existing.phone = patch.phone;
    if (patch.company) existing.company = patch.company;
    if (patch.shoot) existing.shootCount += 1;
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

  return stats;
}

/** Rebuild the customers table from delivery + booking history. */
export async function syncCustomers() {
  const stats = await computeCustomerStats();
  const rows = [...stats.values()].map((stat) => ({
    email: stat.email,
    name: stat.name,
    phone: stat.phone,
    company: stat.company,
    shoot_count: stat.shootCount,
    lifetime_value: Math.round(stat.lifetimeValue * 100) / 100,
    tier: tierForShootCount(stat.shootCount).id,
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
