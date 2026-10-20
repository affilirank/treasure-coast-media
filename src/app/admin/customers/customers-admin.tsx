"use client";

import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: string; email: string; name: string | null; phone: string | null; company: string | null;
  shoot_count: number; lifetime_value: number | string; tier: "Silver" | "Gold" | "Platinum" | "Black Label";
  last_activity_at: string | null; marketing_opt_in: boolean;
};

type OfferOption = { id: string; name: string; share_token: string; is_active: boolean; promotion_code: string | null };

const btn = "rounded-md border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-800 disabled:opacity-50";
const field = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900";
const TIERS = ["Silver", "Gold", "Platinum", "Black Label"] as const;

const tierTone: Record<string, string> = {
  Silver: "bg-neutral-100 text-neutral-700",
  Gold: "bg-amber-100 text-amber-800",
  Platinum: "bg-sky-100 text-sky-800",
  "Black Label": "bg-neutral-900 text-amber-200",
};

export default function CustomersAdmin() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [offers, setOffers] = useState<OfferOption[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");

  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [offerToken, setOfferToken] = useState("");
  const [tiers, setTiers] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/customers").then((response) => response.json()).then((result) => setCustomers(result.customers ?? [])).catch(() => setMessage("Could not load customers."));
    fetch("/api/admin/offers").then((response) => response.json()).then((result) => setOffers(result.offers ?? [])).catch(() => undefined);
  }, []);

  async function sync() {
    setBusy("sync");
    setMessage("");
    const response = await fetch("/api/admin/customers", { method: "POST" });
    const result = await response.json();
    setBusy("");
    if (response.ok) {
      setCustomers(result.customers ?? []);
      setMessage(`Imported ${result.synced} customer${result.synced === 1 ? "" : "s"} from deliveries and bookings.`);
    } else setMessage(result.error ?? "Could not sync customers.");
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((customer) =>
      [customer.email, customer.name, customer.company, customer.tier].some((value) => (value ?? "").toLowerCase().includes(needle))
    );
  }, [customers, query]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { Silver: 0, Gold: 0, Platinum: 0, "Black Label": 0 };
    for (const customer of customers) map[customer.tier] = (map[customer.tier] ?? 0) + 1;
    return map;
  }, [customers]);

  const recipientCount = tiers.length === 0 ? customers.filter((customer) => customer.marketing_opt_in).length : customers.filter((customer) => customer.marketing_opt_in && tiers.includes(customer.tier)).length;

  function toggleTier(tier: string) {
    setTiers((current) => (current.includes(tier) ? current.filter((value) => value !== tier) : [...current, tier]));
  }

  async function send() {
    if (!subject.trim() || !body.trim()) return setMessage("Add a subject and message.");
    if (!window.confirm(`Send this promo to ${recipientCount} customer${recipientCount === 1 ? "" : "s"}?`)) return;
    setBusy("send");
    setMessage("");
    const response = await fetch("/api/admin/customers/broadcast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject, heading, body, code: promoCode, offerToken, tiers }),
    });
    const result = await response.json();
    setBusy("");
    if (response.ok) {
      setMessage(`Promo sent to ${result.sent} of ${result.recipients} customers.`);
      setSubject(""); setHeading(""); setBody(""); setPromoCode(""); setOfferToken(""); setTiers([]);
    } else setMessage(result.error ?? "Could not send the promo.");
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Customers &amp; Promos</h1>
        <div className="flex gap-2">
          <a href="/admin/deliveries" className={btn}>Deliveries</a>
          <a href="/admin/offers" className={btn}>Offers</a>
        </div>
      </div>
      {message && <p role="status" className="mb-4 break-words rounded-md bg-amber-50 p-3 text-sm text-neutral-800">{message}</p>}

      <section className="mb-8 rounded-lg border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-neutral-900">Merit Club tiers</h2>
          <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-amber-200 disabled:opacity-50" disabled={busy !== ""} onClick={sync}>
            {busy === "sync" ? "Importing…" : "Import from deliveries & bookings"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TIERS.map((tier) => (
            <div key={tier} className={`rounded-md p-3 ${tierTone[tier]}`}>
              <p className="text-xs font-semibold uppercase tracking-wide">{tier}</p>
              <p className="text-2xl font-bold">{counts[tier] ?? 0}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-500">Loyalty discounts auto-apply at checkout on one-time shoots only: Gold 5%, Platinum 10%, Black Label 15%. Monthly retainers are excluded.</p>
      </section>

      <section className="mb-8 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-bold text-neutral-900">Send a promo</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Subject<input className={field} value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
          <label className="text-sm">Heading<input className={field} value={heading} onChange={(event) => setHeading(event.target.value)} /></label>
        </div>
        <label className="mt-3 block text-sm">Message<textarea className={`${field} mt-1`} rows={4} value={body} onChange={(event) => setBody(event.target.value)} /></label>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Promo code<input className={field} value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} placeholder={offers.find((offer) => offer.share_token === offerToken)?.promotion_code || "SPRING25"} /></label>
          <label className="text-sm sm:col-span-2">
            Attach an offer
            <select className={`${field} mt-1`} value={offerToken} onChange={(event) => setOfferToken(event.target.value)}>
              <option value="">None</option>
              {offers.filter((offer) => offer.is_active).map((offer) => <option key={offer.id} value={offer.share_token}>{offer.name}{offer.promotion_code ? ` — code ${offer.promotion_code}` : ""}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Send to tier (none selected = everyone opted-in)</p>
          <div className="flex flex-wrap gap-2">
            {TIERS.map((tier) => (
              <label key={tier} className={`flex cursor-pointer items-center gap-1 rounded-md border px-3 py-1 text-xs font-semibold ${tiers.includes(tier) ? "border-neutral-900 bg-neutral-900 text-amber-200" : "border-neutral-300 text-neutral-700"}`}>
                <input type="checkbox" className="hidden" checked={tiers.includes(tier)} onChange={() => toggleTier(tier)} />
                {tier} · {counts[tier] ?? 0}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-amber-200 disabled:opacity-50" disabled={busy !== ""} onClick={send}>
            {busy === "send" ? "Sending…" : `Send promo to ${recipientCount}`}
          </button>
          <span className="text-xs text-neutral-500">Recipients must be opted in.</span>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Customers · {customers.length}</h2>
          <input className={`${field} sm:w-64`} placeholder="Search name, email, company…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <ul className="space-y-1">
          {filtered.map((customer) => (
            <li key={customer.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-neutral-900">{customer.name ?? customer.email}</p>
                <p className="truncate text-xs text-neutral-500">{customer.email}{customer.company ? ` · ${customer.company}` : ""}{customer.phone ? ` · ${customer.phone}` : ""}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-500">{customer.shoot_count} job{customer.shoot_count === 1 ? "" : "s"}</span>
                <span className="text-sm font-semibold text-neutral-900">${Number(customer.lifetime_value).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tierTone[customer.tier]}`}>{customer.tier}</span>
              </div>
            </li>
          ))}
          {filtered.length === 0 && <li className="text-sm text-neutral-500">{customers.length === 0 ? "No customers yet. Import from deliveries & bookings." : "No matches."}</li>}
        </ul>
      </section>
    </main>
  );
}
