import { requireAdmin } from "@/lib/admin-guard";
import { getPrivateJson, listPrivateBlobs } from "@/lib/private-blob";
import type { StoredBooking } from "@/lib/booking-store";

export const runtime = "nodejs";

// Mirrors the deposit rule used at booking time (src/app/api/bookings/route.ts).
function depositFor(total: number) {
  return Math.round(total * (total >= 5000 ? 0.5 : 0.25));
}

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const entries = (await listPrivateBlobs("bookings/")).filter((entry) => entry.pathname.endsWith(".json"));
    const records = await Promise.all(entries.map((entry) => getPrivateJson<StoredBooking>(entry.pathname).catch(() => null)));

    const bookings = records
      .filter((record): record is StoredBooking => record !== null && record.track === "real-estate" && record.paymentStatus === "paid")
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map((record) => {
        const deposit = depositFor(record.total);
        const address = record.booking.address;
        return {
          referenceId: record.referenceId,
          submittedAt: record.submittedAt,
          shootDate: record.booking.date,
          address,
          zip: address.match(/\b\d{5}\b(?!.*\b\d{5}\b)/)?.[0] ?? "",
          agentName: record.booking.name,
          agentEmail: record.booking.email,
          agentPhone: record.booking.phone,
          brokerage: record.booking.company,
          package: [record.selectedSqftTier, ...record.selectedAddOns.map((item) => item.label)].filter(Boolean).join(" + "),
          total: record.total,
          deposit,
          balanceDue: Math.max(0, record.total - deposit),
        };
      });

    return Response.json({ bookings }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Bookings could not be loaded." }, { status: 503 });
  }
}
