import { Resend } from "resend";

/**
 * Outlook/Gmail trust mail that looks like a real desk: a human display name and a
 * working Reply-To. The sending domain itself must be verified in Resend (SPF/DKIM)
 * or everything lands in junk regardless of these headers.
 */
function withDisplayName(from: string) {
  return from.includes("<") ? from : `Merit Media <${from}>`;
}

function replyTo(): string[] | undefined {
  const admin = process.env.ADMIN_NOTIFICATION_EMAIL;
  return admin && admin.includes("@") ? [admin] : undefined;
}

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
  noDeposit?: boolean;
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
      <h2 style="margin-bottom:12px;">${input.noDeposit ? "Your shoot is booked" : "Your booking deposit is confirmed"}</h2>
      <p>Hi ${input.name},</p>
      <p>${input.noDeposit ? "Your shoot date is reserved. No deposit is needed. You only pay when your finished media is ready for delivery." : "We received your deposit and your booking is now confirmed."} Our production team will contact you to finalize access and timing.</p>
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
    from: withDisplayName(from),
    replyTo: replyTo(),
    to: [input.to],
    subject: input.noDeposit ? `Shoot booked · ${input.referenceId}` : `Booking deposit confirmed · ${input.referenceId}`,
    html,
    text: textFromHtml(html),
  });

  if (result.error) {
    throw new Error(result.error.message ?? "Failed to send confirmation email");
  }

  return { status: "sent" as const, id: result.data?.id ?? null };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/**
 * Multipart mail (text/plain + text/html) is treated as more trustworthy than
 * HTML-only, especially by Outlook/SmartScreen. Derive a readable text part
 * from the same HTML so both versions can never drift apart.
 */
function textFromHtml(html: string) {
  const withLinks = html.replace(
    /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href: string, label: string) => `${label.trim()} (${href})`,
  );
  const decoded = withLinks
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|table|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  return decoded
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function logoUrl() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.meritmediafl.com").replace(/\/+$/, "");
  // Resized through the Next.js image optimizer; the source PNG is 1.5 MB.
  return `${base}/_next/image?url=${encodeURIComponent("/images/merit-logo.png")}&w=128&q=75`;
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
    from: withDisplayName(config.from),
    replyTo: replyTo(),
    to: input.to,
    subject: `Your Media for ${input.propertyAddress} Is Ready — Invoice ${input.amount}`,
    html,
    text: textFromHtml(html),
  });
  if (result.error) throw new Error(result.error.message ?? "Failed to send payment request email");
  return { status: "sent" as const };
}

export async function sendPaymentReminderEmail(input: { to: string[]; agentName: string; propertyAddress: string; amount: string; deliveryUrl: string; reminderNumber: number }) {
  const config = emailConfig();
  if (!config) return { status: "preview" as const };

  const html = emailShell(`
    <h2 style="margin:0 0 12px;">Friendly reminder: invoice due</h2>
    <p>Hi ${escapeHtml(input.agentName)},</p>
    <p>This is a reminder that the invoice for <strong>${escapeHtml(input.propertyAddress)}</strong> is still open.</p>
    <p><strong>Amount due: ${escapeHtml(input.amount)}</strong><br/>Your full-resolution downloads, MLS-ready files and floor plans unlock as soon as payment is complete.</p>
    ${button(input.deliveryUrl, "View &amp; Pay")}
    <p style="color:#65726e;font-size:13px;">If you've already paid, thank you, and please disregard this message.</p>`);

  const result = await new Resend(config.apiKey).emails.send({
    from: withDisplayName(config.from),
    replyTo: replyTo(),
    to: input.to,
    subject: `Reminder: Invoice ${input.amount} Due for ${input.propertyAddress}`,
    html,
    text: textFromHtml(html),
  });
  if (result.error) throw new Error(result.error.message ?? "Failed to send reminder email");
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
    from: withDisplayName(config.from),
    replyTo: replyTo(),
    to: input.to,
    subject: `Your Media Assets for ${input.propertyAddress} Are Ready to Download`,
    html,
    text: textFromHtml(html),
  });
  if (result.error) throw new Error(result.error.message ?? "Failed to send delivery email");
  return { status: "sent" as const };
}

export async function sendDiscountEmail(input: {
  to: string[];
  agentName: string;
  propertyAddress: string;
  originalAmount: string;
  discountAmount: string;
  newAmount: string;
  description?: string | null;
  promoCode?: string | null;
  deliveryUrl: string;
}) {
  const config = emailConfig();
  if (!config) return { status: "preview" as const };

  const reason = [input.promoCode ? `Code ${input.promoCode}` : null, input.description ? escapeHtml(input.description) : null].filter(Boolean).join(" — ");

  const html = emailShell(`
    <h2 style="margin:0 0 12px;">A discount has been applied to your invoice</h2>
    <p>Hi ${escapeHtml(input.agentName)},</p>
    <p>Good news — we've applied a discount to the media for <strong>${escapeHtml(input.propertyAddress)}</strong>.${reason ? ` Reason: ${reason}.` : ""}</p>
    <div style="border:1px solid #e5e0d5;border-radius:10px;padding:22px 20px;text-align:center;background:#fbf7ef;margin:20px 0;">
      <p style="margin:0;color:#8a938f;font-size:15px;"><span style="text-decoration:line-through;">${escapeHtml(input.originalAmount)}</span></p>
      <p style="margin:8px 0 4px;color:#0f766e;font-size:14px;font-weight:bold;">You save ${escapeHtml(input.discountAmount)}</p>
      <p style="margin:4px 0 0;font-size:34px;font-weight:800;color:#14201e;border-top:2px solid #c4a16a;padding-top:10px;">${escapeHtml(input.newAmount)}</p>
      <p style="margin:6px 0 0;color:#65726e;font-size:12px;text-transform:uppercase;letter-spacing:1px;">New balance due</p>
    </div>
    ${button(input.deliveryUrl, "View &amp; Pay")}`);

  const result = await new Resend(config.apiKey).emails.send({
    from: withDisplayName(config.from),
    replyTo: replyTo(),
    to: input.to,
    subject: `Discount applied — ${input.propertyAddress} is now ${input.newAmount}`,
    html,
    text: textFromHtml(html),
  });
  if (result.error) throw new Error(result.error.message ?? "Failed to send discount email");
  return { status: "sent" as const };
}

export async function sendTipNotificationEmail(input: { to: string[]; agentName: string; agentEmail: string; propertyAddress: string; amount: string }) {
  const config = emailConfig();
  if (!config) return { status: "preview" as const };

  const html = emailShell(`
    <h2 style="margin:0 0 12px;">You received a thank-you 🎉</h2>
    <p>${escapeHtml(input.agentName)} (${escapeHtml(input.agentEmail)}) sent an optional gratuity of <strong>${escapeHtml(input.amount)}</strong> for <strong>${escapeHtml(input.propertyAddress)}</strong>.</p>
    <p style="color:#65726e;font-size:13px;">This is separate from the invoice and appears in your Stripe dashboard.</p>`);

  const result = await new Resend(config.apiKey).emails.send({
    from: withDisplayName(config.from),
    replyTo: replyTo(),
    to: input.to,
    subject: `Thank-you tip ${input.amount} — ${input.propertyAddress}`,
    html,
    text: textFromHtml(html),
  });
  if (result.error) throw new Error(result.error.message ?? "Failed to send tip notification");
  return { status: "sent" as const };
}

export async function sendSocialPackageConfirmationEmail(input: { to: string[]; agentName: string; propertyAddress: string; planLabel: string; deliveryUrl: string }) {
  const config = emailConfig();
  if (!config) return { status: "preview" as const };

  const html = emailShell(`
    <h2 style="margin:0 0 12px;">Your social package is booked 🎉</h2>
    <p>Hi ${escapeHtml(input.agentName)},</p>
    <p>Thanks for adding the <strong>${escapeHtml(input.planLabel)}</strong> to <strong>${escapeHtml(input.propertyAddress)}</strong>. Your receipt is on its way from Stripe.</p>
    <p>We'll reach out within one business day to line up the posts and get your 30 days on Facebook and Instagram started.</p>
    ${button(input.deliveryUrl, "View Your Delivery")}`);

  const result = await new Resend(config.apiKey).emails.send({
    from: withDisplayName(config.from),
    replyTo: replyTo(),
    to: input.to,
    subject: `Social package booked — ${input.propertyAddress}`,
    html,
    text: textFromHtml(html),
  });
  if (result.error) throw new Error(result.error.message ?? "Failed to send social confirmation");
  return { status: "sent" as const };
}

export async function sendSocialPackageNotificationEmail(input: { to: string[]; agentName: string; agentEmail: string; propertyAddress: string; planLabel: string; amount: string }) {
  const config = emailConfig();
  if (!config) return { status: "preview" as const };

  const html = emailShell(`
    <h2 style="margin:0 0 12px;">New social package sale 💸</h2>
    <p>${escapeHtml(input.agentName)} (${escapeHtml(input.agentEmail)}) claimed the <strong>${escapeHtml(input.planLabel)}</strong> for <strong>${escapeHtml(input.propertyAddress)}</strong> — <strong>${escapeHtml(input.amount)}</strong>.</p>
    <p style="color:#65726e;font-size:13px;">Deliver 30 days of Facebook &amp; Instagram posts${input.planLabel.includes("Reels") ? " plus 7 premium branded reels" : ""}. This is separate from the invoice and appears in your Stripe dashboard.</p>`);

  const result = await new Resend(config.apiKey).emails.send({
    from: withDisplayName(config.from),
    replyTo: replyTo(),
    to: input.to,
    subject: `Social package ${input.amount} — ${input.propertyAddress}`,
    html,
    text: textFromHtml(html),
  });
  if (result.error) throw new Error(result.error.message ?? "Failed to send social notification");
  return { status: "sent" as const };
}

export async function sendPromoEmail(input: { to: string[]; subject: string; heading: string; body: string; code?: string | null; offerUrl?: string | null }) {
  const config = emailConfig();
  if (!config) return { status: "preview" as const, sent: 0 };

  const codeBlock = input.code
    ? `<p style="text-align:center;margin:20px 0;"><span style="display:inline-block;border:1px dashed #c4a16a;background:#fbf7ef;color:#14201e;padding:12px 20px;font-weight:bold;letter-spacing:1px;">${escapeHtml(input.code)}</span></p>`
    : "";

  const html = emailShell(`
    <h2 style="margin:0 0 12px;">${escapeHtml(input.heading)}</h2>
    <div style="line-height:1.7;white-space:pre-line;">${escapeHtml(input.body)}</div>
    ${codeBlock}
    ${input.offerUrl ? button(input.offerUrl, "View This Offer") : ""}`);

  let sent = 0;
  for (const to of input.to) {
    const result = await new Resend(config.apiKey).emails.send({ from: withDisplayName(config.from), replyTo: replyTo(), to: [to], subject: input.subject, html, text: textFromHtml(html) });
    if (!result.error) sent += 1;
  }
  return { status: "sent" as const, sent };
}
