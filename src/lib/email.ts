import { Resend } from "resend";

export type BookingEmailInput = {
  to: string;
  name: string;
  referenceId: string;
  total: number;
  recurring: number;
  address: string;
  date: string;
  time: string;
  track: "real-estate" | "commercial";
};

export async function sendBookingConfirmation(input: BookingEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@localhost";

  if (!apiKey || !from || from === "noreply@localhost") {
    return { status: "preview" as const, reason: "Email not configured" };
  }

  const resend = new Resend(apiKey);
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111827;">
      <h2 style="margin-bottom:12px;">Your booking deposit is confirmed</h2>
      <p>Hi ${input.name},</p>
      <p>We received your deposit and your booking is now confirmed. Our production team will contact you to finalize access and timing.</p>
      <p><strong>Reference:</strong> ${input.referenceId}</p>
      <p><strong>Project:</strong> ${input.track === "real-estate" ? "Property media" : "Commercial production"}</p>
      <p><strong>Location:</strong> ${input.address}</p>
      <p><strong>Date:</strong> ${input.date} at ${input.time}</p>
      <p><strong>Estimated project total:</strong> $${input.total.toLocaleString()}</p>
      ${input.recurring > 0 ? `<p><strong>Recurring:</strong> $${input.recurring.toLocaleString()}/mo</p>` : ""}
      <p>We’ll reach out to confirm details and next steps shortly.</p>
    </div>
  `;

  const result = await resend.emails.send({
    from,
    to: [input.to],
    subject: `Booking deposit confirmed · ${input.referenceId}`,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message ?? "Failed to send confirmation email");
  }

  return { status: "sent" as const, id: result.data?.id ?? null };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export async function sendDeliveryReadyEmail(input: { to: string[]; agentName: string; propertyAddress: string; deliveryUrl: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || from === "noreply@localhost") return { status: "preview" as const };

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111827;">
      <h2 style="margin-bottom:12px;">Your media is ready</h2>
      <p>Hi ${escapeHtml(input.agentName)},</p>
      <p>Payment is confirmed. Your full-resolution files, MLS-ready photos and floor plans for <strong>${escapeHtml(input.propertyAddress)}</strong> are ready to download.</p>
      <p><a href="${escapeHtml(input.deliveryUrl)}" style="display:inline-block;background:#14201e;color:#e1c697;padding:12px 22px;text-decoration:none;font-weight:bold;">Open Delivery Portal</a></p>
      <p style="color:#65726e;font-size:13px;">Or copy this link: ${escapeHtml(input.deliveryUrl)}</p>
    </div>
  `;

  const result = await new Resend(apiKey).emails.send({
    from,
    to: input.to,
    subject: `Your Media Assets for ${input.propertyAddress} Are Ready to Download`,
    html,
  });
  if (result.error) throw new Error(result.error.message ?? "Failed to send delivery email");
  return { status: "sent" as const };
}
