import { requireAdmin } from "@/lib/admin-guard";
import { getPrivateJson, listPrivateBlobs } from "@/lib/private-blob";
import type { StoredBooking } from "@/lib/booking-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const entries = (await listPrivateBlobs("bookings/")).filter((entry) => entry.pathname.endsWith(".json"));
    const records = await Promise.all(entries.map((entry) => getPrivateJson<StoredBooking>(entry.pathname).catch(() => null)));

    const bookings = records
      .filter((record): record is StoredBooking => record !== null && (record.paymentStatus === "paid" || record.paymentStatus === "confirmed"))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map((record) => {
        const address = record.booking.address;
        const items = Array.isArray(record.items) ? record.items : [];
        const packageSummary = record.selectedSqftTier
          || items.map((item) => item.label).join(" + ");
        return {
          referenceId: record.referenceId,
          submittedAt: record.submittedAt,
          track: record.track,
          shootDate: record.booking.date,
          address,
          zip: address.match(/\b\d{5}\b(?!.*\b\d{5}\b)/)?.[0] ?? "",
          agentName: record.booking.name,
          agentEmail: record.booking.email,
          agentPhone: record.booking.phone,
          brokerage: record.booking.company,
          package: [record.selectedSqftTier, ...(record.selectedAddOns ?? []).map((item) => item.label)].filter(Boolean).join(" + "),
          originalTotal: record.originalTotal ?? record.total,
          promoCode: record.appliedPromoCode ?? null,
          discountAmount: record.discountAmount ?? 0,
          total: record.total,
          // Bookings confirm instantly with no deposit; the full quoted total flows to the delivery invoice.
          balanceDue: record.total,
          packageSummary,
          propertyDetails: record.booking.propertyDetails ?? null,
        };
      });

    return Response.json({ bookings }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Bookings could not be loaded." }, { status: 503 });
  }
}
