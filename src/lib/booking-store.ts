import { getPrivateJson, putPrivateJson } from "@/lib/private-blob";
import type { QuoteItem, Track } from "@/lib/site-data";

export type StoredBooking = {
  referenceId: string;
  submittedAt: string;
  track: Track;
  booking: {
    address: string;
    date: string;
    time: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    accessNotes: string;
  };
  selection: Record<string, unknown>;
  items: QuoteItem[];
  originalTotal: number;
  total: number;
  recurring: number;
  selectedSqftTier: string;
  basePrice: number;
  appliedPromoCode: string | null;
  discountAmount: number;
  selectedAddOns: QuoteItem[];
  paymentStatus: "awaiting_payment" | "paid" | "expired";
  stripeCheckoutSessionId: string | null;
  paidAt: string | null;
  confirmationEmailStatus: "pending" | "sent" | "not_configured";
};

function pathname(referenceId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(referenceId)) throw new Error("Invalid booking reference.");
  return `bookings/${referenceId}.json`;
}

export function saveBooking(record: StoredBooking) {
  return putPrivateJson(pathname(record.referenceId), record);
}

export function loadBooking(referenceId: string) {
  return getPrivateJson<StoredBooking>(pathname(referenceId));
}