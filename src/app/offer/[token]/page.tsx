import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOfferByToken } from "@/lib/offers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Offer | Merit Media & Marketing", robots: { index: false, follow: false } };

const GOLD = "#e1c697";
const INK = "#14201e";

function money(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function totalsFor(items: { price: number; qty: number; free?: boolean }[], discountType: string | null, discountValue: number) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const freeValue = items.reduce((sum, item) => (item.free ? sum + item.price * item.qty : sum), 0);
  const paidSubtotal = Math.max(0, subtotal - freeValue);
  const value = Number.isFinite(discountValue) ? Math.max(0, discountValue) : 0;
  const raw = discountType === "percent" ? paidSubtotal * (Math.min(100, value) / 100) : discountType === "amount" ? value : 0;
  const discountAmount = Math.min(paidSubtotal, Math.round(raw * 100) / 100);
  return { subtotal, freeValue, discountAmount, total: Math.max(0, paidSubtotal - discountAmount) };
}

export default async function OfferPage({ params }: PageProps<"/offer/[token]">) {
  const { token } = await params;
  const offer = await getOfferByToken(token).catch(() => null);
  if (!offer) notFound();

  const items = Array.isArray(offer.items) ? offer.items : [];
  const totals = totalsFor(items, offer.discount_type, Number(offer.discount_value));
  const savings = totals.freeValue + totals.discountAmount;

  return (
    <main style={{ background: INK, color: "#f4f1ea", minHeight: "100vh", padding: "48px 20px", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <p style={{ letterSpacing: 2, textTransform: "uppercase", fontSize: 12, color: GOLD, marginBottom: 8 }}>Merit Media &amp; Marketing</p>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>{offer.headline || offer.name}</h1>
        <p style={{ color: "#b9c2bd", fontSize: 14, margin: "0 0 28px" }}>A custom offer prepared for you.</p>

        <div style={{ background: "#fff", color: "#1a1a1a", borderRadius: 12, padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>{offer.name}</h2>
          {offer.description && <p style={{ color: "#4b5551", fontSize: 14, lineHeight: 1.6, margin: "0 0 20px", whiteSpace: "pre-line" }}>{offer.description}</p>}

          <ul style={{ listStyle: "none", padding: 0, margin: 0, borderTop: "1px solid #ececec" }}>
            {items.map((item, index) => (
              <li key={`${item.name}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid #ececec" }}>
                <span>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  {item.qty > 1 && <span style={{ color: "#8a938f" }}> × {item.qty}</span>}
                  {item.free && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#0f766e", background: "#e6f4f1", padding: "2px 8px", borderRadius: 999 }}>Free</span>}
                </span>
                <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {item.free
                    ? <span style={{ color: "#b3b8b5", textDecoration: "line-through" }}>{money(item.price * item.qty)}</span>
                    : <span style={{ fontWeight: 600 }}>{money(item.price * item.qty)}</span>}
                </span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 20, fontSize: 14 }}>
            {totals.freeValue > 0 && <Row label="Free bonus value" value={`−${money(totals.freeValue)}`} accent="#0f766e" />}
            {totals.discountAmount > 0 && <Row label={offer.discount_type === "percent" ? `Discount (${Number(offer.discount_value)}% off)` : "Discount"} value={`−${money(totals.discountAmount)}`} accent="#0f766e" />}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "2px solid #14201e", marginTop: 10, paddingTop: 12 }}>
              <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, color: "#4b5551" }}>Your price</span>
              <span style={{ fontSize: 26, fontWeight: 800 }}>
                {totals.total === 0 ? "Free" : (
                  <>
                    {savings > 0 && <span style={{ fontSize: 14, fontWeight: 400, color: "#b3b8b5", textDecoration: "line-through", marginRight: 8 }}>{money(totals.subtotal)}</span>}
                    {money(totals.total)}
                  </>
                )}
              </span>
            </div>
            {savings > 0 && totals.total > 0 && <p style={{ marginTop: 6, textAlign: "right", color: "#0f766e", fontWeight: 600, fontSize: 13 }}>You save {money(savings)}</p>}
          </div>

          {offer.promotion_code && (
            <p style={{ marginTop: 20, textAlign: "center" }}>
              <span style={{ display: "inline-block", border: `1px dashed ${GOLD}`, background: "#fbf7ef", padding: "10px 18px", fontWeight: 700, letterSpacing: 1 }}>{offer.promotion_code}</span>
            </p>
          )}

          <div style={{ marginTop: 24, textAlign: "center" }}>
            <Link href="/#booking" style={{ display: "inline-block", background: INK, color: GOLD, padding: "14px 28px", fontWeight: 700, textDecoration: "none", borderRadius: 8 }}>
              Book this offer
            </Link>
            <p style={{ color: "#8a938f", fontSize: 12, marginTop: 10 }}>Mention this offer when you request your production date.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ color: "#4b5551" }}>{label}</span><span style={{ color: accent, fontWeight: 600 }}>{value}</span></div>;
}
