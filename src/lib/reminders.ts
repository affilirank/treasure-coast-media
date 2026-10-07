import "server-only";
import { deliveryLinks, formatMoney, type Listing } from "@/lib/delivery";
import { sendPaymentReminderEmail, sendPaymentRequestEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";

export const MAX_REMINDERS = 3;
const FIRST_REMINDER_AFTER_DAYS = 2;
const REMINDER_EVERY_DAYS = 3;

function recipients(listing: Listing) {
  const admin = process.env.ADMIN_NOTIFICATION_EMAIL;
  return admin ? [listing.agent_email, admin] : [listing.agent_email];
}

/** Sends the initial request (reminderNumber 0) or a reminder, then records it. */
export async function sendPaymentEmail(listing: Listing, kind: "request" | "reminder") {
  const base = {
    to: recipients(listing),
    agentName: listing.agent_name,
    propertyAddress: listing.property_address,
    amount: formatMoney(listing.invoice_amount),
    deliveryUrl: deliveryLinks(listing.access_token).delivery,
  };
  const result =
    kind === "request"
      ? await sendPaymentRequestEmail(base)
      : await sendPaymentReminderEmail({ ...base, reminderNumber: listing.reminder_count + 1 });

  if (result.status === "sent") {
    await supabaseAdmin()
      .from("listings")
      .update({ last_reminder_at: new Date().toISOString(), ...(kind === "reminder" ? { reminder_count: listing.reminder_count + 1 } : {}) })
      .eq("id", listing.id);
  }
  return result.status;
}

/** Unpaid listings whose first reminder is due, or whose last one was long enough ago. */
export async function sendDueReminders() {
  const now = Date.now();
  const day = 86_400_000;
  const { data, error } = await supabaseAdmin()
    .from("listings")
    .select("*")
    .eq("is_paid", false)
    .lt("reminder_count", MAX_REMINDERS)
    .lte("created_at", new Date(now - FIRST_REMINDER_AFTER_DAYS * day).toISOString())
    .returns<Listing[]>();
  if (error) throw new Error(error.message);

  let sent = 0;
  for (const listing of data ?? []) {
    if (listing.last_reminder_at && now - new Date(listing.last_reminder_at).getTime() < REMINDER_EVERY_DAYS * day) continue;
    try {
      if ((await sendPaymentEmail(listing, "reminder")) === "sent") sent++;
    } catch (cause) {
      console.error("Reminder failed", listing.id, cause);
    }
  }
  return { checked: data?.length ?? 0, sent };
}
