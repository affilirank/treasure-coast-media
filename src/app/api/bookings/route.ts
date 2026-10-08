import { sendBookingConfirmation } from "@/lib/email";
import { confirmSlot, holdSlot, isDateString, isTimeString, releaseSlot } from "@/lib/calendar";
import { saveBooking, type StoredBooking } from "@/lib/booking-store";
import {
  realEstatePackages,
  realEstateTiers,
  quoteCommercial,
  quoteRealEstate,
  resolvePromoDiscount,
  type Track,
} from "@/lib/site-data";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clean(value: unknown, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Please submit a valid booking request." }, { status: 400 });
  }

  if (!isRecord(body) || !isRecord(body.booking) || !isRecord(body.selection)) {
    return Response.json({ error: "The booking details are incomplete." }, { status: 400 });
  }

  const booking = {
    address: clean(body.booking.address),
    date: clean(body.booking.date, 20),
    time: clean(body.booking.time, 20),
    name: clean(body.booking.name, 120),
    email: clean(body.booking.email, 254),
    phone: clean(body.booking.phone, 40),
    company: clean(body.booking.company, 160),
    accessNotes: clean(body.booking.accessNotes, 1000),
  };

  if (
    !booking.address ||
    !booking.date ||
    !booking.time ||
    !booking.name ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email) ||
    !booking.phone
  ) {
    return Response.json(
      { error: "Add a property or business, shoot date and time, contact name, valid email, and phone." },
      { status: 400 },
    );
  }

  const track = body.track;
  let quote;

  if (track === "real-estate") {
    if (
      typeof body.selection.packageId !== "string" ||
      typeof body.selection.tierId !== "string" ||
      typeof body.selection.videoId !== "string" ||
      !isRecord(body.selection.quantities) ||
      (body.selection.retainerIds !== undefined && (!Array.isArray(body.selection.retainerIds) || !body.selection.retainerIds.every((id) => typeof id === "string")))
    ) {
      return Response.json({ error: "The property media selection is invalid." }, { status: 400 });
    }

    const quantities: Record<string, number> = {};
    for (const [id, quantity] of Object.entries(body.selection.quantities)) {
      if (typeof quantity !== "number" || !Number.isInteger(quantity)) {
        return Response.json({ error: "Add-on quantities must be whole numbers." }, { status: 400 });
      }
      quantities[id] = quantity;
    }

    const retainerIds = Array.isArray(body.selection.retainerIds)
      ? body.selection.retainerIds.filter((id): id is string => typeof id === "string")
      : [];
    quote = quoteRealEstate(body.selection.packageId, body.selection.tierId, quantities, retainerIds, body.selection.videoId);
  } else if (track === "commercial") {
    const packageId = body.selection.packageId;
    const retainerIds = body.selection.retainerIds;
    if (typeof packageId !== "string" || !Array.isArray(retainerIds) || !retainerIds.every((id) => typeof id === "string")) {
      return Response.json({ error: "The commercial production selection is invalid." }, { status: 400 });
    }

    quote = quoteCommercial(packageId, retainerIds);
  } else {
    return Response.json({ error: "Choose a valid service track." }, { status: 400 });
  }

  if (!quote) {
    return Response.json({ error: "One or more selected services are no longer available." }, { status: 400 });
  }

  const validatedTierId = track === "real-estate" && typeof body.selection.tierId === "string"
    ? body.selection.tierId
    : "";
  const validatedPackageId = track === "real-estate" && typeof body.selection.packageId === "string"
    ? body.selection.packageId
    : "";
  const appliedPromoCode = typeof body.selection.appliedPromoCode === "string"
    ? body.selection.appliedPromoCode.trim().toUpperCase()
    : null;
  const basePrice = track === "real-estate"
    ? (() => {
      const tierIndex = realEstateTiers.findIndex((tier) => tier.id === validatedTierId);
      return tierIndex >= 0
        ? realEstatePackages.find((item) => item.id === validatedPackageId)?.prices[tierIndex] ?? 0
        : 0;
    })()
    : quote.items[0]?.amount ?? 0;
  const selectedAddOns = quote.items.slice(1);
  const addOnsSubtotal = selectedAddOns.reduce((sum, item) => sum + item.amount, 0);
  const originalTotal = basePrice + addOnsSubtotal;
  const oneTimeTotal = quote.items
    .filter((item) => item.billing === "once")
    .reduce((sum, item) => sum + item.amount, 0);
  const promo = appliedPromoCode
    ? resolvePromoDiscount(appliedPromoCode, oneTimeTotal, quote.recurring)
    : null;

  if (appliedPromoCode && !promo) {
    return Response.json({ error: "That promo code is invalid or expired." }, { status: 400 });
  }

  const discountAmount = Math.min(promo?.amount ?? 0, originalTotal);
  const finalPrice = Math.max(0, originalTotal - discountAmount);
  const selectedSqftTier = track === "real-estate"
    ? `${realEstatePackages.find((item) => item.id === validatedPackageId)?.name ?? ""} · ${realEstateTiers.find((tier) => tier.id === validatedTierId)?.label ?? ""}`
    : "Commercial production";
  const bookingBreakdown = {
    selectedSqftTier,
    basePrice,
    appliedPromoCode,
    discountAmount,
    finalPrice,
    selectedAddOns,
  };

  if (!process.env.BLOB_STORE_ID) {
    return Response.json({ error: "Booking storage is not configured yet. Please contact the team directly." }, { status: 503 });
  }
  if (!isDateString(booking.date) || !isTimeString(booking.time)) {
    return Response.json({ error: "Choose an available date and time from the calendar." }, { status: 400 });
  }

  const referenceId = crypto.randomUUID();
  const submittedAt = new Date().toISOString();

  try {
    const held = await holdSlot({ referenceId, date: booking.date, time: booking.time, name: booking.name, address: booking.address });
    if (!held) return Response.json({ error: "That time slot is no longer available. Please pick another from the calendar.", code: "slot-unavailable" }, { status: 409 });
  } catch {
    return Response.json({ error: "The booking calendar is unavailable right now. Please contact the team directly." }, { status: 503 });
  }

  // No deposit: payment happens through the media-delivery paywall, so the booking confirms immediately.
  const record: StoredBooking = {
    referenceId,
    submittedAt,
    track: track as Track,
    booking,
    selection: { ...body.selection, ...bookingBreakdown },
    items: quote.items,
    originalTotal,
    total: finalPrice,
    recurring: quote.recurring,
    ...bookingBreakdown,
    paymentStatus: "confirmed",
    stripeCheckoutSessionId: null,
    paidAt: null,
    confirmationEmailStatus: "pending",
  };

  try {
    await saveBooking(record);
    await confirmSlot(referenceId);
  } catch {
    await releaseSlot(referenceId).catch(() => undefined);
    return Response.json({ error: "Your booking could not be saved. Please try again or contact the team." }, { status: 502 });
  }

  let emailStatus: StoredBooking["confirmationEmailStatus"] = "not_configured";
  try {
    const email = await sendBookingConfirmation({
      to: booking.email,
      name: booking.name,
      referenceId,
      total: finalPrice,
      recurring: quote.recurring,
      address: booking.address,
      date: booking.date,
      time: booking.time,
      track: track as Track,
      noDeposit: true,
    });
    emailStatus = email.status === "sent" ? "sent" : "not_configured";
  } catch {
    emailStatus = "not_configured";
  }
  await saveBooking({ ...record, confirmationEmailStatus: emailStatus }).catch(() => undefined);

  const webhookUrl = process.env.BOOKING_WEBHOOK_URL;
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-booking-source": "merit-media-marketing",
        ...(process.env.BOOKING_WEBHOOK_SECRET ? { "x-booking-secret": process.env.BOOKING_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify({ event: "booking.confirmed", referenceId, total: finalPrice, booking }),
      signal: AbortSignal.timeout(10000),
    }).catch(() => undefined);
  }

  return Response.json({
    success: true,
    referenceId,
    status: "confirmed",
    emailStatus,
    total: finalPrice,
    originalTotal,
    ...bookingBreakdown,
    recurring: quote.recurring,
    items: quote.items,
  }, { status: 201, headers: { "cache-control": "no-store" } });
}

export async function GET() {
  return Response.json({
    service: "Merit Media & Marketing booking API",
    status: process.env.BLOB_STORE_ID ? "ready" : "configuration-required",
    features: [
      "booking-validation",
      "email-confirmation",
      "customer-photo-delivery",
    ],
  });
}