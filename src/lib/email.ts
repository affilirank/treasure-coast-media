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

function logoUrl() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.meritmediafl.com").replace(/\/+$/, "");
  // Resized through the Next.js image optimizer; the source PNG is 1.5 MB.
  return `${base}/_next/image?url=${encodeURIComponent("/images/merit-logo.png")}&w=128&q=80`;
}

function emailShell(body: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111827;">
      <div style="text-align:center;padding:20px 0;border-bottom:2px solid #c4a16a;">
        <img src="${logoUrl()}" alt="Merit Media &amp; Marketing" width="72" height="72" style="border-radius:8px;" />
      </div>
      <div style="padding:24px 0;">${body}</div>
      <p style="color:#65726e;font-size:12px;border-top:1px solid #dfe5e1;padding-top:12px;">Merit Media &amp; Marketing</p>
    </div>`;
}

function button(href: string, label: string) {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;background:#14201e;color:#e1c697;padding:12px 22px;text-decoration:none;font-weight:bold;">${label}</a></p>
    <p style="color:#65726e;font-size:13px;">Or copy this link: ${escapeHtml(href)}</p>`;
}

function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  return apiKey && from && from !== "noreply@localhost" ? { apiKey, from } : null;
}

export async function sendPaymentRequestEmail(input: { to: string[]; agentName: string; propertyAddress: string; amount: string; deliveryUrl: string }) {
  const config = emailConfig();
  if (!config) return { status: "preview" as const };

  const html = emailShell(`
    <h2 style="margin:0 0 12px;">Your photos are ready</h2>
    <p>Hi ${escapeHtml(input.agentName)},</p>
    <p>The media for <strong>${escapeHtml(input.propertyAddress)}</strong> has been delivered. You can preview everything now.</p>
    <p><strong>Invoice due: ${escapeHtml(input.amount)}</strong><br/>Complete payment to unlock full-resolution downloads, MLS-ready files and floor plans.</p>
    ${button(input.deliveryUrl, "View &amp; Pay")}`);

  const result = await new Resend(config.apiKey).emails.send({
    from: config.from,
    to: input.to,
    subject: `Your Media for ${input.propertyAddress} Is Ready — Invoice ${input.amount}`,
    html,
  });
  if (result.error) throw new Error(result.error.message ?? "Failed to send payment request email");
  return { status: "sent" as const };
}

export async function sendDeliveryReadyEmail(input: { to: string[]; agentName: string; propertyAddress: string; deliveryUrl: string }) {
  const config = emailConfig();
  if (!config) return { status: "preview" as const };

  const html = emailShell(`
    <h2 style="margin:0 0 12px;">Your media is ready</h2>
    <p>Hi ${escapeHtml(input.agentName)},</p>
    <p>Payment is confirmed. Your full-resolution files, MLS-ready photos and floor plans for <strong>${escapeHtml(input.propertyAddress)}</strong> are ready to download.</p>
    ${button(input.deliveryUrl, "Open Delivery Portal")}`);

  const result = await new Resend(config.apiKey).emails.send({
    from: config.from,
    to: input.to,
    subject: `Your Media Assets for ${input.propertyAddress} Are Ready to Download`,
    html,
  });
  if (result.error) throw new Error(result.error.message ?? "Failed to send delivery email");
  return { status: "sent" as const };
}
